package com.wristport

import com.google.gson.reflect.TypeToken
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.io.IOException
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

class HttpBridgeServer(
    private val workspace: SdbWorkspaceManager,
    private val archiveClient: TizenArchiveClient,
    private val discoveryService: WatchDiscoveryService,
    private val distDir: Path?,
    private val port: Int = 8765,
) {
    private var server: HttpServer? = null

    fun start(): Int {
        val srv = HttpServer.create(InetSocketAddress("127.0.0.1", port), 0)
        srv.executor = Executors.newCachedThreadPool()
        srv.createContext("/") { ex -> handle(ex) }
        srv.start()
        server = srv
        workspace.pushLog("INFO", "Kotlin HTTP/SSE bridge listening on http://127.0.0.1:$port")
        return srv.address.port
    }

    private fun handle(ex: HttpExchange) {
        try {
            val method = ex.requestMethod.uppercase()
            val rawUri = ex.requestURI
            val reqPath = rawUri.path ?: "/"

            if (method == "OPTIONS") {
                addCors(ex)
                ex.sendResponseHeaders(204, -1)
                ex.close()
                return
            }

            if (method == "GET" && reqPath == "/api/sdb/logs/stream") {
                handleSse(ex)
                return
            }

            if (method == "GET") {
                when {
                    reqPath == "/api/health" || reqPath == "/health" -> {
                        val ws = workspace.getWorkspaceStatus()
                        sendJson(
                            ex,
                            200,
                            mapOf(
                                "status" to "ok",
                                "service" to "wristport-kotlin-jvm",
                                "workspace" to ws,
                                "watchConnected" to (discoveryService.connectedWatch != null),
                                "installedCount" to discoveryService.installedApps.size,
                            )
                        )
                    }

                    reqPath == "/api/sdb/workspace" -> {
                        sendJson(ex, 200, workspace.getWorkspaceStatus())
                    }

                    reqPath == "/api/sdb/state" -> {
                        val ws = workspace.getWorkspaceStatus()
                        val logCopy = synchronized(workspace.logs) { workspace.logs.takeLast(200) }
                        val actCopy = synchronized(workspace.activities) { workspace.activities.toList() }
                        sendJson(
                            ex,
                            200,
                            mapOf(
                                "config" to workspace.config,
                                "workspace" to ws,
                                "watch" to discoveryService.connectedWatch,
                                "installedApps" to discoveryService.installedApps,
                                "activities" to actCopy,
                                "logs" to logCopy,
                            )
                        )
                    }

                    reqPath == "/api/archive/apps" -> {
                        val q = parseQueryParam(rawUri.rawQuery, "q")
                        workspace.pushLog(
                            "INFO",
                            if (q.isNotBlank()) "Searching https://tizen-archive.com/ for \"$q\"..."
                            else "Fetching live catalog from https://tizen-archive.com/..."
                        )
                        val apps = archiveClient.fetchCatalog(q)
                        workspace.pushLog("SUCCESS", "Loaded ${apps.size} live packages from tizen-archive.com")
                        sendJson(
                            ex,
                            200,
                            mapOf(
                                "apps" to apps,
                                "source" to "https://tizen-archive.com/",
                                "live" to (apps.isNotEmpty() || q.isNotBlank()),
                            )
                        )
                    }

                    reqPath.startsWith("/api/archive/icon/") -> {
                        val file = reqPath.removePrefix("/api/archive/icon/")
                        if (!Regex("^[a-f0-9]+\\.png$", RegexOption.IGNORE_CASE).matches(file)) {
                            sendJson(ex, 400, mapOf("error" to "Invalid icon filename"))
                            return
                        }
                        val bytes = archiveClient.fetchIconBytes(file)
                        if (bytes == null) {
                            sendJson(ex, 404, mapOf("error" to "Icon not found"))
                        } else {
                            addCors(ex)
                            ex.responseHeaders.set("Content-Type", "image/png")
                            ex.responseHeaders.set("Cache-Control", "public, max-age=86400")
                            ex.sendResponseHeaders(200, bytes.size.toLong())
                            ex.responseBody.use { it.write(bytes) }
                        }
                    }

                    reqPath.startsWith("/api/archive/package/") -> {
                        val pkgId = URLDecoder.decode(reqPath.removePrefix("/api/archive/package/"), StandardCharsets.UTF_8)
                        if (!Regex("^[A-Za-z0-9._-]+$").matches(pkgId)) {
                            sendJson(ex, 400, mapOf("error" to "Invalid package ID"))
                            return
                        }
                        val detail = archiveClient.fetchPackageDetails(pkgId)
                        if (detail == null) {
                            sendJson(ex, 404, mapOf("error" to "Package details unavailable"))
                        } else {
                            sendJson(ex, 200, mapOf("detail" to detail))
                        }
                    }

                    reqPath.startsWith("/api/packages/") && reqPath.endsWith("/download") -> {
                        val ws = workspace.getWorkspaceStatus()
                        if (!ws.uploaded) {
                            sendJson(ex, 409, mapOf("error" to "Upload your real sdb.exe / sdb binary into workspace bin/ before downloading."))
                            return
                        }
                        val pkgId = URLDecoder.decode(
                            reqPath.removePrefix("/api/packages/").removeSuffix("/download"),
                            StandardCharsets.UTF_8
                        )
                        if (!Regex("^[A-Za-z0-9._-]+$").matches(pkgId)) {
                            sendJson(ex, 400, mapOf("error" to "Invalid package ID"))
                            return
                        }
                        val detail = archiveClient.fetchPackageDetails(pkgId)
                        val hash = detail?.artifactHash
                        if (hash == null) {
                            sendJson(ex, 404, mapOf("error" to "Artifact not found for $pkgId"))
                        } else {
                            val bytes = archiveClient.downloadArtifactBytes(hash)
                            val fname = (detail.artifactFilename ?: "$pkgId${detail.packageType}")
                                .replace(Regex("[^A-Za-z0-9._-]"), "_")
                            addCors(ex)
                            ex.responseHeaders.set("Content-Type", "application/octet-stream")
                            ex.responseHeaders.set("Content-Disposition", "attachment; filename=\"$fname\"")
                            ex.sendResponseHeaders(200, bytes.size.toLong())
                            ex.responseBody.use { it.write(bytes) }
                        }
                    }

                    else -> serveStaticOr404(ex, reqPath)
                }
                return
            }

            if (method == "POST") {
                val body = readBodyMap(ex)
                when (reqPath) {
                    "/api/sdb/upload" -> {
                        val filename = body["filename"]?.toString()?.trim().orEmpty()
                        val b64 = body["fileBase64"]?.toString().orEmpty()
                        if (filename.isBlank() || b64.isBlank()) {
                            sendJson(ex, 400, mapOf("error" to "Missing SDB file payload."))
                            return
                        }
                        val bytes = Base64.getDecoder().decode(b64)
                        val ws = workspace.stageUploadedBinary(filename, bytes)
                        sendJson(ex, 200, mapOf("workspace" to ws, "config" to workspace.config))
                    }

                    "/api/sdb/config" -> {
                        body["defaultPort"]?.toString()?.toDoubleOrNull()?.toInt()?.let {
                            if (it in 1..65535) workspace.config.defaultPort = it
                        }
                        body["subnetPrefix"]?.toString()?.trim()?.let {
                            if (Regex("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$").matches(it)) {
                                workspace.config.subnetPrefix = it
                            }
                        }
                        body["lastIpOctet"]?.toString()?.let {
                            workspace.config.lastIpOctet = it.filter(Char::isDigit).take(3)
                        }
                        (body["verboseLogging"] as? Boolean)?.let {
                            workspace.config.verboseLogging = it
                        }
                        (body["theme"] as? Map<*, *>)?.let { t ->
                            val current = workspace.config.theme ?: ThemeConfig()
                            t["family"]?.toString()?.let { current.family = it }
                            t["mode"]?.toString()?.let { current.mode = it }
                            t["fontFamily"]?.toString()?.let { current.fontFamily = it }
                            t["material3Color"]?.toString()?.let { current.material3Color = it }
                            t["zorinMode"]?.toString()?.let { current.zorinMode = it }
                            t["catppuccinFlavor"]?.toString()?.let { current.catppuccinFlavor = it }
                            t["catppuccinAccent"]?.toString()?.let { current.catppuccinAccent = it }
                            t["heroWatch"]?.toString()?.let { current.heroWatch = it }
                            t["heroStrap"]?.toString()?.let { current.heroStrap = it }
                            t["profileName"]?.toString()?.let { current.profileName = it }
                            t["profileAvatar"]?.toString()?.let { current.profileAvatar = it }
                            workspace.config.theme = current
                        }
                        workspace.saveConfig()
                        sendJson(ex, 200, mapOf("config" to workspace.config))
                    }

                    "/api/sdb/test" -> {
                        val (verOk, verOut) = discoveryService.runDirectSdb(listOf("version"))
                        val (_, devOut) = discoveryService.runDirectSdb(listOf("devices", "-l"))
                        sendJson(
                            ex,
                            200,
                            mapOf(
                                "ok" to verOk,
                                "sdbPath" to (workspace.getWorkspaceStatus().binaryPath ?: ""),
                                "version" to verOut,
                                "devices" to devOut,
                            )
                        )
                    }

                    "/api/sdb/restart-server" -> {
                        val out = discoveryService.restartSdbServer()
                        sendJson(ex, 200, mapOf("ok" to true, "output" to out))
                    }

                    "/api/sdb/discover", "/api/sdb/scan" -> {
                        val portArg = body["port"]?.toString()?.toDoubleOrNull()?.toInt()
                            ?: workspace.config.defaultPort
                        val result = discoveryService.discoverWatches(portArg)
                        sendJson(ex, 200, result)
                    }

                    "/api/sdb/connect" -> {
                        val ip = body["ip"]?.toString()
                        val octet = body["octet"]?.toString()
                        val p = body["port"]?.toString()?.toDoubleOrNull()?.toInt()
                            ?: workspace.config.defaultPort
                        val watch = discoveryService.connectByIpOrOctet(ip, octet, p)
                        sendJson(ex, 200, mapOf("watch" to watch, "installedApps" to discoveryService.installedApps))
                    }

                    "/api/sdb/disconnect" -> {
                        discoveryService.disconnectWatch()
                        sendJson(ex, 200, mapOf("ok" to true))
                    }

                    "/api/sdb/installed/refresh" -> {
                        val list = discoveryService.refreshInstalledApps()
                        sendJson(ex, 200, mapOf("installedApps" to list))
                    }

                    "/api/sdb/install" -> {
                        val pkgId = body["packageId"]?.toString()
                        val title = body["title"]?.toString()
                        val localPath = body["localFilePath"]?.toString()
                        val customName = body["customFilename"]?.toString()
                        val b64 = body["fileBase64"]?.toString()
                        val uninstallFirst = (body["uninstallFirst"] as? Boolean) ?: false
                        val bytes = if (!b64.isNullOrBlank()) Base64.getDecoder().decode(b64) else null
                        val installed = discoveryService.installPackageToWatch(
                            pkgId,
                            title,
                            localPath,
                            customName,
                            bytes,
                            uninstallFirst
                        )
                        sendJson(
                            ex,
                            200,
                            mapOf(
                                "installedApp" to installed,
                                "installedApps" to discoveryService.installedApps,
                                "watch" to discoveryService.connectedWatch,
                            )
                        )
                    }

                    "/api/sdb/uninstall" -> {
                        val pkgId = body["packageId"]?.toString()?.trim().orEmpty()
                        discoveryService.uninstallPackage(pkgId)
                        sendJson(
                            ex,
                            200,
                            mapOf(
                                "installedApps" to discoveryService.installedApps,
                                "watch" to discoveryService.connectedWatch,
                            )
                        )
                    }

                    "/api/sdb/backup" -> {
                        val bundle = discoveryService.createWatchBackupZip()
                        addCors(ex)
                        ex.responseHeaders.set("Content-Type", "application/zip")
                        ex.responseHeaders.set("Content-Disposition", "attachment; filename=\"${bundle.filename}\"")
                        ex.responseHeaders.set("X-Backup-Files", bundle.fileCount.toString())
                        ex.responseHeaders.set("X-Backup-Packages", bundle.packageCount.toString())
                        ex.responseHeaders.set("X-Backup-Filename", bundle.filename)
                        ex.sendResponseHeaders(200, bundle.zipBytes.size.toLong())
                        ex.responseBody.use { it.write(bundle.zipBytes) }
                    }

                    "/api/sdb/command" -> {
                        val raw = body["command"]?.toString()?.trim().orEmpty()
                        var parts = raw.split(Regex("\\s+")).filter { it.isNotBlank() }
                        if (parts.firstOrNull()?.equals("sdb", true) == true) {
                            parts = parts.drop(1)
                        }
                        val allowed = setOf("devices", "version", "capability", "kill-server", "start-server", "shell")
                        if (parts.isEmpty() || parts.first().lowercase() !in allowed) {
                            sendJson(ex, 400, mapOf("error" to "Command must be one of: devices, version, capability, kill-server, start-server, shell ..."))
                            return
                        }
                        val (ok, out) = discoveryService.runDirectSdb(parts)
                        sendJson(ex, 200, mapOf("ok" to ok, "output" to out))
                    }

                    "/api/sdb/logs/clear" -> {
                        synchronized(workspace.logs) { workspace.logs.clear() }
                        workspace.pushLog("INFO", "Console log buffer cleared")
                        sendJson(ex, 200, mapOf("ok" to true))
                    }

                    else -> sendJson(ex, 404, mapOf("error" to "Endpoint not found"))
                }
                return
            }

            sendJson(ex, 405, mapOf("error" to "Method not allowed"))
        } catch (err: Exception) {
            sendJson(ex, 400, mapOf("error" to (err.message ?: err.javaClass.simpleName)))
        }
    }

    private fun handleSse(ex: HttpExchange) {
        val q = LinkedBlockingQueue<String>(256)
        val listener: (SdbLogEntry) -> Unit = { entry ->
            q.offer("data: ${workspace.gson.toJson(entry)}\n\n")
        }
        workspace.sseListeners.add(listener)

        addCors(ex)
        ex.responseHeaders.set("Content-Type", "text/event-stream; charset=utf-8")
        ex.responseHeaders.set("Cache-Control", "no-cache")
        ex.responseHeaders.set("Connection", "keep-alive")
        ex.sendResponseHeaders(200, 0)

        try {
            ex.responseBody.use { out ->
                while (true) {
                    val frame = q.poll(15, TimeUnit.SECONDS) ?: ": keepalive\n\n"
                    out.write(frame.toByteArray(StandardCharsets.UTF_8))
                    out.flush()
                }
            }
        } catch (_: IOException) {
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
        } finally {
            workspace.sseListeners.remove(listener)
        }
    }

    private fun serveStaticOr404(ex: HttpExchange, reqPath: String) {
        if (distDir == null || !Files.isDirectory(distDir)) {
            sendJson(ex, 404, mapOf("error" to "Static dist/ folder not present"))
            return
        }
        val rootNorm = distDir.toAbsolutePath().normalize()
        val rel = reqPath.trimStart('/').ifBlank { "index.html" }
        var target = rootNorm.resolve(rel).normalize()
        if (!target.startsWith(rootNorm)) {
            sendJson(ex, 403, mapOf("error" to "Forbidden"))
            return
        }
        if (!Files.isRegularFile(target)) {
            target = rootNorm.resolve("index.html")
        }
        if (!Files.isRegularFile(target)) {
            sendJson(ex, 404, mapOf("error" to "index.html missing"))
            return
        }
        val bytes = Files.readAllBytes(target)
        val mime = guessMime(target.fileName.toString())
        addCors(ex)
        ex.responseHeaders.set("Content-Type", mime)
        ex.sendResponseHeaders(200, bytes.size.toLong())
        ex.responseBody.use { it.write(bytes) }
    }

    private fun guessMime(name: String): String {
        val lower = name.lowercase()
        return when {
            lower.endsWith(".html") -> "text/html; charset=utf-8"
            lower.endsWith(".js") -> "application/javascript; charset=utf-8"
            lower.endsWith(".css") -> "text/css; charset=utf-8"
            lower.endsWith(".svg") -> "image/svg+xml"
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".json") -> "application/json"
            else -> "application/octet-stream"
        }
    }

    private fun readBodyMap(ex: HttpExchange): Map<String, Any?> {
        val raw = ex.requestBody.readAllBytes().toString(StandardCharsets.UTF_8)
        if (raw.isBlank()) return emptyMap()
        val mapType = object : TypeToken<Map<String, Any?>>() {}.type
        return workspace.gson.fromJson(raw, mapType) ?: emptyMap()
    }

    private fun parseQueryParam(rawQuery: String?, key: String): String {
        if (rawQuery.isNullOrBlank()) return ""
        for (pair in rawQuery.split("&")) {
            val idx = pair.indexOf('=')
            if (idx > 0 && pair.substring(0, idx) == key) {
                return URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8)
            }
        }
        return ""
    }

    private fun addCors(ex: HttpExchange) {
        ex.responseHeaders.set("Access-Control-Allow-Origin", "*")
        ex.responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        ex.responseHeaders.set("Access-Control-Allow-Headers", "Content-Type")
    }

    private fun sendJson(ex: HttpExchange, status: Int, payload: Any) {
        val bytes = workspace.gson.toJson(payload).toByteArray(StandardCharsets.UTF_8)
        addCors(ex)
        ex.responseHeaders.set("Content-Type", "application/json; charset=utf-8")
        ex.sendResponseHeaders(status, bytes.size.toLong())
        ex.responseBody.use { it.write(bytes) }
    }
}
