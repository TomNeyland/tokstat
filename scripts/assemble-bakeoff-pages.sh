#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -lt 3 ]]; then
  cat <<'EOF'
Usage:
  assemble-bakeoff-pages.sh <codex_dist> <other_dist> <output_dir> [codex_label] [other_label]

Creates a GitHub Pages-ready static site with:
  /index.html   (links to both builds)
  /codex/*      (codex build)
  /other/*      (other build)
EOF
  exit $([[ $# -lt 3 ]] && echo 1 || echo 0)
fi

CODEX_DIST="$1"
OTHER_DIST="$2"
OUT_DIR="$3"
CODEX_LABEL="${4:-Codex version}"
OTHER_LABEL="${5:-Other version}"

mkdir -p "$OUT_DIR/codex" "$OUT_DIR/other"
cp -R "$CODEX_DIST"/. "$OUT_DIR/codex/"
cp -R "$OTHER_DIST"/. "$OUT_DIR/other/"

cat >"$OUT_DIR/index.html" <<EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>tokstat bakeoff</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        background: radial-gradient(circle at 20% 0%, #1b2442 0%, #0b0d14 45%, #07080d 100%);
        color: #e8ecff;
      }
      main {
        max-width: 760px;
        margin: 8vh auto;
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 5vw, 40px);
        letter-spacing: -0.03em;
      }
      p { color: #b6bfdc; margin: 0 0 20px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;
      }
      a.card {
        display: block;
        text-decoration: none;
        color: inherit;
        border: 1px solid rgba(168, 181, 255, 0.22);
        background: rgba(18, 21, 33, 0.82);
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 10px 36px rgba(0, 0, 0, 0.28);
      }
      a.card:hover {
        border-color: rgba(168, 181, 255, 0.45);
        background: rgba(24, 29, 45, 0.92);
      }
      .title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
      .path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #98a3cf; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>tokstat bakeoff</h1>
      <p>Static side-by-side deploy with both implementations hosted from one GitHub Pages site.</p>
      <div class="grid">
        <a class="card" href="./codex/">
          <div class="title">${CODEX_LABEL}</div>
          <div class="path">./codex/</div>
        </a>
        <a class="card" href="./other/">
          <div class="title">${OTHER_LABEL}</div>
          <div class="path">./other/</div>
        </a>
      </div>
    </main>
  </body>
  </html>
EOF

touch "$OUT_DIR/.nojekyll"

echo "Assembled Pages artifact at: $OUT_DIR"
