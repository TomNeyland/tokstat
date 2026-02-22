// @ts-nocheck
export function formatJsonReport(report) {
  return JSON.stringify(report, null, 2)
}

export function formatLlmReport(report) {
  const { summary, tree, insights } = report
  const lines = []
  lines.push(`tokstat analysis: ${summary.file_count} files, ${summary.model} (${summary.tokenizer})`)
  lines.push('')
  lines.push(`HEADLINE: ${formatUsd(summary.cost_per_instance)}/instance, ${pct(summary.overhead_ratio)} schema overhead, ${pct(summary.null_waste_ratio)} null waste`)
  lines.push('')

  lines.push('TOP SAVINGS:')
  if (insights.length === 0) {
    lines.push('  none detected')
  }
  else {
    insights.slice(0, 5).forEach((insight, index) => {
      lines.push(`  ${index + 1}. ${shortPath(insight.path)} — saves ${fmtTok(insight.savings_tokens)} tok/inst (${formatUsd(insight.savings_usd_per_10k)}/10K)`) 
    })
  }
  lines.push('')

  lines.push('SCHEMA OVERHEAD HOTSPOTS:')
  for (const node of topBy(tree, (n) => n.tokens.schema_overhead, 5, (n) => n.path !== 'root' && n.tokens.total.avg > 0)) {
    const ratio = nRatio(node.tokens.schema_overhead, node.tokens.total.avg)
    lines.push(`  ${shortPath(node.path)} — ${fmtTok(node.tokens.schema_overhead)} schema tok avg (${pct(ratio)} of total)`) 
  }
  if (lines.at(-1) === 'SCHEMA OVERHEAD HOTSPOTS:') {
    lines.push('  none')
  }
  lines.push('')

  lines.push('HIGH WASTE (low fill, high cost):')
  for (const node of topBy(tree, (n) => n.tokens.null_waste + n.tokens.schema_overhead * (1 - n.fill_rate), 5, (n) => n.path !== 'root' && n.fill_rate < 0.6 && n.tokens.total.avg > 0)) {
    lines.push(`  ${shortPath(node.path)} — ${fmtTok(node.tokens.total.avg)} tok avg, ${pct(node.fill_rate)} fill`) 
  }
  if (lines.at(-1) === 'HIGH WASTE (low fill, high cost):') {
    lines.push('  none')
  }
  lines.push('')

  const boilerplate = insights.filter((i) => i.type === 'boilerplate').slice(0, 3)
  lines.push('BOILERPLATE:')
  if (boilerplate.length === 0) {
    lines.push('  none detected')
  }
  else {
    for (const insight of boilerplate) {
      lines.push(`  ${shortPath(insight.path)} — ${insight.message}`)
    }
  }

  return `${lines.join('\n')}\n`
}

export function formatInteractiveStub(report, options = {}) {
  const json = JSON.stringify(report)
  const title = options.title ?? 'tokstat interactive export'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#08080C;color:#E4E4ED;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;padding:24px}
pre{white-space:pre-wrap;background:#111116;border:1px solid #1E1E27;border-radius:12px;padding:16px;max-height:45vh;overflow:auto}
button{background:#8B7FFF;color:#fff;border:0;border-radius:8px;padding:10px 14px;cursor:pointer}
.card{background:#111116;border:1px solid #1E1E27;border-radius:16px;padding:20px;max-width:920px;margin:auto}
small{color:#8C8CA3}
</style>
</head>
<body>
<div class="card">
<h1 style="margin:0 0 8px;font:400 36px/1.05 Georgia,serif">tokstat</h1>
<p style="margin:0 0 16px;color:#8C8CA3">Interactive export shell (v1). The full Svelte UI in this repo can consume this embedded data.</p>
<button id="download">Download analysis JSON</button>
<p><small>Files: ${report.summary.file_count} • ${report.summary.model} • ${report.summary.avg_tokens_per_instance} tok/instance</small></p>
<pre id="summary"></pre>
<script id="tokstat-data" type="application/json">${escapeScript(json)}</script>
<script>
const data = JSON.parse(document.getElementById('tokstat-data').textContent)
document.getElementById('summary').textContent = JSON.stringify(data.summary, null, 2)
document.getElementById('download').onclick = () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'tokstat-analysis.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
window.__TOKSTAT_DATA__ = data
</script>
</div>
</body>
</html>`
}

function topBy(root, metric, limit, predicate) {
  const nodes = []
  walk(root, (node) => {
    if (!predicate || predicate(node)) {
      nodes.push(node)
    }
  })
  return nodes.sort((a, b) => metric(b) - metric(a)).slice(0, limit)
}

function walk(node, fn) {
  fn(node)
  for (const child of node.children ?? []) {
    walk(child, fn)
  }
}

function shortPath(path) {
  return path.replace(/^root\.?/, '') || 'root'
}

function pct(value) {
  return `${Math.round(value * 100)}%`
}

function fmtTok(value) {
  return `${Math.round(value * 10) / 10}`
}

function formatUsd(value) {
  return `$${value >= 100 ? value.toFixed(0) : value >= 1 ? value.toFixed(2) : value.toFixed(4)}`
}

function nRatio(a, b) {
  return b > 0 ? a / b : 0
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeScript(text) {
  return String(text).replaceAll('</script>', '<\\/script>')
}
