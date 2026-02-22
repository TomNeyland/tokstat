# Phase 5: Ship

## Goal

`npx tokstat ./data/**/*.json` works for anyone, on any machine, offline. The tool is a real npm package that people can install and use.

## End state

Someone at a company running structured generation at scale finds tokstat on npm. They `npx tokstat ./outputs/**/*.json`. A browser tab opens. They explore their schema's token economics. They identify $2,000/year in null waste. They close the tab and the HTML file is saved to disk. They email it to their team lead. The team lead opens the HTML file on a plane with no internet. It works.

## What to build, in order

### 1. Self-contained HTML

This is the distribution artifact that makes tokstat special. Not a dashboard that needs a server. Not a web app that needs a URL. A single HTML file with everything inside it.

The HTML file contains:
- The compiled Svelte app (JS, minified)
- The D3 layout code (JS, minified)
- All CSS (inlined, design tokens included)
- The analysis JSON (embedded as a `<script type="application/json">` tag)
- Fonts (subset and embedded as base64, or loaded from CDN at generation time and inlined)

Zero external fetches at runtime. Zero network dependencies. The file works from a `file://` URL.

**Test this rigorously.** Open the generated HTML in a browser with network disabled (airplane mode). Everything must render. Use the `/verify-html` skill.

### 2. npm packaging

The package needs to be installable globally and runnable via `npx`:

```bash
npm install -g tokstat     # global install
npx tokstat ./data/**/*.json  # one-shot via npx
```

Set up `package.json`:
- `bin` field pointing to the CLI entry point
- `files` field including only what's needed (src, compiled output, not fixtures or docs)
- Engine/CLI code transpiled to work on Node 18+
- `js-tiktoken` as a dependency (the tokenizer)
- D3 modules as dependencies (layout algorithms)

### 3. The CLI experience

The CLI should feel polished. When you run `npx tokstat ./data/**/*.json`:

1. Print a brief progress line: "Reading 551 files..."
2. Print: "Analyzing schema..."
3. Print: "Tokenizing (o200k_base)..."
4. Print the summary stats inline (total cost, overhead ratio, top insight)
5. Open the browser
6. Print: "Report saved to ./tokstat-report.html" (or the `--out` path)

No spinners, no emoji, no color unless the terminal supports it. Quiet, professional, informative.

For `--format json` and `--format llm`: output goes to stdout. No progress lines (they'd contaminate the output). Silent execution, clean output.

### 4. Error handling

The engine should fail loudly on bad data (per CLAUDE.md rules), but the CLI wraps the engine and provides useful error messages:

- "No files matched the glob pattern './data/**/*.json'" — the user got the path wrong
- "Failed to parse /path/to/file.json: Unexpected token at position 42" — a file isn't valid JSON
- "Unknown model 'gpt-5'. Available models: gpt-4o, gpt-4o-mini, claude-sonnet-4-5, claude-haiku-4-5" — bad model flag

These aren't fallbacks or graceful degradation. They're useful error messages that tell the user what went wrong and how to fix it.

### 5. Documentation

The README gets updated with:
- Actual screenshots of the tool running on real data (treemap, sunburst, with thermal coloring)
- Real output examples from `--format json` and `--format llm`
- Full CLI usage with all flags
- Supported models table

This is an open-source tool. The README is the landing page. It should make someone want to try it within 10 seconds of landing on the GitHub page. The screenshots do the heavy lifting — the thermal-colored treemap is the hook.

### 6. Polish pass

Go through every interaction and verify it against DESIGN.md:
- Every hover state is instant
- Every transition is smooth
- The thermal scale creates visible contrast on real data
- The noise texture is subtle but present
- The dot grid in the viz area is visible in sparse areas
- Scrollbars match the custom style
- Focus states use the accent glow
- Reduced motion is respected

Run `/design-audit` on every component. Fix every issue.

### 7. Release

See `/release-checklist` skill. The short version:
- Version 0.1.0 (first public release)
- npm publish
- GitHub repo with README, license, and a screenshot in the repo root
- Tag the release

## How to know you're done

1. `npx tokstat@0.1.0 ./path/to/any/json/files/**/*.json` works on a fresh machine with just Node installed.
2. The generated HTML file works offline.
3. Someone who has never seen tokstat can go from `npx tokstat` to "I know what to optimize" in under 2 minutes.
4. You'd put a screenshot of the tool on your portfolio.
