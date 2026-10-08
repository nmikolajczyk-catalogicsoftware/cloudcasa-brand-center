#!/bin/bash
# Run an Illustrator ExtendScript (.jsx) from the terminal (macOS, Adobe Illustrator installed).
#
#   tools/illustrator/run.sh export-variants.jsx OUT_DIR SVG_FILE [SVG_FILE ...]
#   tools/illustrator/run.sh export-spot.jsx     OUT_DIR SVG_FILE [SVG_FILE ...]
#
# Output goes to OUT_DIR/{ai,pdf,png,svg}. macOS asks once to let your terminal control Illustrator
# (System Settings > Privacy & Security > Automation).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
script="$1"; out="$2"; shift 2
[ "$#" -ge 1 ] || { echo "usage: run.sh SCRIPT OUT_DIR SVG_FILE..." >&2; exit 1; }
mkdir -p "$out"/{ai,pdf,png,svg}
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
printf '%s\n' "$@" > "$work/list.txt"
sed -e "s#__LIST__#$work/list.txt#g" -e "s#__OUT__#$(cd "$out" && pwd)#g" "$here/$script" > "$work/job.jsx"
osascript - "$work/job.jsx" <<'APPLESCRIPT'
on run argv
  set p to item 1 of argv
  with timeout of 600 seconds
    tell application "Adobe Illustrator"
      return do javascript (POSIX file p as alias)
    end tell
  end timeout
end run
APPLESCRIPT
