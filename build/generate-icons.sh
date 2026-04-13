#!/usr/bin/env bash
# Generate platform icons from icon.svg using ImageMagick or rsvg-convert.
# Run inside the dev container or on a host with these tools installed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SVG="${SCRIPT_DIR}/icon.svg"

if command -v rsvg-convert >/dev/null 2>&1; then
  CONVERT_CMD="rsvg-convert"
elif command -v magick >/dev/null 2>&1; then
  CONVERT_CMD="magick"
elif command -v convert >/dev/null 2>&1; then
  CONVERT_CMD="convert"
else
  echo "Install rsvg-convert or ImageMagick to generate icons."
  exit 1
fi

echo "Generating icon.png (512x512)..."
if [[ "$CONVERT_CMD" == "rsvg-convert" ]]; then
  rsvg-convert -w 512 -h 512 "$SVG" -o "${SCRIPT_DIR}/icon.png"
else
  $CONVERT_CMD "$SVG" -resize 512x512 "${SCRIPT_DIR}/icon.png"
fi

echo "Icon generated at build/icon.png"
echo "For macOS .icns and Windows .ico, use electron-icon-builder or an online converter."
echo "  npm install -g electron-icon-builder"
echo "  electron-icon-builder --input=build/icon.png --output=build"
