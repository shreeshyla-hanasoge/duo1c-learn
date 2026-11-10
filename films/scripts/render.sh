#!/usr/bin/env bash
#
# Render films to ../public/media/concept-films/<id>.mp4, then wire them in.
#
#   ./scripts/render.sh                 # every spec that has no video yet
#   ./scripts/render.sh sd-caching ...  # just these, replacing any existing video
#   ./scripts/render.sh --all           # everything, replacing existing videos
#
# The project is bundled once and the films render three at a time; bundling
# per film made seventy films a two-hour job.
#
# Output is 1280x720 at CRF 28: the player is at most ~700px wide in the
# lesson, and seventy 1080p files would be a heavy thing to keep in the repo.
# Remotion's --scale must land on whole pixels and 2/3 does not, so each film
# renders at full size and ffmpeg scales and compresses it.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="../public/media/concept-films"
mkdir -p "$OUT" out

node --experimental-strip-types scripts/sync.mts 2>/dev/null

all=$(ls src/specs | grep '^sd-.*\.ts$' | sed 's/\.ts$//')
if [[ "${1:-}" == "--all" ]]; then ids="$all"
elif [[ $# -gt 0 ]]; then ids="$*"
else
  ids=""
  for id in $all; do [[ -f "$OUT/$id.mp4" ]] || ids="$ids $id"; done
fi
[[ -z "${ids// /}" ]] && { echo "nothing to render"; exit 0; }

npx remotion bundle --out-dir=out/bundle --log=error >out/bundle.log 2>&1

one() {
  local id="$1"
  if npx remotion render out/bundle "$id" "out/$id.full.mp4" --codec=h264 --crf=16 \
       --concurrency=3 --log=error >"out/$id.log" 2>&1 &&
     ffmpeg -v error -y -i "out/$id.full.mp4" -vf scale=1280:720:flags=lanczos \
       -c:v libx264 -crf 28 -preset medium -pix_fmt yuv420p -movflags +faststart -an \
       "$OUT/$id.mp4" >>"out/$id.log" 2>&1; then
    rm -f "out/$id.full.mp4"
    echo "ok   $id  $(du -k "$OUT/$id.mp4" | cut -f1) kB"
  else
    echo "FAIL $id  (see films/out/$id.log)"
  fi
}
export -f one
export OUT

echo $ids | tr ' ' '\n' | xargs -P 3 -I{} bash -c 'one {}' | tee out/render.txt

node --experimental-strip-types scripts/sync.mts 2>/dev/null
! grep -q '^FAIL' out/render.txt
