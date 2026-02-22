<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    variant?: 'default' | 'active' | 'accent'
    children: Snippet
  }

  let { variant = 'default', children }: Props = $props()
</script>

<div class="panel" class:active={variant === 'active'} class:accent={variant === 'accent'}>
  {@render children()}
</div>

<style>
  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    box-shadow: var(--shadow-sm);
    transition: border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  .active {
    border-color: var(--border-default);
    box-shadow: var(--shadow-md);
  }

  .accent {
    border-left: 3px solid var(--accent);
  }
</style>
