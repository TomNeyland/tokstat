# Start Here

You're picking up tokstat. Here's where things stand and how to get from here to a tool people actually use.

## What exists right now

The vision is documented. The design system is built and running. No engine, no analysis, no visualization code.

**Read these first, in this order:**
1. `CLAUDE.md` — Project rules and the single most important constraint (the UX is the product)
2. `PROJECT_SPEC.md` — What tokstat is, who it's for, what it does
3. `DESIGN.md` — The visual language, cover to cover
4. `docs/ENGINE_SPEC.md` — How the analysis engine works
5. `docs/INSIGHTS_BRAINSTORM.md` — What makes this tool actionable vs. just pretty

**Run the design reference page:**
```bash
npm install && npm run dev
# Open http://localhost:5173
```
This is the design system proof — every color, font, component, and motion pattern. Everything you build must look like it belongs on this page.

## The five phases

Each phase has a clear end state. Each builds on the last. Don't skip ahead — the engine must work before the viz touches it, and the viz must work before insights layer on top.

| Phase | What | End state | Spec |
|---|---|---|---|
| 1 | Engine | `npx tokstat ./data --format json` outputs correct analysis | `docs/PHASE_1_ENGINE.md` |
| 2 | First Light | `npx tokstat ./data` opens browser with a working treemap | `docs/PHASE_2_FIRST_LIGHT.md` |
| 3 | Multi-Viz | All four layouts with animated transitions between them | `docs/PHASE_3_MULTIVIZ.md` |
| 4 | Insights | Actionable recommendations, interaction, drill-down, detail panel | `docs/PHASE_4_INSIGHTS.md` |
| 5 | Ship | `npx tokstat` works for anyone, anywhere, offline | `docs/PHASE_5_SHIP.md` |

## The north star

A user goes from "I know my structured output costs money" to "I know exactly which 5 changes save me 30% and I have the numbers to justify them" in under 60 seconds.

The engine gives them the numbers. The viz makes the numbers spatial and explorable. The insights tell them what to do. The UX makes them want to open the tool in the first place.

If at any point you're choosing between "correct but ugly" and "beautiful but delayed," choose delayed. An ugly tokstat will not be used.
