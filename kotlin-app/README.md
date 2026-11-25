# wristport (Kotlin JVM + Java Edition)

Real Samsung Galaxy Watch (Tizen OS) SDB sideloader built with **Kotlin JVM 2.0 + Java 17**.

## Requirements
- **Java JDK 17+** (Eclipse Temurin, Microsoft Build of OpenJDK, or Oracle JDK)
- Your real Samsung **SDB** executable (`sdb.exe` + `mgwz.dll` / `AdbWinApi.dll` from Tizen Studio, or Linux `sdb`)

## Quick Start (Windows)
1. Double-click `run-wristport.bat` (bootstraps Gradle automatically if not installed globally, compiles Kotlin + Java, starts `http://127.0.0.1:8765/`, and opens the app).
2. When prompted at startup, drag-and-drop or upload your real `sdb.exe` (or Tizen SDB `.zip`) directly into the workspace (`wristport_data/bin/`).
3. wristport immediately runs `sdb devices` + a parallel TCP port `26101` LAN scan across your active subnet. If no watch responds automatically, enter only the trailing digits of your watch IP (`192.168.1.<digits>`).
4. Browse live apps from `https://tizen-archive.com/`, download real `.tpk` / `.wgt` packages, and install them directly to your watch with `sdb push` + `pkgcmd -i -w`.
