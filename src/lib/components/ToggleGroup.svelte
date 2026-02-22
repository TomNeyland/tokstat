<script lang="ts">
  interface Props {
    options: string[]
    value: string
    onchange: (value: string) => void
  }

  let { options, value, onchange }: Props = $props()
</script>

<div class="toggle-group">
  {#each options as opt}
    <button
      class="toggle-option"
      class:active={value === opt}
      onclick={() => onchange(opt)}
    >
      {opt}
    </button>
  {/each}
</div>

<style>
  .toggle-group {
    display: inline-flex;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-0-5);
  }

  .toggle-option {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    padding: var(--space-2) var(--space-4);
    border-radius: calc(var(--radius-md) - 2px);
    transition: color var(--duration-fast) var(--ease-out),
                background var(--duration-fast) var(--ease-out);
    position: relative;
    cursor: pointer;
    white-space: nowrap;
  }

  .toggle-option:hover:not(.active) {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.03);
  }

  .toggle-option.active {
    color: var(--text-primary);
    background: var(--bg-elevated);
    box-shadow: 0 0 0 1px var(--border-default);
  }

  .toggle-option.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 25%;
    right: 25%;
    height: 2px;
    background: var(--accent);
    border-radius: var(--radius-full);
  }
</style>
