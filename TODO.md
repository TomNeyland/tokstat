# TODO

- Replace heuristic token estimator with `js-tiktoken` full-string attribution (schema/value/null spans).
- Add proper D3-driven transitions/morphing between layouts (current transitions are mostly crossfade-level).
- Add corpus-first ranked bar/list view (top fields) for shallow/wide schemas.
- Add auto/default view recommendation by schema shape (depth/sibling count).
- Finish ignore-rules UX polish (`**`, regex?, presets, validation help text).
- Persist ignore rules + UI preferences (URL/localStorage).
- Add explicit "analysis scope" badge (corpus vs subtree) in main chrome.
- Add per-node "hide vs ignore" distinction in UI copy/actions.
- Add worker cancel/restart protection for rapid repeated uploads/ignore edits.
- Add worker progress bar + file-size-aware progress (not just item count labels).
- Move browser analysis parsing to streaming/chunked path for very large corpora.
- Add CLI -> full interactive app handoff (not just HTML export stub).
- Add real tests for engine stages and fixture expectations.
- Add/import/export ignore pattern sets.
- Improve shallow sunburst legibility further (grouping, ring labels, top-level-only mode).
