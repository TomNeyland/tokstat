<script lang="ts">
  import type { AnalysisSummary, AnalysisNode } from '../../engine/types'
  import CorpusOverview from './CorpusOverview.svelte'

  type ColorMode = 'Cost' | 'Fill rate' | 'Overhead' | 'Depth'

  interface Props {
    colorMode: ColorMode
    model: string
    collapsed: boolean
    summary: AnalysisSummary
    tree: AnalysisNode
    oncolorchange: (mode: string) => void
    onmodelchange: (model: string) => void
    ontogglecollapse: () => void
    ontogglediet: () => void
    ontoggleignore: () => void
  }

  let {
    colorMode,
    model,
    collapsed,
    summary,
    tree,
    oncolorchange,
    onmodelchange,
    ontogglecollapse,
    ontogglediet,
    ontoggleignore,
  }: Props = $props()

  const colorOptions: ColorMode[] = ['Cost', 'Fill rate', 'Overhead', 'Depth']
  const models = ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-5', 'claude-haiku-3-5']
</script>

<aside class="sidebar" class:collapsed>
  <button class="collapse-btn" onclick={ontogglecollapse} aria-label="Toggle sidebar">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
      {#if collapsed}
        <polyline points="8,4 14,10 8,16" />
      {:else}
        <polyline points="12,4 6,10 12,16" />
      {/if}
    </svg>
  </button>

  {#if !collapsed}
    <div class="section">
      <span class="section-label">Color Mode</span>
      <div class="color-grid">
        {#each colorOptions as opt}
          <button
            class="color-option"
            class:active={colorMode === opt}
            onclick={() => oncolorchange(opt)}
          >
            {opt}
          </button>
        {/each}
      </div>
    </div>

    <div class="section">
      <span class="section-label">Model</span>
      <select class="model-select" value={model} onchange={(e) => onmodelchange(e.currentTarget.value)}>
        {#each models as m}
          <option value={m}>{m}</option>
        {/each}
      </select>
      <span class="model-info">{summary.tokenizer} • {summary.file_count} files</span>
    </div>

    <div class="section button-row">
      <button class="action-btn" onclick={ontogglediet}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M4 10h12M4 6h12M4 14h8" />
        </svg>
        Schema Diet
      </button>
      <button class="action-btn" onclick={ontoggleignore}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <circle cx="10" cy="10" r="7" />
          <line x1="6" y1="6" x2="14" y2="14" />
        </svg>
        Ignore Fields
      </button>
    </div>

    <div class="divider"></div>

    <CorpusOverview {summary} {tree} />
  {/if}
</aside>

<style>
  .sidebar {
    width: 240px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    gap: var(--space-5);
    transition: width var(--duration-normal) var(--ease-out);
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 0;
  }

  .collapsed {
    width: 48px;
    padding: var(--space-2);
    align-items: center;
  }

  .collapse-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--duration-instant), border-color var(--duration-instant);
    flex-shrink: 0;
  }

  .collapse-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .collapse-btn svg {
    width: 16px;
    height: 16px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .section-label {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .color-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
  }

  .color-option {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    padding: var(--space-1-5) var(--space-2);
    border-radius: var(--radius-md);
    background: none;
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    text-align: center;
    transition: color var(--duration-instant),
                background var(--duration-instant),
                border-color var(--duration-instant);
  }

  .color-option:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .color-option.active {
    color: var(--text-primary);
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .model-select {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    outline: none;
  }

  .model-select:focus {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-glow);
  }

  .model-select option {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .model-info {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .button-row {
    gap: var(--space-1);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    text-align: left;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: none;
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: color var(--duration-instant), border-color var(--duration-instant);
  }

  .action-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .divider {
    height: 1px;
    background: var(--border-subtle);
    margin: 0 calc(-1 * var(--space-4));
  }
</style>
