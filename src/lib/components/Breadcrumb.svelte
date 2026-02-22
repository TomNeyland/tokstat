<script lang="ts">
  interface Props {
    segments: string[]
    cost: string
    onnavigate: (index: number) => void
  }

  let { segments, cost, onnavigate }: Props = $props()
</script>

<div class="breadcrumb-bar">
  <div class="path">
    {#each segments as seg, i}
      {#if i > 0}
        <span class="sep">&rsaquo;</span>
      {/if}
      <button
        class="segment"
        class:active={i === segments.length - 1}
        onclick={() => onnavigate(i)}
      >
        {seg}
      </button>
    {/each}
  </div>
  <span class="cost">{cost}</span>
</div>

<style>
  .breadcrumb-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    padding: 0 var(--space-4);
  }

  .path {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .segment {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--duration-instant);
    background: none;
    border: none;
    padding: 0;
  }

  .segment:hover {
    color: var(--text-primary);
  }

  .active {
    color: var(--text-primary);
    font-weight: 500;
  }

  .sep {
    color: var(--text-ghost);
    font-size: 14px;
  }

  .cost {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
