<script lang="ts">
  interface Props {
    label: string
    value: string
    delta?: string
    deltaDirection?: 'up' | 'down' | 'neutral'
    accent?: boolean
  }

  let { label, value, delta, deltaDirection, accent = false }: Props = $props()
</script>

<div class="stat-block" class:accent>
  <span class="stat-label">{label}</span>
  <span class="stat-value">{value}</span>
  {#if delta}
    <span
      class="stat-delta"
      class:delta-up={deltaDirection === 'up'}
      class:delta-down={deltaDirection === 'down'}
    >{delta}</span>
  {/if}
</div>

<style>
  .stat-block {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
    min-width: 140px;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .stat-block:hover {
    border-color: var(--border-default);
  }

  .accent {
    border-left: 3px solid var(--accent);
  }

  .stat-label {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .stat-delta {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
  }

  .delta-up { color: var(--thermal-7); }
  .delta-down { color: var(--thermal-2); }
</style>
