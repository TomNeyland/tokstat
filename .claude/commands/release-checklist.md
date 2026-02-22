---
name: release-checklist
description: Use when publishing a new version of tokstat to npm — covers version bump, build verification, self-contained HTML check, and publish.
---

# Release Checklist

## Pre-release

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Self-contained HTML works: run `/verify-html`
- [ ] LLM output is useful: run `/verify-llm-output`
- [ ] Design reference page is current: run `/update-reference-page`
- [ ] No uncommitted changes: `git status` is clean
- [ ] CHANGELOG.md updated with what changed

## Version bump

```bash
npm version patch|minor|major
```

- **patch**: Bug fixes, token updates
- **minor**: New viz mode, new insight type, new output format
- **major**: Breaking CLI changes, analysis tree schema changes

## Publish

```bash
npm publish
```

## Post-release

- [ ] `npx tokstat@latest --help` works
- [ ] Install in a clean directory and run on test fixtures
- [ ] Tag the release on GitHub: `git push --tags`

## Model Pricing

If this release includes updated model pricing:
- [ ] Verify pricing matches current provider documentation
- [ ] Check that all supported models have entries
- [ ] Test cost output against manual calculation for at least one model
