<script lang="ts">
  import type { AnalysisNode } from '../../engine/types'

  interface Props {
    node: AnalysisNode
    x: number
    y: number
    visible: boolean
    onignore: (pattern: string) => void
    onclose: () => void
  }

  let { node, x, y, visible, onignore, onclose }: Props = $props()

  function ignoreExact() {
    onignore(node.path)
    onclose()
  }

  function ignoreWildcard() {
    onignore(`**.${node.name}`)
    onclose()
  }

  function handleClickOutside(e: MouseEvent) {
    // Close if clicking outside the menu
    const target = e.target as HTMLElement
    if (!target.closest('.context-menu')) {
      onclose()
    }
  }

  $effect(() => {
    if (visible) {
      document.addEventListener('click', handleClickOutside, { capture: true })
      document.addEventListener('contextmenu', onclose)
      return () => {
        document.removeEventListener('click', handleClickOutside, { capture: true })
        document.removeEventListener('contextmenu', onclose)
      }
    }
  })
</script>

{#if visible}
  <div class="context-menu" style="left: {x}px; top: {y}px;">
    <button class="menu-item" onclick={ignoreExact}>
      Ignore <span class="menu-path">{node.path}</span>
    </button>
    <button class="menu-item" onclick={ignoreWildcard}>
      Ignore all <span class="menu-path">**.{node.name}</span>
    </button>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--space-1);
    min-width: 200px;
    animation: menu-in var(--duration-fast) var(--ease-out);
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    transition: background var(--duration-instant), color var(--duration-instant);
  }

  .menu-item:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .menu-path {
    color: var(--accent);
  }
</style>
