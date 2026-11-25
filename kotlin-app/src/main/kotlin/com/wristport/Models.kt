package com.wristport

data class SdbWorkspaceStatus(
    val uploaded: Boolean,
    val executableOnHost: Boolean,
    val binaryName: String?,
    val binaryPath: String?,
    val binaryFormat: String,
    val binarySizeBytes: Long,
    val hostOs: String,
    val sdbVersion: String?,
    val error: String?,
    val stagedFiles: List<String>,
    val detectedSubnets: List<String>,
)

data class WatchDevice(
    val id: String,
    val serial: String,
    val name: String,
    val model: String,
    val ip: String,
    val port: Int,
    val tizenVersion: String,
    val platformArch: String?,
    val firmware: String,
    val storageFreeMb: Double?,
    val storageTotalMb: Double?,
    val connectedAt: String,
    val authorizationState: String,
    val connectionSource: String,
)

data class DiscoveredWatch(
    val id: String,
    val serial: String,
    val name: String,
    val model: String,
    val ip: String,
    val port: Int,
    val tizenVersion: String,
    val latencyMs: Int,
    val source: String,
)

data class WatchDiscoveryResult(
    val devices: List<DiscoveredWatch>,
    val connectedWatch: WatchDevice?,
    val installedApps: List<InstalledApp>,
    val scannedSubnets: List<String>,
    val needsManualIp: Boolean,
    val reason: String? = null,
)

data class InstalledApp(
    val appId: String,
    val packageId: String,
    val title: String,
    val category: String,
    val packageType: String,
    val version: String,
    val fileSize: String,
    val fileSizeMb: Double,
    val installedAt: String,
    val source: String,
    val iconKey: String,
)

data class SdbLogEntry(
    val id: String,
    val timestamp: String,
    val level: String,
    val message: String,
    val detail: String? = null,
)

data class ActivityRecord(
    val id: String,
    val action: String,
    val title: String,
    val target: String,
    val status: String,
    val durationMs: Long,
    val timestamp: String,
)

data class ThemeConfig(
    var family: String = "zorin",
    var mode: String = "dark",
    var fontFamily: String = "default",
    var material3Color: String = "indigo",
    var zorinMode: String = "dark",
    var catppuccinFlavor: String = "mocha",
    var catppuccinAccent: String = "mauve",
    var heroWatch: String = "galaxy-watch-1",
    var heroStrap: String = "sports",
    var profileName: String = "Watch enthusiast",
    var profileAvatar: String = "",
)

data class SdbConfig(
    var sdbPath: String = "",
    var bridgeUrl: String = "http://127.0.0.1:8765",
    var defaultPort: Int = 26101,
    var subnetPrefix: String = "192.168.1",
    var lastIpOctet: String = "",
    var authorCertPath: String = "",
    var distributorCertPath: String = "",
    var verboseLogging: Boolean = true,
    var theme: ThemeConfig? = ThemeConfig(),
)

data class ArchivePackageDetail(
    val packageId: String,
    val artifactHash: String?,
    val artifactFilename: String?,
    val fileSize: String?,
    val packageType: String,
    val signatureStatus: String?,
    val fetchedAt: Long,
)

data class TizenAppItem(
    val id: String,
    val packageId: String,
    val title: String,
    val developer: String,
    val category: String,
    var packageType: String,
    var fileSize: String,
    val fileSizeBytes: Long,
    val version: String,
    val tizenMin: String,
    val compatibility: List<String>,
    val description: String,
    val highlights: List<String>,
    val privileges: List<String>,
    var sha256: String,
    var artifactHash: String? = null,
    var artifactFilename: String? = null,
    var signatureStatus: String? = null,
    val iconUrl: String? = null,
    val sourceUrl: String? = null,
    val isLiveArchive: Boolean = true,
    val gradientFrom: String,
    val gradientTo: String,
    val accentColor: String,
    val iconKey: String,
)
