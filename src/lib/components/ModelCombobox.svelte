<script lang="ts">
  import type { ModelPricing } from '../../engine/types'

  interface Props {
    models: ModelPricing[]
    selected: string
    onselect: (modelId: string) => void
  }

  let { models, selected, onselect }: Props = $props()

  let open = $state(false)
  let query = $state('')
  let highlightIndex = $state(0)
  let inputEl = $state<HTMLInputElement | null>(null)
  let listEl = $state<HTMLUListElement | null>(null)

  let filtered = $derived(
    query.length === 0
      ? models
      : models.filter(m =>
          m.model_id.toLowerCase().includes(query.toLowerCase()) ||
          m.provider.toLowerCase().includes(query.toLowerCase())
        )
  )

  let selectedModel = $derived(models.find(m => m.model_id === selected))

  function openDropdown() {
    open = true
    query = ''
    highlightIndex = 0
    // Focus the input after Svelte updates the DOM
    requestAnimationFrame(() => inputEl?.focus())
  }

  function closeDropdown() {
    open = false
    query = ''
  }

  function selectModel(m: ModelPricing) {
    onselect(m.model_id)
    closeDropdown()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      highlightIndex = Math.min(highlightIndex + 1, filtered.length - 1)
      scrollToHighlighted()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      highlightIndex = Math.max(highlightIndex - 1, 0)
      scrollToHighlighted()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlightIndex]) {
        selectModel(filtered[highlightIndex])
      }
    } else if (e.key === 'Escape') {
      closeDropdown()
    }
  }

  function scrollToHighlighted() {
    requestAnimationFrame(() => {
      const item = listEl?.children[highlightIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    })
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.model-combobox')) {
      closeDropdown()
    }
  }

  function formatPrice(outputPer1m: number): string {
    if (outputPer1m >= 1) return `$${outputPer1m.toFixed(2)}/1M`
    return `$${outputPer1m.toFixed(3)}/1M`
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="model-combobox">
  {#if open}
    <input
      bind:this={inputEl}
      class="combobox-input"
      type="text"
      placeholder="Search models..."
      bind:value={query}
      onkeydown={handleKeydown}
    />
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <ul class="dropdown" bind:this={listEl}>
      {#each filtered as m, i (m.model_id)}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li
          class="dropdown-item"
          class:highlighted={i === highlightIndex}
          onmouseenter={() => highlightIndex = i}
          onclick={() => selectModel(m)}
          role="option"
          aria-selected={i === highlightIndex}
        >
          <span class="item-name">{m.model_id}</span>
          <span class="item-meta">
            <span class="item-provider">{m.provider}</span>
            <span class="item-price">{formatPrice(m.output_per_1m)}</span>
          </span>
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="dropdown-empty">No models match</li>
      {/if}
    </ul>
  {:else}
    <button class="combobox-trigger" onclick={openDropdown}>
      <span class="trigger-model">{selected}</span>
      {#if selectedModel}
        <span class="trigger-price">{formatPrice(selectedModel.output_per_1m)}</span>
      {/if}
      <svg class="trigger-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <polyline points="4,6 8,10 12,6" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .model-combobox {
    position: relative;
  }

  .combobox-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    text-align: left;
    transition: border-color var(--duration-instant);
  }

  .combobox-trigger:hover {
    border-color: var(--border-strong);
  }

  .trigger-model {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trigger-price {
    font-size: 10px;
    color: var(--text-tertiary);
    white-space: nowrap;
  }

  .trigger-chevron {
    width: 12px;
    height: 12px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .combobox-input {
    width: 100%;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    background: var(--bg-elevated);
    border: 1px solid var(--accent);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    outline: none;
    box-shadow: var(--shadow-glow);
  }

  .combobox-input::placeholder {
    color: var(--text-tertiary);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    right: 0;
    max-height: 320px;
    overflow-y: auto;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    z-index: 100;
    list-style: none;
    margin: 0;
    padding: var(--space-1) 0;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    transition: background var(--duration-instant);
  }

  .dropdown-item.highlighted {
    background: var(--accent-muted);
  }

  .item-name {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .item-provider {
    font-family: var(--font-body);
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .item-price {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .dropdown-empty {
    padding: var(--space-3);
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: center;
  }
</style>
