#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -lt 3 ]]; then
  cat <<'EOF'
Usage:
  assemble-bakeoff-pages.sh <codex_dist> <other_dist> <output_dir> [codex_label] [other_label]

Creates a GitHub Pages-ready static site with:
  /index.html   (pitch page linking to both builds)
  /codex/*      (codex build)
  /other/*      (other build)
EOF
  exit $([[ $# -lt 3 ]] && echo 1 || echo 0)
fi

CODEX_DIST="$1"
OTHER_DIST="$2"
OUT_DIR="$3"
CODEX_LABEL="${4:-Codex version}"
OTHER_LABEL="${5:-Claude version}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$OUT_DIR/codex" "$OUT_DIR/other" "$OUT_DIR/img"
cp -R "$CODEX_DIST"/. "$OUT_DIR/codex/"
cp -R "$OTHER_DIST"/. "$OUT_DIR/other/"

# Copy screenshots if they exist
if [[ -d "$SCRIPT_DIR/screenshots" ]]; then
  cp "$SCRIPT_DIR"/screenshots/*.webp "$OUT_DIR/img/" 2>/dev/null || true
fi

cat >"$OUT_DIR/index.html" <<'HTMLEOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>tokstat — see where your tokens go</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      color-scheme: dark;
      --bg-root: #08080C;
      --bg-surface: #111116;
      --bg-elevated: #1A1A21;
      --border-subtle: #1E1E27;
      --border-default: #2C2C38;
      --text-primary: #E4E4ED;
      --text-secondary: #8C8CA3;
      --text-tertiary: #5C5C73;
      --text-ghost: #3A3A4D;
      --accent: #8B7FFF;
      --accent-hover: #9D93FF;
      --accent-muted: rgba(139,127,255,0.10);
      --thermal-0: #2E5EAA;
      --thermal-3: #6BD48E;
      --thermal-5: #F0C63A;
      --thermal-7: #EB6E45;
      --thermal-9: #D42B7B;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: var(--bg-root);
      color: var(--text-primary);
      font-family: 'Manrope', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Noise texture overlay */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 256px;
      pointer-events: none;
      z-index: 9999;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* ── Hero ── */
    .hero {
      padding: 5vh 0 4vh;
      text-align: center;
      position: relative;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: -20vh;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 600px;
      background: radial-gradient(ellipse, rgba(139,127,255,0.06) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-badge {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--accent);
      border: 1px solid rgba(139,127,255,0.25);
      background: var(--accent-muted);
      border-radius: 9999px;
      padding: 6px 16px;
      margin-bottom: 20px;
      letter-spacing: 0.04em;
    }

    h1 {
      font-family: 'Instrument Serif', serif;
      font-weight: 400;
      font-size: clamp(48px, 8vw, 80px);
      line-height: 1.0;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
    }

    h1 span {
      background: linear-gradient(135deg, var(--thermal-0), var(--thermal-3), var(--thermal-5), var(--thermal-7), var(--thermal-9));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-sub {
      font-size: 18px;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 560px;
      margin: 0 auto 24px;
    }

    .hero-cli {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      color: var(--text-primary);
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 12px 24px;
      margin-bottom: 32px;
    }

    .hero-cli .prompt { color: var(--accent); }
    .hero-cli .path { color: var(--thermal-3); }

    /* ── Screenshot ── */
    .screenshot-slot {
      max-width: 960px;
      margin: 0 auto 48px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle);
    }

    .screenshot-slot img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 12px;
    }

    /* ── Features grid ── */
    .features {
      padding: 0 0 80px;
    }

    .features h2 {
      font-family: 'Instrument Serif', serif;
      font-weight: 400;
      font-size: 36px;
      text-align: center;
      margin-bottom: 48px;
      letter-spacing: -0.02em;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .feature-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 24px;
      transition: border-color 0.15s;
    }

    .feature-card:hover {
      border-color: var(--border-default);
    }

    .feature-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      font-size: 20px;
    }

    .feature-card h3 {
      font-family: 'Manrope', sans-serif;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .feature-card p {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    /* ── Thermal bar decoration ── */
    .thermal-bar {
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--thermal-0), var(--thermal-3), var(--thermal-5), var(--thermal-7), var(--thermal-9));
      margin: 80px auto;
      max-width: 200px;
      opacity: 0.5;
    }

    /* ── Viz modes ── */
    .viz-modes {
      padding: 0 0 80px;
      text-align: center;
    }

    .viz-modes h2 {
      font-family: 'Instrument Serif', serif;
      font-weight: 400;
      font-size: 36px;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .viz-modes .subtitle {
      color: var(--text-secondary);
      font-size: 16px;
      max-width: 480px;
      margin: 0 auto 40px;
      line-height: 1.6;
    }

    .mode-pills {
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 40px;
    }

    .mode-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      padding: 8px 20px;
      transition: all 0.15s;
    }

    .mode-pill:nth-child(1) { color: var(--thermal-0); border-color: rgba(46,94,170,0.3); }
    .mode-pill:nth-child(2) { color: var(--thermal-5); border-color: rgba(240,198,58,0.3); }
    .mode-pill:nth-child(3) { color: var(--thermal-3); border-color: rgba(107,212,142,0.3); }
    .mode-pill:nth-child(4) { color: var(--thermal-9); border-color: rgba(212,43,123,0.3); }

    /* ── Insights ── */
    .insights {
      padding: 0 0 80px;
    }

    .insights h2 {
      font-family: 'Instrument Serif', serif;
      font-weight: 400;
      font-size: 36px;
      text-align: center;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .insights .subtitle {
      color: var(--text-secondary);
      font-size: 16px;
      max-width: 520px;
      margin: 0 auto 40px;
      line-height: 1.6;
      text-align: center;
    }

    .insight-list {
      max-width: 640px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .insight-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 16px 20px;
    }

    .insight-severity {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 7px;
      flex-shrink: 0;
    }

    .insight-severity.high { background: var(--thermal-9); box-shadow: 0 0 8px rgba(212,43,123,0.4); }
    .insight-severity.medium { background: var(--thermal-5); box-shadow: 0 0 8px rgba(240,198,58,0.3); }
    .insight-severity.low { background: var(--thermal-0); }

    .insight-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .insight-text strong {
      color: var(--text-primary);
      font-weight: 600;
    }

    /* ── Try it / Bakeoff ── */
    .try-section {
      padding: 0 0 12vh;
      text-align: center;
    }

    .try-section h2 {
      font-family: 'Instrument Serif', serif;
      font-weight: 400;
      font-size: 36px;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .try-section .subtitle {
      color: var(--text-secondary);
      font-size: 16px;
      margin-bottom: 40px;
    }

    .build-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      max-width: 640px;
      margin: 0 auto;
    }

    .build-grid.hero-builds {
      margin-bottom: 0;
    }

    a.build-card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 28px 24px;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }

    a.build-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    a.build-card:first-child::before {
      background: linear-gradient(90deg, var(--thermal-3), var(--thermal-0));
    }

    a.build-card:last-child::before {
      background: linear-gradient(90deg, var(--accent), var(--thermal-5));
    }

    a.build-card:hover {
      border-color: var(--border-default);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }

    a.build-card:hover::before {
      opacity: 1;
    }

    .build-label {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .build-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .build-link {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--accent);
    }

    .build-thumb {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      margin-bottom: 16px;
    }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 40px 0;
      border-top: 1px solid var(--border-subtle);
    }

    footer p {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    footer a {
      color: var(--text-secondary);
      text-decoration: none;
    }

    footer a:hover { color: var(--accent); }
  </style>
</head>
<body>

<div class="container">
  <section class="hero">
    <div class="hero-badge">open source &middot; MIT license</div>
    <h1>See where your<br/><span>tokens go</span></h1>
    <p class="hero-sub">
      You're spending hundreds on structured generation and you have no idea which fields cost what.
      tokstat reads your JSON corpus, tokenizes every field, and shows you exactly where the money goes.
    </p>
    <div class="hero-cli">
      <span class="prompt">$</span> npx tokstat
    </div>

    <div class="screenshot-slot">
      <img src="./img/claude.webp" alt="tokstat circle pack visualization showing per-field token costs" />
    </div>

    <div class="build-grid hero-builds">
HTMLEOF

# Inject the CTA build cards right in the hero
cat >>"$OUT_DIR/index.html" <<EOF
      <a class="build-card" href="./codex/">
        <div class="build-label">${CODEX_LABEL}</div>
        <div class="build-desc">Built with Codex &middot; GPT 5.3</div>
        <div class="build-link">Try it &rarr;</div>
      </a>
      <a class="build-card" href="./other/">
        <div class="build-label">${OTHER_LABEL}</div>
        <div class="build-desc">Built with Claude Code &middot; Opus 4.6</div>
        <div class="build-link">Try it &rarr;</div>
      </a>
EOF

cat >>"$OUT_DIR/index.html" <<'HTMLEOF'
    </div>
  </section>

  <section class="features">
    <h2>Per-field token economics</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(46,94,170,0.12); color: var(--thermal-0);">$</div>
        <h3>Cost per field</h3>
        <p>See exactly how many tokens each field costs — avg, p50, p95 across your entire corpus. Estimated dollar cost per model.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(212,43,123,0.12); color: var(--thermal-9);">%</div>
        <h3>Fill rate analysis</h3>
        <p>Find fields that are null 60%+ of the time. You're paying for the field name and null literal every time — pure waste.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(139,127,255,0.12); color: var(--accent);">{}</div>
        <h3>Schema overhead</h3>
        <p>Field names, braces, brackets, colons, commas — structural tokens you pay for every instance. tokstat shows exactly how much.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(107,212,142,0.12); color: var(--thermal-3);">[]</div>
        <h3>Array repetition tax</h3>
        <p>Arrays of objects repeat every field name per item. 5 items with 8 fields = 40 field names. tokstat quantifies the cost.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(240,198,58,0.12); color: var(--thermal-5);">&#9881;</div>
        <h3>Multi-model pricing</h3>
        <p>Switch between models instantly. Live pricing from OpenRouter. See how costs change from GPT-4o to Claude to Gemini.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(235,110,69,0.12); color: var(--thermal-7);">&#8644;</div>
        <h3>Schema cohorts</h3>
        <p>Mixed-schema corpus? tokstat auto-detects schema variants and lets you analyze them separately or combined.</p>
      </div>
    </div>
  </section>

  <div class="thermal-bar"></div>

  <section class="viz-modes">
    <h2>Four ways to see your data</h2>
    <p class="subtitle">
      Area shows relative cost. Click any field to drill into its children. Switch views to spot different patterns.
    </p>
    <div class="mode-pills">
      <span class="mode-pill">Treemap</span>
      <span class="mode-pill">Sunburst</span>
      <span class="mode-pill">Circle Pack</span>
      <span class="mode-pill">Icicle</span>
    </div>
    <div class="screenshot-slot">
      <img src="./img/codex.webp" alt="tokstat alternate implementation with circle pack and cohort detection" />
    </div>
  </section>

  <div class="thermal-bar"></div>

  <section class="insights">
    <h2>Automatic insights</h2>
    <p class="subtitle">
      tokstat scans your schema and flags the highest-impact optimization opportunities — no manual analysis needed.
    </p>
    <div class="insight-list">
      <div class="insight-item">
        <div class="insight-severity high"></div>
        <div class="insight-text"><strong>cast[].awards[]</strong> repeats 3 field names per item &times; 2.8 items avg, costing 96 tokens in repetition</div>
      </div>
      <div class="insight-item">
        <div class="insight-severity high"></div>
        <div class="insight-text"><strong>reviews[].summary</strong> is null 35% of the time — making it optional saves 14 tok/instance</div>
      </div>
      <div class="insight-item">
        <div class="insight-severity medium"></div>
        <div class="insight-text"><strong>box_office</strong> is 68% structural overhead — 17 of 25 tokens are field names and braces</div>
      </div>
      <div class="insight-item">
        <div class="insight-severity low"></div>
        <div class="insight-text"><strong>genre</strong> has 5 unique values across 13 instances — consider replacing with an enum</div>
      </div>
    </div>
  </section>

  <div class="thermal-bar"></div>

  <section class="try-section">
    <h2>Try it now</h2>
    <p class="subtitle">Two implementations, built in parallel. Pick one and explore.</p>
    <div class="build-grid">
HTMLEOF

# Inject the dynamic labels into the build cards
cat >>"$OUT_DIR/index.html" <<EOF
      <a class="build-card" href="./codex/">
        <img class="build-thumb" src="./img/codex.webp" alt="${CODEX_LABEL} screenshot" />
        <div class="build-label">${CODEX_LABEL}</div>
        <div class="build-desc">Built with Codex. Full interactive visualization with analysis engine.</div>
        <div class="build-link">Open &rarr;</div>
      </a>
      <a class="build-card" href="./other/">
        <img class="build-thumb" src="./img/claude.webp" alt="${OTHER_LABEL} screenshot" />
        <div class="build-label">${OTHER_LABEL}</div>
        <div class="build-desc">Built with Claude Code. Full interactive visualization with analysis engine.</div>
        <div class="build-link">Open &rarr;</div>
      </a>
EOF

cat >>"$OUT_DIR/index.html" <<'HTMLEOF'
    </div>
  </section>
</div>

<footer>
  <div class="container">
    <p><a href="https://github.com/TomNeyland/tokstat">tokstat</a> &middot; MIT License</p>
  </div>
</footer>

</body>
</html>
HTMLEOF

touch "$OUT_DIR/.nojekyll"

echo "Assembled Pages artifact at: $OUT_DIR"
