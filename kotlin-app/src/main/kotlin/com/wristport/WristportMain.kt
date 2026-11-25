package com.wristport

import java.awt.Desktop
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path

fun main(args: Array<String>) {
    val port = System.getenv("WRISTPORT_PORT")?.toIntOrNull() ?: 8765
    val distCandidates = listOf(
        Path.of("dist").toAbsolutePath().normalize(),
        Path.of("..", "dist").toAbsolutePath().normalize(),
    )
    val distDir = distCandidates.firstOrNull { Files.isRegularFile(it.resolve("index.html")) }

    val workspace = SdbWorkspaceManager()
    val archiveClient = TizenArchiveClient()
    val discovery = WatchDiscoveryService(workspace, archiveClient)
    val server = HttpBridgeServer(workspace, archiveClient, discovery, distDir, port)
    val boundPort = server.start()

    val ws = workspace.getWorkspaceStatus()
    println("============================================================")
    println("  wristport Kotlin JVM + Java SDB Runtime")
    println("  UI & API : http://127.0.0.1:$boundPort/")
    println("  Workspace: ${workspace.binDir}")
    println("  SDB Status: ${if (ws.executableOnHost) ws.sdbVersion else ws.error}")
    println("============================================================")

    if (ws.executableOnHost) {
        try {
            discovery.discoverWatches(workspace.config.defaultPort)
        } catch (_: Exception) {
        }
    }

    if ("--headless" !in args && Desktop.isDesktopSupported()) {
        try {
            Desktop.getDesktop().browse(URI("http://127.0.0.1:$boundPort/"))
        } catch (_: Exception) {
        }
    }

    Thread.currentThread().join()
}
