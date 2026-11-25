#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v java >/dev/null 2>&1; then
  echo "[ERROR] Java 17+ is required."
  exit 1
fi

if command -v gradle >/dev/null 2>&1; then
  exec gradle run --no-daemon --console=plain
else
  echo "[ERROR] Install Gradle 8.x or run 'gradle run' in this folder."
  exit 1
fi
