package com.wristport

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.wristport.java.LanPort26101Scanner
import com.wristport.java.SdbProcessRunner
import java.io.ByteArrayInputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.nio.file.attribute.PosixFilePermission
import java.time.Instant
import java.util.Collections
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList
import java.util.zip.ZipInputStream

class SdbWorkspaceManager(
    val appHome: Path = Path.of("wristport_data").toAbsolutePath().normalize(),
) {
    val binDir: Path = appHome.resolve("bin").normalize()
    val downloadsDir: Path = appHome.resolve("downloads").normalize()
    val configPath: Path = appHome.resolve("config.json").normalize()

    val runner = SdbProcessRunner()
    val scanner = LanPort26101Scanner()
    val gson: Gson = GsonBuilder().setPrettyPrinting().create()

    val logs = Collections.synchronizedList(mutableListOf<SdbLogEntry>())
    val activities = Collections.synchronizedList(mutableListOf<ActivityRecord>())
    val sseListeners = CopyOnWriteArrayList<(SdbLogEntry) -> Unit>()

    var config: SdbConfig = SdbConfig()

    private val safeNameRe = Regex("^[A-Za-z0-9._-]+$")
    private var cachedVersion: String? = null
    private var cachedBinaryKey: String? = null

    init {
        Files.createDirectories(binDir)
        Files.createDirectories(downloadsDir)
        loadConfig()
        val detectedSubnets = scanner.detectLocalSubnets()
        if (detectedSubnets.isNotEmpty() && config.subnetPrefix == "192.168.1") {
            config.subnetPrefix = detectedSubnets.first()
        }
        pushLog("INFO", "wristport Kotlin JVM + Java backend initialized", System.getProperty("os.name"))
    }

    fun pushLog(level: String, message: String, detail: String? = null): SdbLogEntry {
        val entry = SdbLogEntry(
            id = "log_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(5)}",
            timestamp = Instant.now().toString(),
            level = level,
            message = message,
            detail = detail,
        )
        synchronized(logs) {
            logs.add(entry)
            if (logs.size > 400) {
                logs.subList(0, logs.size - 400).clear()
            }
        }
        for (listener in sseListeners) {
            try {
                listener(entry)
            } catch (_: Exception) {
            }
        }
        return entry
    }

    fun pushActivity(action: String, title: String, target: String, status: String, durationMs: Long) {
        val rec = ActivityRecord(
            id = "act_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(5)}",
            action = action,
            title = title,
            target = target,
            status = status,
            durationMs = durationMs,
            timestamp = Instant.now().toString(),
        )
        synchronized(activities) {
            activities.add(0, rec)
            if (activities.size > 100) {
                activities.subList(100, activities.size).clear()
            }
        }
    }

    private fun loadConfig() {
        val seed = Path.of("config.json").toAbsolutePath().normalize()
        val source = when {
            Files.isRegularFile(configPath) -> configPath
            Files.isRegularFile(seed) -> seed
            else -> null
        }
        if (source != null) {
            try {
                val parsed = gson.fromJson(Files.readString(source), SdbConfig::class.java)
                if (parsed != null) {
                    config = parsed
                }
            } catch (_: Exception) {
            }
        }
    }

    fun saveConfig() {
        Files.createDirectories(configPath.parent)
        Files.writeString(configPath, gson.toJson(config))
    }

    fun resolveWorkspaceBinary(): Path? {
        val isWin = System.getProperty("os.name", "").lowercase().contains("win")
        val candidates = if (isWin) {
            listOf(binDir.resolve("sdb.exe"), binDir.resolve("sdb"))
        } else {
            listOf(binDir.resolve("sdb"), binDir.resolve("sdb.exe"))
        }
        for (p in candidates) {
            if (Files.isRegularFile(p)) return p
        }
        val configured = config.sdbPath.trim()
        if (configured.isNotEmpty()) {
            val p = Path.of(configured).normalize()
            if (Files.isRegularFile(p)) return p
        }
        return null
    }

    fun getWorkspaceStatus(forceRefresh: Boolean = false): SdbWorkspaceStatus {
        val stagedFiles = if (Files.isDirectory(binDir)) {
            Files.list(binDir).use { stream ->
                stream.filter { Files.isRegularFile(it) }
                    .map { it.fileName.toString() }
                    .sorted()
                    .toList()
            }
        } else {
            emptyList()
        }

        val binary = resolveWorkspaceBinary()
        val hostOs = System.getProperty("os.name", "unknown")
        val detectedSubnets = scanner.detectLocalSubnets()

        if (binary == null) {
            return SdbWorkspaceStatus(
                uploaded = false,
                executableOnHost = false,
                binaryName = null,
                binaryPath = null,
                binaryFormat = "missing",
                binarySizeBytes = 0L,
                hostOs = hostOs,
                sdbVersion = null,
                error = "No sdb executable found in workspace bin/ directory.",
                stagedFiles = stagedFiles,
                detectedSubnets = detectedSubnets,
            )
        }

        val size = Files.size(binary)
        val format = runner.detectBinaryFormat(binary)
        val executableOnHost = runner.isExecutableOnHost(format)
        val binaryKey = "${binary.toAbsolutePath()}:$size"

        if (executableOnHost && (forceRefresh || cachedBinaryKey != binaryKey)) {
            val res = runner.execute(binary, listOf("version"), 8, null)
            cachedVersion = if (res.ok && res.stdout.isNotBlank()) res.stdout else null
            cachedBinaryKey = binaryKey
        }

        val error = when {
            !executableOnHost ->
                "Uploaded binary (${binary.fileName}, $format) does not match host OS ($hostOs)."
            cachedVersion == null ->
                "Uploaded binary did not respond to 'sdb version'."
            else -> null
        }

        return SdbWorkspaceStatus(
            uploaded = true,
            executableOnHost = executableOnHost,
            binaryName = binary.fileName.toString(),
            binaryPath = binary.toAbsolutePath().toString(),
            binaryFormat = format,
            binarySizeBytes = size,
            hostOs = hostOs,
            sdbVersion = if (executableOnHost) cachedVersion else null,
            error = error,
            stagedFiles = stagedFiles,
            detectedSubnets = detectedSubnets,
        )
    }

    fun stageUploadedBinary(filename: String, bytes: ByteArray): SdbWorkspaceStatus {
        val cleanName = Path.of(filename).fileName.toString()
        require(safeNameRe.matches(cleanName)) { "Unsafe filename rejected." }
        require(bytes.size in 1024..(120 * 1024 * 1024)) { "Invalid file size." }

        val targetPrefix = binDir.toAbsolutePath().normalize().toString() + java.io.File.separator
        if (cleanName.lowercase().endsWith(".zip")) {
            val extracted = mutableListOf<String>()
            ZipInputStream(ByteArrayInputStream(bytes)).use { zis ->
                while (true) {
                    val entry = zis.nextEntry ?: break
                    if (entry.isDirectory) continue
                    val base = Path.of(entry.name).fileName?.toString() ?: continue
                    val lower = base.lowercase()
                    val isRelevant = lower == "sdb" || lower == "sdb.exe" || lower.endsWith(".dll") ||
                        entry.name.lowercase().contains("tools/sdb")
                    if (!isRelevant || !safeNameRe.matches(base)) continue

                    val dest = binDir.resolve(base).toAbsolutePath().normalize()
                    require(dest.toString().startsWith(targetPrefix)) { "Blocked path traversal in zip archive." }
                    Files.copy(zis, dest, StandardCopyOption.REPLACE_EXISTING)
                    if ((lower == "sdb" || lower == "sdb.exe") && !System.getProperty("os.name", "").lowercase().contains("win")) {
                        grantExecutePermission(dest)
                    }
                    extracted.add(base)
                }
            }
            require(extracted.any { it.equals("sdb.exe", true) || it.equals("sdb", true) }) {
                "Archive did not contain sdb.exe or sdb."
            }
            pushLog("SUCCESS", "Extracted SDB binaries into workspace bin/", extracted.joinToString(", "))
        } else {
            val targetName = when {
                cleanName.equals("sdb.exe", true) -> "sdb.exe"
                cleanName.equals("sdb", true) -> "sdb"
                cleanName.lowercase().endsWith(".exe") -> "sdb.exe"
                cleanName.lowercase().endsWith(".dll") -> cleanName
                else -> "sdb"
            }
            val dest = binDir.resolve(targetName).toAbsolutePath().normalize()
            require(dest.toString().startsWith(targetPrefix)) { "Path outside workspace bin/ blocked." }
            Files.write(dest, bytes)
            if (!targetName.endsWith(".dll", true) && !System.getProperty("os.name", "").lowercase().contains("win")) {
                grantExecutePermission(dest)
            }
            pushLog("SUCCESS", "Saved $targetName (${bytes.size / 1024} KB) into workspace bin/")
        }

        val resolved = resolveWorkspaceBinary()
        if (resolved != null) {
            config.sdbPath = resolved.toAbsolutePath().toString()
            saveConfig()
        }
        return getWorkspaceStatus(forceRefresh = true)
    }

    private fun grantExecutePermission(path: Path) {
        try {
            val perms = Files.getPosixFilePermissions(path).toMutableSet()
            perms.add(PosixFilePermission.OWNER_EXECUTE)
            perms.add(PosixFilePermission.GROUP_EXECUTE)
            Files.setPosixFilePermissions(path, perms)
        } catch (_: Exception) {
        }
    }
}
