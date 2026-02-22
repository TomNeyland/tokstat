# Insights Brainstorm

The difference between "tokstat is a pretty treemap of my JSON" and "tokstat changed how I design schemas" is the insights layer. Without it, a user looks at the visualization and thinks "ok, `endpoints[]` is big and red... so what?" The "so what" is everything.

This document catalogs every insight tokstat could surface, organized by the question it answers, with honest assessments of whether each one is genuinely useful or just clever.

---

## Category 1: Waste Detection

These answer: "Where am I spending money for nothing?"

### 1.1 Null Tax

**What it is.** For every field, compute: (avg tokens when null) x (null rate) x (corpus size) = total tokens wasted on nulls. Rank fields by absolute null waste. Surface the top offenders.

**Why it matters.** In structured output, the LLM still generates `"mechanism_of_action": null` -- you pay for the field name, the colon, the null literal, the comma. If a field is null 80% of the time, you're paying for the structural overhead of that field in 80% of instances with zero information return. This is the single most actionable insight tokstat can provide: "make this field optional in your schema and save $X/month."

**How to surface it.** Dedicated "Waste" view that recolors the treemap by null cost (not total cost). A ranked list in the sidebar: field name, null rate, tokens wasted, dollar cost at selected scale. Each entry has a one-liner: `"mechanism_of_action is null 78% of the time. Making it optional saves 34 tok/instance ($412/10K runs)."` The key number is "savings if optional" -- that is the thing that makes someone actually go change their schema.

**Honest assessment.** Genuinely useful. This is the killer insight. Anyone running structured output at scale has fields that turned out to be rarely populated. They don't know which ones, and they don't know the cost. This is immediate money.

### 1.2 Hollow Objects

**What it is.** Objects or arrays where the structural overhead (braces, field names, commas) exceeds the actual value payload. An object with 8 short fields that are mostly null is "hollow" -- you're paying more for the container than the contents.

**Why it matters.** Hollow objects suggest the schema is over-structured. Maybe those 8 fields should be 3, or maybe the object shouldn't exist and its one useful field should be hoisted to the parent.

**How to surface it.** Overhead ratio metric per node. In the treemap, a color mode where violet = overhead-heavy, teal = value-heavy. Nodes with >70% overhead get a visual indicator (dashed border or a small icon). Tooltip shows: "This object is 73% overhead. 245 of 336 tokens are field names and structural characters."

**Honest assessment.** Useful, but less actionable than null tax. It tells you _something_ is structurally expensive, but "restructure this object" is a bigger ask than "make this field optional." Still worth showing because it catches genuinely wasteful nesting patterns.

### 1.3 Boilerplate Detector

**What it is.** String fields where value entropy is low -- the LLM generates the same or highly similar text across instances. Detected by sampling values and computing text similarity (or simpler: unique value count / instance count ratio).

**Why it matters.** If `study_design_description` is "This was a randomized, double-blind, placebo-controlled trial" in 60% of instances (with minor variations), the LLM is burning tokens to say the same thing over and over. The field could be an enum, a shorter phrase, or eliminated entirely in favor of a `study_design` enum that already captures the same info.

**How to surface it.** "Value diversity" metric: (unique values / total instances). Fields below a threshold (say, 0.1 for strings) are flagged. Show sampled values so the user can see the repetition. Insight text: `"study_design_description has 12 unique values across 551 instances. 68% of values are near-identical. Consider replacing with an enum or shorter field."`

**Honest assessment.** Genuinely useful for anyone who's had an LLM generate structured output -- the model loves to write full sentences in description fields that could be enums. The trick is making the detection robust without being slow (no need for embeddings; substring matching or exact-match ratio is enough for obvious cases). One caveat: this requires actually looking at values, not just token counts. tokstat already collects sample values, so the data is there.

### 1.4 Redundancy Across Sibling Fields

**What it is.** Two or more fields within the same object where values are highly correlated or derivable from each other. Example: `endpoint_phrase` and `endpoint_concept` where `endpoint_concept` is always a substring of `endpoint_phrase`.

**Why it matters.** If field B can be derived from field A in post-processing, generating both is waste.

**How to surface it.** Cross-field correlation analysis at each object level. Flag pairs where one field's value is always a substring of another, or where they have the same set of unique values. This is computationally harder and risks false positives.

**Honest assessment.** Conceptually useful but hard to get right without domain knowledge. "These two fields look correlated" is often obvious to the schema designer and not actionable for someone who doesn't know the domain. Medium priority -- worth flagging but don't oversell it.

---

## Category 2: Structural Economics

These answer: "Is my schema's structure itself costing me money?"

### 2.1 Array Key Repetition Tax

**What it is.** In an array of objects, every field name is repeated for every item. If `endpoints[]` has 12 fields and averages 4.2 items, those 12 field names are emitted 4.2 times each. Compute: (field names token cost) x (avg array length - 1) = the "repetition tax."

**Why it matters.** This is the single biggest structural cost in most LLM-generated JSON. The field names in arrays are pure overhead -- the LLM and consumer both already know the schema. For large arrays, this can be 30-50% of the total array cost. The insight isn't just "arrays are expensive" (everyone knows that) -- it's the specific dollar amount, and the implied savings of alternative formats.

**How to surface it.** Per-array-field metric: "repetition tax = N tokens." At the array level: "Field names repeat 4.2x, costing M tokens/instance. A header+values format would save P%." In the treemap, annotate array nodes with repeating-key icon. In the detail panel, show a breakdown: first instance cost vs. marginal instance cost.

**Honest assessment.** Extremely useful. This is the structural counterpart to the null tax -- a concrete, quantified waste that the user can act on. The action (restructuring to header+rows or using shorter field names within arrays) is non-trivial but clearly worth it at scale. The fact that you can say "this would save 38% on this subtree" makes it actionable.

### 2.2 Schema Overhead Ratio

**What it is.** For the entire output, what percentage of tokens are structural (field names, braces, brackets, colons, commas, quotes) vs. actual content (string values, numbers, booleans)?

**Why it matters.** This is the headline number. "Your schema is 41% overhead" is immediately meaningful. It contextualizes every other insight -- if you're 41% overhead, there's probably room to improve. If you're 15%, your schema is already lean.

**How to surface it.** Hero stat at the top of every view. Big number. Instrument Serif. The thermal scale beneath it makes it visceral -- 15% overhead is cool blue, 50% overhead is glowing red. Contextual comparison: "Typical structured output is 25-40% overhead."

**Honest assessment.** Useful as a headline metric that motivates deeper exploration. Not directly actionable by itself (you can't "fix" a ratio without identifying what's causing it), but it's the number that makes someone say "huh, that's high" and then drill in. Every good tool needs a single top-level number that tells you whether to care. This is that number.

### 2.3 Nesting Depth Cost Curve

**What it is.** Plot: nesting depth (x-axis) vs. cumulative structural overhead (y-axis). Each level of nesting adds braces/brackets plus indentation tokens. Show where the overhead curve steepens.

**Why it matters.** People don't intuit that going from depth 3 to depth 4 might add more overhead than going from depth 1 to depth 2, because deeper objects are often inside arrays (so the nesting cost is multiplied by array cardinality). This visualization makes the non-obvious multiplication visible.

**How to surface it.** A small sparkline or chart in the sidebar when no node is selected. Not a primary view -- supplementary context. "Depth 1-2: 120 tok overhead. Depth 3-4: 480 tok overhead (inside endpoints[], multiplied 4.2x)."

**Honest assessment.** Mildly useful. It's a "huh, interesting" insight more than an "I need to change something" insight. The specific depth where cost spikes is useful to know, but the actionable version is really just "flatten this particular subtree," which the null tax and hollow object detectors already surface. Low priority, but it's cheap to compute and adds texture.

### 2.4 Field Name Verbosity Score

**What it is.** Average token count per field name. Long field names like `mechanism_of_action_detailed_description` cost more than `mechanism` every time they appear, and they appear once per array item.

**Why it matters.** In isolation, shortening a field name saves 1-2 tokens per occurrence. But inside an array of 4.2 items, across 551 files, that's 4,600 extra tokens. At $10/1M output tokens, that's... $0.046. Honestly, not much. But across 20 verbose field names, it adds up. And beyond cost, shorter names make the JSON output faster to generate (fewer output tokens = lower latency).

**How to surface it.** Per-field: show the field name's own token cost vs. the field value's average token cost. Ratio > 0.5 means the field name is costing as much as the field value, which is absurd. Aggregate: "Your average field name is 2.3 tokens. Shortening the 10 longest names to single tokens would save N tokens/instance."

**Honest assessment.** Marginally useful for cost, more useful for latency. The dollar savings are small, but the latency savings matter for real-time applications. Worth showing as a secondary insight, not a headline. And there's a real tradeoff: shorter field names hurt schema readability, which hurts LLM extraction quality. The insight should acknowledge this tension rather than blindly recommending shorter names.

---

## Category 3: Cost Modeling and Projection

These answer: "How much will this cost me at scale?"

### 3.1 Per-Instance Cost Breakdown

**What it is.** For one generation: total tokens, total cost, broken down by top-level field, broken down by schema/value/null. This already exists in the spec but deserves emphasis as an insight.

**Why it matters.** Most people know their total API spend. Almost nobody knows their per-instance structured output cost. "Each paper extraction costs $0.0092 in output tokens" is the baseline number everything else is relative to.

**How to surface it.** Already in the spec. The key addition: make it trivially copyable (one-click copy as a stat line) so people can paste it into cost spreadsheets, Slack messages, planning docs.

**Honest assessment.** Essential. Not "insightful" per se -- it's the core product. But surfacing it clearly and making it shareable is what turns a visualization into a business tool.

### 3.2 Scale Projections

**What it is.** Given your per-instance cost, project: "At 1K / 10K / 100K / 1M generations, this schema costs $X." With a slider for generation volume. Optionally: "at your current rate of N files/day, this is $Y/month, $Z/year."

**Why it matters.** Cost is abstract until it's annualized. "$0.009/instance" sounds like nothing. "$9,200/year at your current rate" sounds like something. The psychological conversion from "meh" to "I should optimize this" happens at scale.

**How to surface it.** A projection panel (always visible or one-click expandable). Slider for volume. Table showing cost at each scale point. Option to input custom rate. The key: also show projected savings for the top 3 insights ("dropping 3 sparse fields saves $1,100/year at current rate").

**Honest assessment.** Very useful. Transforms abstract token counts into budget-line-item numbers. The "projected savings" angle is what makes people actually go optimize -- not "you could save 200 tokens" but "you could save $1,100/year."

### 3.3 Model Comparison

**What it is.** Same corpus analyzed with different tokenizers and different pricing. "Your schema costs $0.0092/instance on GPT-4o vs. $0.0031/instance on GPT-4o-mini vs. $0.0054/instance on Claude Sonnet." Table comparing cost per field across models.

**Why it matters.** People often don't realize that the same JSON has different token counts under different tokenizers (o200k_base vs. cl100k_base vs. Anthropic's tokenizer), and of course different per-token pricing. This helps with model selection for structured output workloads.

**How to surface it.** Multi-model toggle (already partially in the spec as `--model` flag). Show side-by-side or a comparison table. For the visualization, toggle between models and see the treemap recolor -- what was expensive on GPT-4o might be relatively cheaper on a different tokenizer.

**Honest assessment.** Useful for the model selection decision, which happens once and then doesn't change often. Not a daily-use insight, but valuable at decision time. Worth implementing but not as a primary feature. One concern: maintaining up-to-date pricing tables is operational overhead. Ship with a handful of major models and allow `--cost-per-1k` for custom pricing.

---

## Category 4: Schema Design Feedback

These answer: "Is my schema well-designed for LLM generation?"

### 4.1 Schema Injection Cost

**What it is.** Many structured output APIs (OpenAI's response_format, Anthropic's tool use) inject the schema into the prompt as part of the system message. This costs input tokens. tokstat can compute: "Your schema definition is N tokens. At $X/1M input tokens, you're paying $Y per call just to describe the schema."

**Why it matters.** Schema injection cost is invisible -- it's baked into the input tokens and people don't think about it. For complex schemas (1000+ tokens), this can be significant, especially with expensive models. And it's entirely fixed cost -- you pay it whether you generate 1 instance or 1000.

**How to surface it.** Separate stat block: "Schema definition: 847 tokens ($0.004/call on GPT-4o input pricing)." Compare to output cost: "Your schema costs 46% as much as the average output it produces." If the schema is larger than the typical output, that's a design smell.

**Honest assessment.** Genuinely useful and non-obvious. Most people have never calculated their schema injection cost. The "schema is bigger than your output" pathological case is a real thing that happens with over-engineered schemas containing long descriptions and examples. One complication: tokstat needs the schema itself as input, not just the generated JSON. This could work if the user provides a JSON Schema file alongside the corpus, or if tokstat infers the schema and tokenizes the inferred version (less accurate but zero extra input needed).

### 4.2 Enum Utilization

**What it is.** For string fields that appear to be enums (few unique values relative to instance count), show: how many distinct values exist, how many the schema defines (if schema provided), which values are never used.

**Why it matters.** An enum with 15 options where only 3 are ever used means the schema is injecting 12 unnecessary options into the prompt (increasing schema injection cost) and the LLM is choosing from a larger set than needed (slightly reducing accuracy). Trimming the enum saves both input tokens and extraction quality.

**How to surface it.** Per-field detail: "This field uses 3 of 15 defined enum values. The 12 unused values cost N tokens in your schema definition." Only shown when a JSON Schema is provided alongside the corpus.

**Honest assessment.** Useful but requires the schema file, which is an extra input. Without the schema, tokstat can still say "this field has only 3 unique values -- is it an enum? Could it be shorter?" which is still helpful. Medium priority.

### 4.3 Description Length Distribution

**What it is.** For string fields, show the distribution of value lengths (in tokens). Highlight fields with high variance (sometimes 5 tokens, sometimes 500).

**Why it matters.** High variance means the LLM doesn't have clear guidance on how long the value should be. It's generating a paragraph when you wanted a sentence, or a sentence when you expected a paragraph. This wastes tokens and makes downstream processing unpredictable. The fix is adding length guidance to the prompt or schema description.

**How to surface it.** Per-field histogram of value lengths. Flag fields where p95/p50 > 5 (heavy tail). Insight: `"conclusion length varies 10x (p50: 23 tok, p95: 234 tok). Consider adding max_length guidance in your schema description."`

**Honest assessment.** Very useful for prompt engineering. Length variance is a real problem with LLM-generated structured output, and it's invisible unless you measure it. The recommendation (add length guidance) is directly actionable. This also helps identify fields where the LLM is "padding" with filler text to fill a perceived expectation.

---

## Category 5: Diff and Comparison

These answer: "Did my changes help?"

### 5.1 Schema Version Diff

**What it is.** Compare two tokstat analyses (v1 vs. v2 of your schema) and show: which fields were added, removed, or changed; how total cost changed; which specific changes caused the biggest cost delta.

**Why it matters.** This is the "did my optimization work" feedback loop. Without it, someone optimizes their schema, re-runs extraction, and... eyeballs the numbers? Hopes the bill went down? A structured diff closes the loop: "You removed `mechanism_of_action` and shortened `endpoint_phrase` descriptions. Total cost dropped 18%. Specifically, removing mechanism_of_action saved 34 tok/instance; the description shortening saved 12 tok/instance."

**How to surface it.** Diff mode: load two analyses side by side. Or better -- the visualization animates from v1 to v2, with nodes growing/shrinking/appearing/disappearing. Added nodes glow green, removed nodes glow red, changed nodes show delta. A summary panel lists the top 5 changes by cost impact.

**Honest assessment.** This is the insight that makes tokstat a tool you come back to, not a tool you use once. The optimization cycle is: analyze -> change schema -> re-extract -> analyze again. If step 4 can't easily compare to step 1, the loop is broken. High priority. The main challenge is defining "same field" across schema versions (field renaming, structural changes). Path-based matching with fuzzy fallback should handle most cases.

### 5.2 Corpus Subset Comparison

**What it is.** Compare token economics across different subsets of your corpus. Example: "fulltext-extracted papers vs. abstract-only papers" or "RCTs vs. meta-analyses" or "papers with >5 endpoints vs. papers with 1-2."

**Why it matters.** Different input types produce wildly different outputs from the same schema. Fulltext extraction might fill 70% of fields; abstract-only might fill 30%. The cost profile, the null waste profile, the value distribution -- all different. Understanding this helps you decide whether to maintain one schema or split into two.

**How to surface it.** Comparison mode: user selects two subsets (by filename pattern, by a field value, or by manual selection). Show side-by-side treemaps or a delta visualization. Key metrics: "Fulltext: 2,400 avg tok, 18% null waste. Abstract-only: 980 avg tok, 47% null waste."

**Honest assessment.** Useful for anyone with heterogeneous corpora, which is most real-world cases. The challenge is the UI for defining subsets -- it needs to be simple. Filename glob patterns are probably enough for v1. This is a "power user" feature that could be deferred but would be very powerful.

---

## Category 6: Actionable Recommendations

These answer: "What should I do next?"

### 6.1 Schema Diet

**What it is.** A one-click analysis that identifies all fields below a fill rate threshold (e.g., <20%) and computes: "If you made these 7 fields optional or removed them, you'd save N tokens/instance ($X/month at your scale)." Shows the specific fields, their fill rates, their costs, and the total savings.

**Why it matters.** This is the "quick wins" list. Every schema has low-value fields that accreted over time. Nobody goes back to audit them because it's tedious. tokstat makes it one click: "here are your worst performers, here's what you save by cutting them."

**How to surface it.** Prominent button or tab: "Schema Diet." Shows a ranked list of candidates for removal/optionality. Each entry is checkable -- check the ones you want to cut, and the projected savings updates in real time. At the bottom: "Export optimized schema" (if original schema was provided) or "Copy recommendations."

**Honest assessment.** This is the feature that turns tokstat from "interesting" to "I need this." The interactivity -- check fields on/off and see the savings -- makes it tangible. The user is essentially simulating schema changes without actually making them. Very high priority.

### 6.2 Field ROI Ranking

**What it is.** For each field, compute a composite "information per dollar" score combining: fill rate (higher = more informative), value diversity (higher = more informative), token cost (lower = cheaper). Rank fields from best ROI (cheap, always filled, diverse values) to worst ROI (expensive, rarely filled, always the same value).

**Why it matters.** Not all expensive fields are bad (a field that costs 100 tokens but provides unique, valuable information every time is fine). Not all cheap fields are good (a field that costs 5 tokens but is always "N/A" is pure waste). ROI captures both dimensions. The worst-ROI fields are the ones to cut.

**How to surface it.** Sorted table in the sidebar. Each field shows: cost, fill rate, value diversity, ROI score. Color-coded: green rows are high ROI (keep), red rows are low ROI (cut or restructure). Clicking a row highlights the field in the visualization.

**Honest assessment.** Useful but the "ROI" formula is inherently subjective -- what weights do you put on fill rate vs. diversity vs. cost? The formula needs to be transparent and ideally adjustable. If the user can't understand or trust the ranking, they'll ignore it. Show the components, let the user sort by any single dimension, and make the composite score optional. The individual dimensions (fill rate, diversity, cost) are each useful on their own; the composite is a bonus, not the core.

### 6.3 "What If" Simulator

**What it is.** Interactive mode where the user can hypothetically: remove a field (see savings), shorten a field name (see savings), flatten an object (see savings), reduce array cardinality (see savings). All without changing actual data.

**Why it matters.** This is the difference between "information" and "decision support." Instead of "this field costs 34 tokens" you get "removing this field saves $412/10K runs" with a button to toggle it off and see the treemap update. The visualization becomes a planning tool, not just a reporting tool.

**How to surface it.** Right-click or action menu on any node: "Simulate removal", "Simulate shorter name", "Simulate flattening." The treemap updates with a ghost overlay showing the delta. A running total of simulated savings appears in a floating panel.

**Honest assessment.** The most powerful feature in this entire document, but also the most complex to implement. The simulation needs to be accurate (account for structural changes when flattening, comma/brace savings when removing fields, etc.). If done well, this is the reason people tell other people about tokstat. If done poorly (inaccurate estimates, confusing UI), it's worse than not having it. Build it later, build it right.

---

## Category 7: Meta-Insights About LLM Behavior

These answer: "What is the LLM doing that I didn't expect?"

### 7.1 Output Length Anomalies

**What it is.** Flag instances where total token count is significantly above the corpus average. Show which fields are responsible for the spike. "Instance #347 (PMID 29384756) is 4,200 tokens vs. the corpus average of 1,847. The spike is in `endpoints[]` (18 items vs. average 4.2)."

**Why it matters.** Outlier instances are either genuinely complex data (fine) or the LLM going off the rails (bad). Either way, you want to know about them. If it's the LLM misbehaving, you need to fix your prompt or add constraints. If it's genuinely complex data, you need to plan for the cost.

**How to surface it.** "Outliers" tab showing instances ranked by deviation from mean. Click an instance to see its treemap alongside the average treemap. Differences are highlighted.

**Honest assessment.** Useful for quality assurance, not just cost optimization. The LLM going haywire on specific instances is a real problem that's hard to catch without per-instance analysis. The challenge is that tokstat is designed to show aggregates, not individual instances -- this feature requires a different level of granularity. Worth building but it's a second-phase feature.

### 7.2 Fill Rate by Corpus Position

**What it is.** If the corpus has a natural ordering (e.g., by extraction date), plot fill rates over time. Do fields start well-populated and degrade? Does the LLM's behavior change across a long run?

**Why it matters.** LLM extraction quality can drift over a long batch run, especially with rate limiting, context window pressure, or API changes. Seeing fill rates degrade over time suggests the extraction pipeline has a problem.

**Honest assessment.** Niche but genuinely useful for pipeline operators who run large batch extractions. Very few tools surface this. Low implementation cost if instance ordering is preserved. Medium priority.

### 7.3 Required-Field Violation Rate

**What it is.** If a JSON Schema is provided and a field is marked `required`, but tokstat observes it as null in some instances, flag it. "This field is required in your schema but null in 12% of instances -- your structured output validation may have a gap."

**Why it matters.** Structured output APIs sometimes don't enforce required fields as strictly as expected, or the schema definition has inconsistencies. This catches schema/reality mismatches.

**Honest assessment.** Useful but depends on having the schema as input. Without it, tokstat can't know what's "required." And with most structured output APIs now strictly enforcing schemas, this may catch fewer issues than expected. Low priority, easy to implement.

---

## Category 8: The Wild Ideas

### 8.1 Suggested Schema

**What it is.** Based on usage analysis, tokstat generates a leaner version of the schema: removes fields below a fill threshold, shortens verbose field names, flattens hollow objects, suggests enums for low-diversity string fields. Outputs a JSON Schema.

**Why it matters.** This collapses the entire "analyze -> decide -> change" cycle into one step. Instead of manually interpreting insights, you get a concrete schema to try.

**Honest assessment.** Compelling as a concept, dangerous in practice. Schema design involves domain knowledge that tokstat doesn't have. A field with 15% fill rate might be critical for the 15% of cases where it's populated. Auto-suggesting removal is irresponsible without domain context. Better approach: generate a schema _diff_ that lists suggested changes with confidence levels, not an auto-modified schema. "Consider removing: mechanism_of_action (12% fill, $340/10K runs). Consider shortening: endpoint_concept_description (avg 3.1 tok name, 2.4 tok value)." Let the human decide.

### 8.2 Cost Heatmap Over Time

**What it is.** If the user runs tokstat on multiple versions of their corpus (or multiple date-stamped batches), show a heatmap where x = time, y = field, color = cost. Track how per-field costs evolve.

**Why it matters.** Schema evolution is gradual. Fields get added, prompts change, LLM behavior shifts between model versions. A time-series view surfaces gradual cost creep that's invisible in any single snapshot.

**Honest assessment.** Powerful for teams that run extraction pipelines continuously. Requires persistence (tokstat needs to store or receive historical analyses). This is a v2+ feature. For v1, the schema version diff (5.1) covers the most important comparison case.

### 8.3 Compression Ratio

**What it is.** Compare the token count of the raw JSON output vs. what the same information would cost in a more token-efficient format (e.g., YAML, CSV-like, or a custom compact format). "Your JSON costs 1,847 tokens/instance. The same data in a compact format would cost ~1,100 tokens. You're paying a 68% JSON tax."

**Why it matters.** JSON is verbose. It's the standard for structured output because APIs require it, but the verbosity has a real cost. Quantifying the "JSON tax" helps people make informed decisions about whether to post-process into a compact format, or whether the convenience of JSON is worth the premium.

**Honest assessment.** Intellectually interesting but not actionable -- you can't usually change the output format (the API mandates JSON). It's a "fun fact" more than an insight. Skip for v1 unless implementation is trivial.

### 8.4 Token Budget Allocator

**What it is.** Given a target token budget (e.g., "I want to keep each instance under 1,000 tokens"), tokstat identifies which fields to prioritize and which to cut to hit the target. It solves the knapsack problem: maximize information (fill rate x diversity) within a token budget.

**Why it matters.** For real-time applications with latency constraints or max_tokens limits, this directly answers "what do I have to give up to fit in my budget?" Instead of manually testing schema versions, you get an optimal (or near-optimal) configuration.

**Honest assessment.** This is actually great for a specific use case: migrating from a "research" schema to a "production" schema. The research schema captures everything; the production schema needs to fit in fewer tokens. The knapsack framing makes the tradeoff explicit. Worth building, but position it as an advanced feature, not a primary workflow.

### 8.5 Cross-Field Dependency Mapping

**What it is.** Identify which fields are populated together vs. independently. If `confidence_interval.lower` and `confidence_interval.upper` are always both-null or both-populated, they're coupled. If `p_value` is only populated when `point_estimate` is populated, there's a dependency.

**Why it matters.** Understanding field dependencies helps with schema optimization: coupled fields should probably be in the same optional object (so you pay the structural cost only when both are present). Independent fields don't benefit from grouping.

**Honest assessment.** Useful for schema restructuring decisions. The analysis is just a co-occurrence matrix, which is cheap to compute. The visualization could be a small correlation heatmap in the detail panel. Medium priority.

---

## Priority Stack

Ordered by (usefulness x feasibility), descending:

### Must-Have (v1)

1. **Null Tax (1.1)** -- The killer feature. Concrete dollars wasted on null fields.
2. **Schema Overhead Ratio (2.2)** -- The headline number.
3. **Array Key Repetition Tax (2.1)** -- The structural counterpart to null tax.
4. **Scale Projections (3.2)** -- Turns tokens into annual budget numbers.
5. **Schema Diet (6.1)** -- One-click "what can I cut."

### Should-Have (v1.x)

6. **Schema Version Diff (5.1)** -- Closes the optimization feedback loop.
7. **Value Length Distribution (4.3)** -- Catches prompt engineering problems.
8. **Boilerplate Detector (1.3)** -- Catches fields that should be enums.
9. **Field ROI Ranking (6.2)** -- Sorts fields by information per dollar.
10. **Hollow Objects (1.2)** -- Catches over-structured schemas.

### Nice-to-Have (v2)

11. **"What If" Simulator (6.3)** -- The power feature, but complex.
12. **Schema Injection Cost (4.1)** -- Requires schema input.
13. **Corpus Subset Comparison (5.2)** -- Power user feature.
14. **Output Length Anomalies (7.1)** -- QA feature.
15. **Cross-Field Dependency Mapping (8.5)** -- Schema restructuring aid.
16. **Token Budget Allocator (8.4)** -- For schema migration.
17. **Enum Utilization (4.2)** -- Requires schema input.

### Skip or Defer Indefinitely

18. **Compression Ratio (8.3)** -- Not actionable.
19. **Cost Heatmap Over Time (8.2)** -- Requires persistence, v3+ feature.
20. **Fill Rate by Corpus Position (7.2)** -- Niche.
21. **Redundancy Across Siblings (1.4)** -- High false positive risk.
22. **Nesting Depth Cost Curve (2.3)** -- Interesting but not actionable.
23. **Suggested Schema (8.1)** -- Irresponsible without domain knowledge. The diff variant is fine.

---

## How Insights Should Appear in the UI

Insights are not a separate page. They are woven into the visualization experience.

**1. Summary bar.** Across the top, 3-4 hero stats: total cost/instance, overhead ratio, null waste %, and the single most actionable recommendation as a one-line sentence. This is visible in every view. The user's eye hits these first.

**2. Insight annotations on the visualization.** In the treemap/sunburst/etc., nodes that have associated insights get a subtle indicator -- a small icon, a pulsing border, a badge. Clicking the indicator shows the insight in context: "This field is null 78% of the time. Making it optional saves $412/10K runs." The insight lives on the node, not in a separate panel.

**3. Insight panel (optional sidebar section).** Below the detail panel, a "Recommendations" section lists all insights ranked by savings. This is the "Schema Diet" view. It's always there but not in your face -- you pull it up when you want the action list.

**4. In the LLM output format.** `--format llm` already includes "High waste" and "Schema overhead hotspots." Extend it with all must-have insights, formatted for pasting into an LLM conversation: "Here's my tokstat analysis. What schema changes do you recommend?"

**5. In the JSON output format.** `--format json` includes an `insights` array alongside the `tree`. Each insight has: `type`, `field_path`, `severity`, `message`, `savings_tokens`, `savings_usd_per_10k`. This lets CI pipelines gate on cost thresholds.

---

## The North Star

tokstat's insights layer succeeds if a user can go from "I know my structured output costs money" to "I know exactly which 5 changes will save me 30% and I have the numbers to justify them to my team" in under 60 seconds.

That means:
- The top-level view tells you whether to care (overhead ratio, total cost)
- The mid-level view tells you where to look (treemap with insight annotations)
- The detail-level view tells you what to do (specific recommendations with dollar amounts)
- The export gives you the ammunition (copy-pasteable numbers for Slack/docs/LLM conversations)

Every insight that doesn't fit this funnel is intellectual decoration. Pretty, but dead weight.
