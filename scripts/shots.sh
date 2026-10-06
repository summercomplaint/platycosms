#!/bin/bash
# usage: scripts/shots.sh out_dir name=hash [name=hash ...]   (needs `npx vite preview --port 4173` running)
OUT="$1"; shift
EDGE="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
for spec in "$@"; do
  name="${spec%%=*}"; hash="${spec#*=}"
  timeout 150 "$EDGE" --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist \
    --hide-scrollbars --window-size=${W:-1400},${H:-900} --virtual-time-budget=${BUDGET:-12000} \
    --screenshot="$OUT/$name.png" "http://localhost:4173/?stopAfter=${FRAMES:-3}$hash" >/dev/null 2>&1
  echo "$name: $([ -f "$OUT/$name.png" ] && echo ok || echo FAILED)"
done
