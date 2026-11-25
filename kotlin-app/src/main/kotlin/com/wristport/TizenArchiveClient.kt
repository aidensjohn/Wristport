package com.wristport

import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

class TizenArchiveClient {
    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) wristport-kotlin/1.0"
    private val http: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build()

    private val pkgIdRe = Regex("^[A-Za-z0-9._-]+$")
    private val safeIconRe = Regex("^[a-f0-9]+\\.png$", RegexOption.IGNORE_CASE)
    private val detailCache = ConcurrentHashMap<String, ArchivePackageDetail>()

    private val gradients = listOf(
        Triple("#23273A", "#1A1D2B", "#A8C0FF"),
        Triple("#1C2E2B", "#162120", "#6EE7B7"),
        Triple("#33251D", "#221A17", "#F5B971"),
        Triple("#252438", "#1A1926", "#C4B5FD"),
        Triple("#1E2A3A", "#151D28", "#60A5FA"),
    )

    private fun fetchString(url: String): String? {
        val req = HttpRequest.newBuilder(URI.create(url))
            .header("User-Agent", userAgent)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build()
        val resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8))
        return if (resp.statusCode() in 200..299) resp.body() else null
    }

    fun fetchPackageDetails(packageId: String): ArchivePackageDetail? {
        if (!pkgIdRe.matches(packageId)) return null
        val cached = detailCache[packageId]
        if (cached != null && System.currentTimeMillis() - cached.fetchedAt < 600_000L) {
            return cached
        }
        val html = try {
            fetchString("https://tizen-archive.com/packages/${URLEncoder.encode(packageId, StandardCharsets.UTF_8)}")
        } catch (_: Exception) {
            null
        } ?: return null

        val artifactHash = Regex("/api/artifacts/([a-f0-9]+)/download", RegexOption.IGNORE_CASE).find(html)?.groupValues?.get(1)
        val filename = Regex("<span class=\"truncate\">([^<]+\\.(?:tpk|wgt))</span>", RegexOption.IGNORE_CASE).find(html)?.groupValues?.get(1)
        val size = Regex("<span class=\"text-zinc-500\">([0-9.]+\\s*(?:KB|MB|GB|B))</span>", RegexOption.IGNORE_CASE).find(html)?.groupValues?.get(1)
        val pkgType = if ((filename != null && filename.lowercase().endsWith(".wgt")) || html.contains("Download .wgt")) ".wgt" else ".tpk"
        val detail = ArchivePackageDetail(
            packageId = packageId,
            artifactHash = artifactHash,
            artifactFilename = filename,
            fileSize = size,
            packageType = pkgType,
            signatureStatus = if (html.contains("author-signature.xml")) "Signed (author-signature.xml)" else "Archived Tizen package",
            fetchedAt = System.currentTimeMillis(),
        )
        detailCache[packageId] = detail
        return detail
    }

    fun fetchIconBytes(filename: String): ByteArray? {
        if (!safeIconRe.matches(filename)) return null
        val req = HttpRequest.newBuilder(URI.create("https://tizen-archive.com/api/icons/$filename"))
            .header("User-Agent", userAgent)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build()
        val resp = http.send(req, HttpResponse.BodyHandlers.ofByteArray())
        return if (resp.statusCode() == 200) resp.body() else null
    }

    fun downloadArtifactBytes(artifactHash: String): ByteArray {
        require(Regex("^[a-f0-9]+$", RegexOption.IGNORE_CASE).matches(artifactHash)) { "Invalid artifact hash" }
        val req = HttpRequest.newBuilder(URI.create("https://tizen-archive.com/api/artifacts/$artifactHash/download"))
            .header("User-Agent", userAgent)
            .timeout(Duration.ofSeconds(45))
            .GET()
            .build()
        val resp = http.send(req, HttpResponse.BodyHandlers.ofByteArray())
        if (resp.statusCode() !in 200..299) {
            throw IllegalStateException("tizen-archive.com returned HTTP ${resp.statusCode()}")
        }
        return resp.body()
    }

    private fun extractMaxPage(html: String): Int {
        var maxPage = 1
        val pageRe = Regex("""\bof\s+(\d+)\b""", RegexOption.IGNORE_CASE)
        for (m in pageRe.findAll(html)) {
            val n = m.groupValues[1].toIntOrNull() ?: continue
            if (n > maxPage && n <= 80) maxPage = n
        }
        return maxPage
    }

    @Volatile
    private var cachedFullCatalog: Pair<Long, List<TizenAppItem>>? = null

    fun fetchCatalog(query: String = ""): List<TizenAppItem> {
        val clean = query.trim()
        val cached = cachedFullCatalog
        if (clean.isEmpty() && cached != null && System.currentTimeMillis() - cached.first < 900_000L) {
            return cached.second
        }

        val baseSections = if (clean.isNotEmpty()) {
            val enc = URLEncoder.encode(clean, StandardCharsets.UTF_8)
            listOf(
                "https://tizen-archive.com/apps?q=$enc" to "Utilities & Tools",
                "https://tizen-archive.com/watchfaces?q=$enc" to "Watch faces",
            )
        } else {
            listOf(
                "https://tizen-archive.com/apps" to "Utilities & Tools",
                "https://tizen-archive.com/watchfaces" to "Watch faces",
            )
        }

        val pageResults = mutableListOf<Pair<String, String>>()
        val remainingUrls = mutableListOf<Pair<String, String>>()

        for ((baseUrl, fallbackCat) in baseSections) {
            val html = try {
                fetchString(baseUrl)
            } catch (_: Exception) {
                null
            } ?: continue
            pageResults.add(html to fallbackCat)
            val maxPage = extractMaxPage(html)
            val sep = if (baseUrl.contains("?")) "&" else "?"
            for (p in 2..maxPage) {
                remainingUrls.add("${baseUrl}${sep}page=$p" to fallbackCat)
            }
        }

        if (remainingUrls.isNotEmpty()) {
            val pool = java.util.concurrent.Executors.newFixedThreadPool(6)
            try {
                val futures = remainingUrls.map { (pageUrl, fallbackCat) ->
                    pool.submit<Pair<String, String>?> {
                        val body = try {
                            fetchString(pageUrl)
                        } catch (_: Exception) {
                            null
                        }
                        if (body != null) body to fallbackCat else null
                    }
                }
                for (f in futures) {
                    val res = try { f.get() } catch (_: Exception) { null }
                    if (res != null) pageResults.add(res)
                }
            } finally {
                pool.shutdown()
            }
        }

        val cardRe = Regex(
            """href="/packages/([A-Za-z0-9._-]+)"[^>]*>([^<]+)</a>.*?<span[^>]*>([A-Za-z0-9._-]+)</span>.*?([A-Za-z ]+)<!-- --> · <!-- -->([0-9A-Za-z._-]+)""",
            setOf(RegexOption.DOT_MATCHES_ALL)
        )
        val iconRe = Regex("/api/icons/([a-f0-9]+\\.png)")

        val collected = mutableListOf<TizenAppItem>()
        val seen = HashSet<String>()

        for ((html, fallbackCat) in pageResults) {
            for (m in cardRe.findAll(html)) {
                val pkgId = m.groupValues[1].trim()
                if (!seen.add(pkgId)) continue
                val title = m.groupValues[2].trim()
                    .replace("&#x27;", "'").replace("&#39;", "'").replace("&amp;", "&").replace("&quot;", "\"")
                val rawType = m.groupValues[4].trim()
                val version = m.groupValues[5].trim()

                val idx = m.range.first
                val marker = html.lastIndexOf("flex min-w-0 gap-4", idx)
                val start = if (marker != -1 && (idx - marker) < 2000) marker else maxOf(0, idx - 1600)
                val prefix = html.substring(start, idx)
                val lastIcon = iconRe.findAll(prefix).lastOrNull()?.groupValues?.get(1)
                val iconUrl = if (lastIcon != null) "/api/archive/icon/$lastIcon" else null

                val tLow = title.lowercase()
                val pLow = pkgId.lowercase()
                val rLow = rawType.lowercase()
                val gameKeywords = listOf(
                    "asteroid", "galactica", "game", "2048", "chess", "snake", "solitaire",
                    "puzzle", "arcade", "runner", "flappy", "bird", "tetris", "pacman",
                    "pong", "dino", "shoot", "quiz", "dice", "card", "roulette", "race",
                    "drift", "jump", "brick", "mine", "sudoku", "tic", "space", "mario", "war",
                )
                val productivityKeywords = listOf(
                    "barometer", "altimeter", "calculator", "calc", "timer", "stopwatch",
                    "alarm", "calendar", "note", "memo", "recorder", "weather", "compass",
                    "flashlight", "torch", "translat", "currency", "converter", "unit",
                    "checklist", "task", "todo", "habit", "pomodoro", "reader", "scanner",
                    "assistant", "schedule", "reminder", "finance", "stock", "clock",
                    "worldtime", "fitness", "health", "step", "workout", "heart", "water", "sleep",
                )
                val cat = when {
                    rLow.contains("watch") || pLow.contains("watchface") || fallbackCat == "Watch faces" -> "Watch faces"
                    gameKeywords.any { tLow.contains(it) || pLow.contains(it) } -> "Games"
                    rLow.contains("widget") || rLow.contains("service") ||
                        productivityKeywords.any { tLow.contains(it) || pLow.contains(it) } -> "Productivity apps"
                    else -> fallbackCat
                }
                val palette = gradients[collected.size % gradients.size]
                val pkgExt = if (rLow.contains("native")) ".tpk" else if (cat == "Watch faces" || rLow.contains("web")) ".wgt" else ".tpk"

                collected.add(
                    TizenAppItem(
                        id = pkgId,
                        packageId = pkgId,
                        title = title,
                        developer = rawType.ifBlank { "Tizen Archive" },
                        category = cat,
                        packageType = pkgExt,
                        fileSize = if (version.isNotBlank()) "v$version" else "Archive",
                        fileSizeBytes = 0L,
                        version = version,
                        tizenMin = "Tizen 2.3.2+",
                        compatibility = listOf("Gear S2/S3", "Galaxy Watch", "Watch Active", "Watch3"),
                        description = "Live archived Tizen package fetched from https://tizen-archive.com/ ($pkgId).",
                        highlights = listOf(
                            "Live package from https://tizen-archive.com/",
                            "Real .tpk / .wgt download & sdb push",
                        ),
                        privileges = emptyList(),
                        sha256 = pkgId,
                        iconUrl = iconUrl,
                        sourceUrl = "https://tizen-archive.com/packages/$pkgId",
                        isLiveArchive = true,
                        gradientFrom = palette.first,
                        gradientTo = palette.second,
                        accentColor = palette.third,
                        iconKey = if (cat == "Watch faces") "chronograph" else if (cat == "Games") "orbital2048" else "serverping",
                    )
                )
            }
        }

        if (clean.isEmpty() && collected.isNotEmpty()) {
            cachedFullCatalog = System.currentTimeMillis() to collected
        }

        return collected
    }
}
