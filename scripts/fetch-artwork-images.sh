#!/bin/bash
# Downloads the Figma-exported artwork renders for the inner pages and converts
# them to web-weight JPEGs. Figma asset URLs expire ~7 days after generation, so
# re-run get_design_context and refresh artwork-image-urls.txt before re-running.
#
# Usage: ./scripts/fetch-artwork-images.sh
# Reads: scripts/artwork-image-urls.txt  (lines of "<id> <url>")
# Writes: public/refrence/artworks/<id>.jpg

set -uo pipefail
cd "$(dirname "$0")/.."

OUT_DIR="public/refrence/artworks"
URLS="scripts/artwork-image-urls.txt"
mkdir -p "$OUT_DIR"

fail=0
while read -r id url; do
  [ -z "${id:-}" ] && continue
  case "$id" in \#*) continue ;; esac

  tmp="$OUT_DIR/.$id.download"
  if ! curl -fsSL -o "$tmp" "$url"; then
    echo "FAIL  $id  (download)"
    rm -f "$tmp"
    fail=1
    continue
  fi

  # Cap the long edge at 1600px — the design renders these at 818px wide, so
  # 1600 still covers 2x displays while cutting the 5MB Figma exports to ~400KB.
  if sips -Z 1600 -s format jpeg -s formatOptions 82 "$tmp" --out "$OUT_DIR/$id.jpg" >/dev/null 2>&1; then
    echo "ok    $id  $(du -h "$OUT_DIR/$id.jpg" | cut -f1)"
  else
    echo "FAIL  $id  (convert)"
    fail=1
  fi
  rm -f "$tmp"
done < "$URLS"

exit $fail
