<script lang="ts">
  import { countIgnoredFields } from '../../engine/ignore'
  import type { AnalysisNode } from '../../engine/types'

  interface Props {
    patterns: string[]
    tree: AnalysisNode
    visible: boolean
    onchange: (patterns: string[]) => void
    onclose: () => void
  }

  let { patterns, tree, visible, onchange, onclose }: Props = $props()

  let inputValue = $state('')

  let ignoredCount = $derived(
    patterns.length > 0 ? countIgnoredFields(tree, patterns) : 0
  )

  function addPattern() {
    const trimmed = inputValue.trim()
    if (trimmed === '') return
    if (patterns.includes(trimmed)) return
    onchange([...patterns, trimmed])
    inputValue = ''
  }

  function removePattern(pattern: string) {
    onchange(patterns.filter(p => p !== pattern))
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPattern()
    }
  }
</script>

{#if visible}
  <div class="ignore-panel">
    <div class="panel-header">
      <div class="title-row">
        <h3 class="panel-title">Ignore Fields</h3>
        <button class="close-btn" onclick={onclose} aria-label="Close ignore panel">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="5" y1="5" x2="15" y2="15" />
            <line x1="15" y1="5" x2="5" y2="15" />
          </svg>
        </button>
      </div>
      <p class="panel-desc">Exclude non-LLM fields by pattern</p>
    </div>

    <div class="input-row">
      <input
        type="text"
        class="pattern-input"
        placeholder="root.metadata.source"
        bind:value={inputValue}
        onkeydown={handleKeydown}
      />
      <button class="add-btn" onclick={addPattern}>Add</button>
    </div>

    {#if patterns.length > 0}
      <div class="pattern-list">
        {#each patterns as pattern}
          <div class="pattern-row">
            <span class="pattern-text">{pattern}</span>
            <button class="remove-btn" onclick={() => removePattern(pattern)} aria-label="Remove pattern {pattern}">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
            </button>
          </div>
        {/each}
      </div>

      <div class="ignored-count">
        Ignoring {ignoredCount} field{ignoredCount === 1 ? '' : 's'}
      </div>
    {:else}
      <div class="empty-state">
        No ignore rules yet. Right-click a node and choose <strong>Ignore this field</strong>.
      </div>
    {/if}
  </div>
{/if}

<style>
  .ignore-panel {
    width: 360px;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
    animation: slide-in var(--duration-normal) var(--ease-out);
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .panel-header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .panel-title {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text-primary);
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--duration-instant), border-color var(--duration-instant);
  }

  .close-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .close-btn svg {
    width: 14px;
    height: 14px;
  }

  .panel-desc {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-top: var(--space-1);
  }

  .input-row {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .pattern-input {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    outline: none;
    transition: border-color var(--duration-instant);
  }

  .pattern-input::placeholder {
    color: var(--text-ghost);
  }

  .pattern-input:focus {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-glow);
  }

  .add-btn {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    color: var(--bg-root);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    transition: background var(--duration-instant);
  }

  .add-btn:hover {
    background: var(--accent-hover);
  }

  .pattern-list {
    display: flex;
    flex-direction: column;
  }

  .pattern-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
    transition: background var(--duration-instant);
  }

  .pattern-row:hover {
    background: var(--bg-elevated);
  }

  .pattern-text {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    word-break: break-all;
  }

  .remove-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--duration-instant), background var(--duration-instant);
  }

  .remove-btn:hover {
    color: var(--thermal-8);
    background: rgba(224, 69, 98, 0.1);
  }

  .remove-btn svg {
    width: 12px;
    height: 12px;
  }

  .ignored-count {
    padding: var(--space-3) var(--space-4);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-subtle);
  }

  .empty-state {
    padding: var(--space-6) var(--space-4);
    font-size: 13px;
    color: var(--text-tertiary);
    line-height: 1.5;
  }

  .empty-state strong {
    color: var(--text-secondary);
  }
</style>
