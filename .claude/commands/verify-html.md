---
name: verify-html
description: Use after any build change or before release — verifies the self-contained HTML output works offline with no external dependencies.
---

# Verify HTML

The self-contained HTML is tokstat's core distribution artifact. It must work offline, with no server, no external fetches, no CDN calls at runtime. If you open the file on a plane, it works.

## When to Use

- After changing the build pipeline
- After adding new dependencies
- Before any release
- After modifying how analysis data is embedded

## Process

1. Build the self-contained HTML:
   ```bash
   npx tokstat ./tests/fixtures/**/*.json --out /tmp/tokstat-report.html
   ```

2. Check the file is self-contained:
   ```bash
   # No external script/link/img sources (fonts loaded at generation time, inlined or embedded)
   grep -E '(src|href)="https?://' /tmp/tokstat-report.html
   # Should return nothing
   ```

3. Check the analysis data is embedded:
   ```bash
   # Should find a <script> tag with the analysis JSON
   grep 'tokstat-data' /tmp/tokstat-report.html
   ```

4. Check file size is reasonable:
   ```bash
   ls -lh /tmp/tokstat-report.html
   # Compiled Svelte + D3 + embedded data. Should be under 2MB for typical corpus.
   ```

5. Open in browser with network disabled:
   - Visualization renders
   - All four layout modes work
   - Drill-down works
   - Tooltips appear
   - Color mode switching works
   - No console errors about failed fetches

## Red Flags

- Any `https://` URL in the generated HTML (except in embedded data values)
- File over 5MB (something's wrong — maybe unminified D3)
- Blank page when opened offline
- Console errors on load
