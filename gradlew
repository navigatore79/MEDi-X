#!/usr/bin/env sh
set -eu
APP_HOME=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
GRADLE_VERSION=8.11.1
CACHE_ROOT="${HOME}/.gradle/meditaly-bootstrap"
GRADLE_HOME="${CACHE_ROOT}/gradle-${GRADLE_VERSION}"
GRADLE_BIN="${GRADLE_HOME}/bin/gradle"
if [ ! -x "$GRADLE_BIN" ]; then
  echo "[Meditaly] Gradle ${GRADLE_VERSION} non trovato. Download in corso..."
  mkdir -p "$CACHE_ROOT"
  ZIP="$CACHE_ROOT/gradle-${GRADLE_VERSION}-bin.zip"
  URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
  if command -v curl >/dev/null 2>&1; then curl -L "$URL" -o "$ZIP"; elif command -v wget >/dev/null 2>&1; then wget -O "$ZIP" "$URL"; else echo "Serve curl o wget" >&2; exit 1; fi
  rm -rf "$GRADLE_HOME"
  unzip -q "$ZIP" -d "$CACHE_ROOT"
  rm -f "$ZIP"
fi
exec "$GRADLE_BIN" -p "$APP_HOME" "$@"
