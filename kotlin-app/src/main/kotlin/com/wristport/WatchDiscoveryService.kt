package com.wristport

import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class WatchDiscoveryService(
    private val workspace: SdbWorkspaceManager,
    private val archiveClient: TizenArchiveClient,
) {
    var connectedWatch: WatchDevice? = null
        private set

    var installedApps: MutableList<InstalledApp> = mutableListOf()
        private set

    private val ipv4Re =
        Regex("^(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$")
    private val pkgIdRe = Regex("^[A-Za-z0-9._-]+$")

    private fun requireExecutableSdb(): Path {
        val status = workspace.getWorkspaceStatus()
        if (!status.uploaded || status.binaryPath == null) {
            throw IllegalStateException("Upload your real sdb.exe / sdb binary into the workspace first.")
        }
        if (!status.executableOnHost) {
            throw IllegalStateException(status.error ?: "Uploaded SDB binary cannot execute on this OS.")
        }
        return Path.of(status.binaryPath)
    }

    fun runDirectSdb(args: List<String>): Pair<Boolean, String> {
        val sdb = requireExecutableSdb()
        workspace.pushLog("CMD", "${sdb.fileName} ${args.joinToString(" ")}")
        val res = workspace.runner.execute(sdb, args, 20) { line ->
            workspace.pushLog("SDB", line)
        }
        if (res.stderr.isNotBlank()) {
            workspace.pushLog("WARN", res.stderr)
        }
        if (res.error != null) {
            workspace.pushLog("ERROR", res.error)
        }
        val combined = listOf(res.stdout, res.stderr, res.error ?: "").filter { it.isNotBlank() }.joinToString("\n")
        return res.ok to combined
    }

    fun restartSdbServer(): String {
        val sdb = requireExecutableSdb()
        workspace.pushLog("CMD", "${sdb.fileName} kill-server && ${sdb.fileName} start-server")
        workspace.runner.execute(sdb, listOf("kill-server"), 10, null)
        val start = workspace.runner.execute(sdb, listOf("start-server"), 12, null)
        val out = listOf(start.stdout, start.stderr).filter { it.isNotBlank() }.joinToString("\n").ifBlank { "SDB daemon restarted" }
        workspace.pushLog(if (start.ok) "SUCCESS" else "WARN", out)
        return out
    }

    fun discoverWatches(port: Int = 26101): WatchDiscoveryResult {
        val start = System.currentTimeMillis()
        val sdb = requireExecutableSdb()

        workspace.pushLog("CMD", "${sdb.fileName} start-server && ${sdb.fileName} devices -l")
        workspace.runner.execute(sdb, listOf("start-server"), 12, null)
        val initialDevicesRes = workspace.runner.execute(sdb, listOf("devices", "-l"), 10, null)
        if (initialDevicesRes.stdout.isNotBlank()) {
            workspace.pushLog("SDB", initialDevicesRes.stdout)
        }

        val discoveredMap = LinkedHashMap<String, DiscoveredWatch>()
        parseSdbDevicesOutput(initialDevicesRes.stdout, port).forEach {
            discoveredMap[it.serial] = it
        }

        // Real multi-threaded TCP port 26101 scan across active local /24 subnets
        workspace.pushLog("INFO", "Scanning local Wi-Fi subnets for Galaxy Watches on TCP port $port...")
        val scanResult = workspace.scanner.scanPort26101(port, 350)
        for (ep in scanResult.endpoints) {
            val target = "${ep.ip}:$port"
            workspace.pushLog("CMD", "${sdb.fileName} connect $target", "${ep.latencyMs}ms TCP response")
            val conn = workspace.runner.execute(sdb, listOf("connect", target), 8, null)
            if (conn.stdout.isNotBlank()) {
                workspace.pushLog("SDB", conn.stdout)
            }
        }

        val refreshedDevices = workspace.runner.execute(sdb, listOf("devices", "-l"), 10, null)
        for (dev in parseSdbDevicesOutput(refreshedDevices.stdout, port)) {
            val latency = scanResult.endpoints.firstOrNull { it.ip == dev.ip }?.latencyMs ?: 12
            val enriched = inspectSerialSummary(sdb, dev.copy(latencyMs = latency))
            discoveredMap[dev.serial] = enriched
        }

        val list = discoveredMap.values.toList()
        val duration = System.currentTimeMillis() - start

        if (list.isNotEmpty()) {
            val primary = list.first()
            val fullDevice = buildRealWatchDevice(sdb, primary.serial, primary.ip, primary.port)
            if (fullDevice != null) {
                connectedWatch = fullDevice
                installedApps = fetchInstalledPackagesFromWatch(sdb, fullDevice.serial).toMutableList()
                workspace.pushLog(
                    "SUCCESS",
                    "Connected to real watch ${fullDevice.model} (${fullDevice.serial})",
                    "Tizen ${fullDevice.tizenVersion} · ${installedApps.size} packages"
                )
            }
            workspace.pushActivity("scan", "Discovered ${list.size} real watch(es)", "port $port", "success", duration)
            return WatchDiscoveryResult(
                devices = list,
                connectedWatch = connectedWatch,
                installedApps = installedApps,
                scannedSubnets = scanResult.scannedSubnets,
                needsManualIp = false,
            )
        }

        workspace.pushLog("WARN", "0 watches responded to sdb devices or port $port scan")
        workspace.pushActivity("scan", "Auto-discovery found 0 watches", "port $port", "failed", duration)
        return WatchDiscoveryResult(
            devices = emptyList(),
            connectedWatch = null,
            installedApps = emptyList(),
            scannedSubnets = scanResult.scannedSubnets,
            needsManualIp = true,
            reason = "No watches found on sdb devices or port $port. Enter the last digits of your watch IP.",
        )
    }

    fun connectByIpOrOctet(ip: String?, octet: String?, port: Int): WatchDevice {
        val start = System.currentTimeMillis()
        val sdb = requireExecutableSdb()
        val targetPort = if (port in 1..65535) port else 26101

        val resolvedIp = when {
            !ip.isNullOrBlank() -> ip.trim()
            !octet.isNullOrBlank() && octet.trim().all { it.isDigit() } -> {
                val n = octet.trim().toInt()
                require(n in 0..255) { "Last IP digits must be between 0 and 255." }
                val prefix = workspace.config.subnetPrefix.ifBlank { "192.168.1" }
                workspace.config.lastIpOctet = n.toString()
                workspace.saveConfig()
                "$prefix.$n"
            }
            else -> throw IllegalArgumentException("Enter the last digits of your watch IP.")
        }

        require(ipv4Re.matches(resolvedIp)) { "Invalid IPv4 address: $resolvedIp" }

        val target = "$resolvedIp:$targetPort"
        workspace.pushLog("CMD", "${sdb.fileName} connect $target")
        val connRes = workspace.runner.execute(sdb, listOf("connect", target), 15) { line ->
            workspace.pushLog("SDB", line)
        }
        val outLower = (connRes.stdout + "\n" + connRes.stderr).lowercase()

        if (!connRes.ok && !outLower.contains("connected")) {
            val errMsg = connRes.stderr.ifBlank { connRes.stdout }.ifBlank { connRes.error ?: "Failed to connect to $target" }
            workspace.pushLog("ERROR", "SDB connect failed for $target", errMsg)
            workspace.pushActivity("connect", "Connect failed", target, "failed", System.currentTimeMillis() - start)
            throw IllegalStateException(errMsg)
        }

        // Verify authorization & real watch capability
        val devList = workspace.runner.execute(sdb, listOf("devices", "-l"), 8, null).stdout
        val matchedLine = devList.lines().firstOrNull { it.contains(resolvedIp) } ?: ""
        if (matchedLine.contains("unauthorized")) {
            workspace.pushLog("WARN", "Watch requires RSA confirmation — tap 'Always allow' on your watch screen.")
            throw IllegalStateException("Watch at $target is unauthorized. Accept the RSA debugging prompt on your Galaxy Watch and try again.")
        }
        if (matchedLine.contains("offline")) {
            throw IllegalStateException("Watch at $target reported offline. Ensure Wi-Fi Always On and Debug over Wi-Fi are enabled.")
        }

        val device = buildRealWatchDevice(sdb, target, resolvedIp, targetPort)
            ?: throw IllegalStateException("Connected to $target, but watch did not answer sdb capability.")

        connectedWatch = device
        installedApps = fetchInstalledPackagesFromWatch(sdb, device.serial).toMutableList()
        workspace.pushLog("SUCCESS", "Connected to ${device.model} ($target)", "Tizen ${device.tizenVersion}")
        workspace.pushActivity("connect", "Connected ${device.model}", target, "success", System.currentTimeMillis() - start)
        return device
    }

    fun disconnectWatch() {
        val current = connectedWatch ?: return
        val sdb = resolveExecutableQuiet()
        if (sdb != null) {
            workspace.pushLog("CMD", "${sdb.fileName} disconnect ${current.serial}")
            workspace.runner.execute(sdb, listOf("disconnect", current.serial), 8, null)
        }
        connectedWatch = null
        installedApps.clear()
        workspace.pushLog("INFO", "Disconnected from ${current.serial}")
    }

    fun refreshInstalledApps(): List<InstalledApp> {
        val watch = connectedWatch ?: return emptyList()
        val sdb = requireExecutableSdb()
        installedApps = fetchInstalledPackagesFromWatch(sdb, watch.serial).toMutableList()
        return installedApps
    }

    fun installPackageToWatch(
        packageId: String?,
        title: String?,
        localFilePath: String?,
        uploadedFilename: String?,
        uploadedBytes: ByteArray?,
        uninstallFirst: Boolean = false,
    ): InstalledApp {
        val start = System.currentTimeMillis()
        val watch = connectedWatch ?: throw IllegalStateException("No watch connected. Connect your real watch first.")
        val sdb = requireExecutableSdb()

        val packageFile: Path = when {
            !localFilePath.isNullOrBlank() -> {
                val p = Path.of(localFilePath).normalize()
                val lower = p.fileName.toString().lowercase()
                require(lower.endsWith(".tpk") || lower.endsWith(".wgt")) { "Only .tpk or .wgt packages are allowed." }
                require(Files.isRegularFile(p)) { "Package file not found: $localFilePath" }
                p
            }
            uploadedBytes != null && !uploadedFilename.isNullOrBlank() -> {
                val clean = Path.of(uploadedFilename).fileName.toString().replace(Regex("[^A-Za-z0-9._-]"), "_")
                val dest = workspace.downloadsDir.resolve(clean).normalize()
                Files.write(dest, uploadedBytes)
                dest
            }
            !packageId.isNullOrBlank() && pkgIdRe.matches(packageId) -> {
                val detail = archiveClient.fetchPackageDetails(packageId)
                    ?: throw IllegalStateException("Could not resolve package details for $packageId")
                val hash = detail.artifactHash
                    ?: throw IllegalStateException("No downloadable .tpk/.wgt artifact found for $packageId")
                val fileName = detail.artifactFilename ?: "$packageId${detail.packageType}"
                workspace.pushLog("INFO", "Downloading real artifact $fileName from tizen-archive.com...")
                val bytes = archiveClient.downloadArtifactBytes(hash)
                val dest = workspace.downloadsDir.resolve(fileName.replace(Regex("[^A-Za-z0-9._-]"), "_")).normalize()
                Files.write(dest, bytes)
                workspace.pushLog("SUCCESS", "Downloaded $fileName (${bytes.size / 1024} KB)")
                dest
            }
            else -> throw IllegalArgumentException("Provide a valid packageId or .tpk/.wgt file.")
        }

        val remoteName = packageFile.fileName.toString().replace(Regex("[^A-Za-z0-9._-]"), "_")
        val pkgFlag = if (remoteName.lowercase().endsWith(".tpk")) "tpk" else "wgt"
        val remoteTmp = "/tmp/$remoteName"

        if (uninstallFirst && !packageId.isNullOrBlank() && pkgIdRe.matches(packageId)) {
            val existing = installedApps.firstOrNull { it.packageId.equals(packageId, ignoreCase = true) }
            val existingFlag = when (existing?.packageType) {
                ".wgt" -> "wgt"
                ".tpk" -> "tpk"
                else -> pkgFlag
            }
            val uninstallCmd = "pkgcmd -u -t $existingFlag -n $packageId -q"
            workspace.pushLog("WARN", "Uninstalling existing ${title ?: packageId} before update (existing app data erased)")
            workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} shell \"$uninstallCmd\"")
            val unRes = workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", uninstallCmd), 60) {
                workspace.pushLog("SDB", it)
            }
            val unOut = unRes.stdout + "\n" + unRes.stderr
            if (!unRes.ok || unOut.contains("val[uninstall] failed", ignoreCase = true)) {
                val altFlag = if (existingFlag == "tpk") "wgt" else "tpk"
                val altCmd = "pkgcmd -u -t $altFlag -n $packageId -q"
                workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} shell \"$altCmd\"")
                workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", altCmd), 60) {
                    workspace.pushLog("SDB", it)
                }
            }
            Thread.sleep(600)
        }

        workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} push \"${packageFile}\" $remoteTmp")
        val pushRes = workspace.runner.execute(sdb, listOf("-s", watch.serial, "push", packageFile.toAbsolutePath().toString(), remoteTmp), 120) {
            workspace.pushLog("SDB", it)
        }
        if (!pushRes.ok) {
            val err = pushRes.stderr.ifBlank { pushRes.stdout }.ifBlank { pushRes.error ?: "sdb push failed" }
            workspace.pushLog("ERROR", err)
            workspace.pushActivity("install", "Push failed for $remoteName", watch.serial, "failed", System.currentTimeMillis() - start)
            throw IllegalStateException(err)
        }

        val pkgcmd = "pkgcmd -i -w -t $pkgFlag -p $remoteTmp"
        workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} shell \"$pkgcmd\"")
        val instRes = workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", pkgcmd), 120) {
            workspace.pushLog("SDB", it)
        }
        val instOut = instRes.stdout + "\n" + instRes.stderr
        if (!instRes.ok || instOut.contains("val[install] failed", ignoreCase = true) || instOut.contains("error", ignoreCase = true)) {
            val err = instRes.stderr.ifBlank { instRes.stdout }.ifBlank { instRes.error ?: "pkgcmd installation failed" }
            workspace.pushLog("ERROR", "pkgcmd failed: $err")
            workspace.pushActivity("install", "Install failed for ${title ?: remoteName}", watch.serial, "failed", System.currentTimeMillis() - start)
            throw IllegalStateException(err)
        }

        val elapsed = System.currentTimeMillis() - start
        val verb = if (uninstallFirst) "Updated" else "Installed"
        workspace.pushLog("SUCCESS", "$verb ${title ?: remoteName} on ${watch.model}", "${elapsed}ms")
        connectedWatch = buildRealWatchDevice(sdb, watch.serial, watch.ip, watch.port) ?: watch
        installedApps = fetchInstalledPackagesFromWatch(sdb, watch.serial).toMutableList()

        val installed = installedApps.firstOrNull { it.packageId == packageId } ?: InstalledApp(
            appId = packageId ?: remoteName,
            packageId = packageId ?: remoteName,
            title = title ?: remoteName.substringBeforeLast('.'),
            category = if (pkgFlag == "wgt") "Watch faces" else "Utilities & Tools",
            packageType = ".$pkgFlag",
            version = "installed",
            fileSize = "${(Files.size(packageFile) / 1024)} KB",
            fileSizeMb = Files.size(packageFile) / (1024.0 * 1024.0),
            installedAt = Instant.now().toString(),
            source = if (packageId != null) "archive" else "sideload",
            iconKey = if (pkgFlag == "wgt") "chronograph" else "serverping",
        )
        workspace.pushActivity(if (uninstallFirst) "update" else "install", "$verb ${installed.title}", "${installed.packageId} (.$pkgFlag)", "success", elapsed)
        return installed
    }

    fun uninstallPackage(packageId: String) {
        val start = System.currentTimeMillis()
        require(pkgIdRe.matches(packageId)) { "Invalid package ID." }
        val watch = connectedWatch ?: throw IllegalStateException("No watch connected.")
        val sdb = requireExecutableSdb()
        val existing = installedApps.firstOrNull { it.packageId == packageId }
        val pkgFlag = if (existing?.packageType == ".tpk") "tpk" else "wgt"
        val cmd = "pkgcmd -u -t $pkgFlag -n $packageId -q"
        workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} shell \"$cmd\"")
        val res = workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", cmd), 60) {
            workspace.pushLog("SDB", it)
        }
        if (!res.ok) {
            throw IllegalStateException(res.stderr.ifBlank { res.stdout }.ifBlank { "Uninstall failed" })
        }
        val elapsed = System.currentTimeMillis() - start
        installedApps = fetchInstalledPackagesFromWatch(sdb, watch.serial).toMutableList()
        workspace.pushLog("SUCCESS", "Uninstalled $packageId (${elapsed}ms)")
        workspace.pushActivity("uninstall", "Uninstalled $packageId", watch.serial, "success", elapsed)
    }

    fun launchPackage(packageId: String) {
        require(pkgIdRe.matches(packageId)) { "Invalid package ID." }
        val watch = connectedWatch ?: throw IllegalStateException("No watch connected.")
        val sdb = requireExecutableSdb()
        val cmd = "app_launcher -s $packageId"
        workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} shell \"$cmd\"")
        val res = workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", cmd), 15) {
            workspace.pushLog("SDB", it)
        }
        if (!res.ok) {
            workspace.pushLog("WARN", res.stderr.ifBlank { res.stdout })
        }
    }

    data class BackupBundleResult(
        val filename: String,
        val zipBytes: ByteArray,
        val fileCount: Int,
        val packageCount: Int,
    )

    fun createWatchBackupZip(): BackupBundleResult {
        val start = System.currentTimeMillis()
        val watch = connectedWatch ?: throw IllegalStateException("No watch connected. Connect your Galaxy Watch first.")
        val sdb = requireExecutableSdb()
        val safeModel = watch.model.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val stamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now()).replace(":", "-").take(19)
        val zipFilename = "wristport-watch-backup-$safeModel-$stamp.zip"

        val backupsDir = workspace.appHome.resolve("backups").normalize()
        Files.createDirectories(backupsDir)
        val tempStage = backupsDir.resolve("tmp_${System.currentTimeMillis()}")
        Files.createDirectories(tempStage)

        workspace.pushLog("INFO", "Starting watch backup for ${watch.name} (${watch.serial})...")
        try {
            val capRes = workspace.runner.execute(sdb, listOf("-s", watch.serial, "capability"), 10, null)
            val pkgRes = workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", "pkgcmd -l"), 15, null)
            val dfRes = workspace.runner.execute(sdb, listOf("-s", watch.serial, "shell", "df -k /opt/usr"), 8, null)

            val currentApps = fetchInstalledPackagesFromWatch(sdb, watch.serial)
            if (currentApps.isNotEmpty()) {
                installedApps = currentApps.toMutableList()
            }

            val remotePullDirs = listOf(
                "/opt/usr/home/owner/media" to "watch-files/media",
                "/opt/usr/home/owner/downloads" to "watch-files/downloads",
                "/opt/usr/home/owner/data" to "watch-files/data",
            )

            var pulledFiles = 0
            val baos = ByteArrayOutputStream()
            ZipOutputStream(baos).use { zos ->
                fun writeEntry(name: String, bytes: ByteArray) {
                    zos.putNextEntry(ZipEntry(name))
                    zos.write(bytes)
                    zos.closeEntry()
                }

                writeEntry(
                    "watch-device-info.json",
                    workspace.gson.toJson(
                        mapOf(
                            "backedUpAt" to Instant.now().toString(),
                            "watch" to watch,
                            "installedCount" to installedApps.size,
                        )
                    ).toByteArray(StandardCharsets.UTF_8)
                )
                writeEntry("watch-capability.txt", capRes.stdout.ifBlank { "(unavailable)" }.toByteArray(StandardCharsets.UTF_8))
                writeEntry("pkgcmd-list.txt", pkgRes.stdout.ifBlank { "(unavailable)" }.toByteArray(StandardCharsets.UTF_8))
                writeEntry("installed-packages.json", workspace.gson.toJson(installedApps).toByteArray(StandardCharsets.UTF_8))
                writeEntry("storage-df.txt", dfRes.stdout.ifBlank { "(unavailable)" }.toByteArray(StandardCharsets.UTF_8))

                for ((remote, folder) in remotePullDirs) {
                    val localDir = tempStage.resolve(folder)
                    Files.createDirectories(localDir)
                    workspace.pushLog("CMD", "${sdb.fileName} -s ${watch.serial} pull \"$remote\" \"$localDir\"")
                    workspace.runner.execute(sdb, listOf("-s", watch.serial, "pull", remote, localDir.toAbsolutePath().toString()), 45, null)
                    if (Files.isDirectory(localDir)) {
                        Files.walk(localDir).use { stream ->
                            stream.filter { Files.isRegularFile(it) }.forEach { file ->
                                val rel = localDir.relativize(file).toString().replace('\\', '/')
                                writeEntry("$folder/$rel", Files.readAllBytes(file))
                                pulledFiles++
                            }
                        }
                    }
                }
            }

            val zipBytes = baos.toByteArray()
            Files.write(backupsDir.resolve(zipFilename), zipBytes)
            val elapsed = System.currentTimeMillis() - start
            workspace.pushLog(
                "SUCCESS",
                "Watch backup completed: $zipFilename",
                "${zipBytes.size / 1024} KB · $pulledFiles files + ${installedApps.size} packages"
            )
            workspace.pushActivity("backup", "Backed up ${watch.name}", "$zipFilename ($pulledFiles files)", "success", elapsed)
            return BackupBundleResult(zipFilename, zipBytes, pulledFiles, installedApps.size)
        } finally {
            tempStage.toFile().deleteRecursively()
        }
    }

    private fun resolveExecutableQuiet(): Path? {
        return try {
            requireExecutableSdb()
        } catch (_: Exception) {
            null
        }
    }

    private fun parseSdbDevicesOutput(stdout: String, defaultPort: Int): List<DiscoveredWatch> {
        val list = mutableListOf<DiscoveredWatch>()
        for (rawLine in stdout.lines()) {
            val line = rawLine.trim()
            if (line.isBlank() || line.startsWith("List of devices", ignoreCase = true) || line.startsWith("*")) continue
            val parts = line.split(Regex("\\s+"))
            if (parts.size < 2) continue
            val serial = parts[0]
            val state = parts[1]
            if (state != "device") continue
            val hostParts = serial.split(":")
            val ip = if (ipv4Re.matches(hostParts[0])) hostParts[0] else "USB"
            val port = hostParts.getOrNull(1)?.toIntOrNull() ?: defaultPort
            val modelToken = parts.drop(2).joinToString(" ").ifBlank { "Galaxy Watch" }
            list.add(
                DiscoveredWatch(
                    id = "watch-${serial.replace(Regex("[^A-Za-z0-9]"), "-")}",
                    serial = serial,
                    name = modelToken,
                    model = modelToken,
                    ip = ip,
                    port = port,
                    tizenVersion = "Detecting...",
                    latencyMs = 10,
                    source = if (ip == "USB") "sdb-devices" else "port-26101-scan",
                )
            )
        }
        return list
    }

    private fun inspectSerialSummary(sdb: Path, base: DiscoveredWatch): DiscoveredWatch {
        val cap = workspace.runner.execute(sdb, listOf("-s", base.serial, "capability"), 6, null).stdout
        val props = parseCapability(cap)
        val model = props["model_name"] ?: props["platform_name"] ?: base.model
        val ver = props["platform_version"] ?: "Tizen"
        return base.copy(
            name = if (model.isNotBlank()) "Galaxy Watch ($model)" else base.name,
            model = model,
            tizenVersion = ver,
        )
    }

    private fun buildRealWatchDevice(sdb: Path, serial: String, ip: String, port: Int): WatchDevice? {
        val capRes = workspace.runner.execute(sdb, listOf("-s", serial, "capability"), 8, null)
        if (!capRes.ok && capRes.stdout.isBlank()) return null
        val props = parseCapability(capRes.stdout)
        val model = props["model_name"] ?: serial
        val ver = props["platform_version"] ?: "Unknown"
        val arch = props["cpu_arch"] ?: props["architecture"]

        var freeMb: Double? = null
        var totalMb: Double? = null
        val dfRes = workspace.runner.execute(sdb, listOf("-s", serial, "shell", "df -k /opt/usr"), 6, null)
        val dfLine = dfRes.stdout.lines().lastOrNull { it.contains("/") && it.split(Regex("\\s+")).size >= 4 }
        if (dfLine != null) {
            val cols = dfLine.trim().split(Regex("\\s+"))
            val totalKb = cols.getOrNull(1)?.toDoubleOrNull()
            val availKb = cols.getOrNull(3)?.toDoubleOrNull()
            if (totalKb != null && availKb != null) {
                totalMb = Math.round(totalKb / 1024.0).toDouble()
                freeMb = Math.round(availKb / 1024.0).toDouble()
            }
        }

        return WatchDevice(
            id = "watch-${serial.replace(Regex("[^A-Za-z0-9]"), "-")}",
            serial = serial,
            name = "Galaxy Watch ($model)",
            model = model,
            ip = ip,
            port = port,
            tizenVersion = ver,
            platformArch = arch,
            firmware = props["build_id"] ?: props["firmware_version"] ?: "Tizen $ver",
            storageFreeMb = freeMb,
            storageTotalMb = totalMb,
            connectedAt = Instant.now().toString(),
            authorizationState = "device",
            connectionSource = if (ip == "USB") "real-sdb-usb" else "real-sdb-wifi",
        )
    }

    private fun parseCapability(raw: String): Map<String, String> {
        val map = mutableMapOf<String, String>()
        for (line in raw.lines()) {
            val idx = line.indexOf(':')
            if (idx > 0) {
                map[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
            }
        }
        return map
    }

    private fun fetchInstalledPackagesFromWatch(sdb: Path, serial: String): List<InstalledApp> {
        val res = workspace.runner.execute(sdb, listOf("-s", serial, "shell", "pkgcmd -l"), 15, null)
        if (!res.ok && res.stdout.isBlank()) return emptyList()

        val typeRe = Regex("pkg_type\\s*\\[([^]]+)]")
        val idRe = Regex("pkgid\\s*\\[([^]]+)]")
        val nameRe = Regex("name\\s*\\[([^]]+)]")
        val verRe = Regex("version\\s*\\[([^]]+)]")

        val list = mutableListOf<InstalledApp>()
        for (line in res.stdout.lines()) {
            val pkgId = idRe.find(line)?.groupValues?.get(1)?.trim() ?: continue
            val rawType = (typeRe.find(line)?.groupValues?.get(1) ?: "tpk").lowercase()
            if (rawType !in setOf("tpk", "wgt")) continue
            val name = nameRe.find(line)?.groupValues?.get(1)?.trim().orEmpty().ifBlank { pkgId }
            val ver = verRe.find(line)?.groupValues?.get(1)?.trim().orEmpty().ifBlank { "1.0" }
            list.add(
                InstalledApp(
                    appId = pkgId,
                    packageId = pkgId,
                    title = name,
                    category = if (pkgId.contains("watch", true) || rawType == "wgt") "Watch faces" else "Utilities & Tools",
                    packageType = ".$rawType",
                    version = ver,
                    fileSize = "On watch",
                    fileSizeMb = 0.0,
                    installedAt = Instant.now().toString(),
                    source = "watch",
                    iconKey = if (rawType == "wgt") "chronograph" else "serverping",
                )
            )
        }
        return list
    }
}
