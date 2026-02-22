<script lang="ts">
  import type { AnalysisNode, Insight } from '../../engine/types'
  import Treemap from './Treemap.svelte'
  import Sunburst from './Sunburst.svelte'
  import CirclePack from './CirclePack.svelte'
  import Icicle from './Icicle.svelte'

  type VizMode = 'Treemap' | 'Sunburst' | 'Pack' | 'Icicle'
  type ColorMode = 'Cost' | 'Fill rate' | 'Overhead' | 'Depth'

  interface Props {
    root: AnalysisNode
    vizMode: VizMode
    colorMode: ColorMode
    width: number
    height: number
    insights?: Insight[]
    onhover: (node: AnalysisNode | null, x: number, y: number) => void
    onclick: (node: AnalysisNode) => void
    oncontextmenu?: (node: AnalysisNode, x: number, y: number) => void
  }

  let { root, vizMode, colorMode, width, height, insights = [], onhover, onclick, oncontextmenu }: Props = $props()

  // Track last hovered node for context menu
  let lastHoveredNode = $state<AnalysisNode | null>(null)

  function wrappedHover(node: AnalysisNode | null, x: number, y: number) {
    lastHoveredNode = node
    onhover(node, x, y)
  }

  function handleContextMenu(e: MouseEvent) {
    if (lastHoveredNode && oncontextmenu) {
      e.preventDefault()
      oncontextmenu(lastHoveredNode, e.clientX, e.clientY)
    }
  }

  // ── Transition state ──
  let prevMode = $state<VizMode>(vizMode)
  let transitioning = $state(false)
  let transitionTimer = $state<ReturnType<typeof setTimeout> | null>(null)

  // When vizMode changes, trigger cross-fade
  $effect(() => {
    const newMode = vizMode
    if (newMode !== prevMode && !transitioning) {
      transitioning = true
      if (transitionTimer) clearTimeout(transitionTimer)

      transitionTimer = setTimeout(() => {
        prevMode = newMode
        transitioning = false
        transitionTimer = null
      }, 800)
    }
  })

  let showPrev = $derived(transitioning && prevMode !== vizMode)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="viz-container" oncontextmenu={handleContextMenu}>
  {#if showPrev}
    <div class="viz-layer exiting">
      {#if prevMode === 'Treemap'}
        <Treemap {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {:else if prevMode === 'Sunburst'}
        <Sunburst {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {:else if prevMode === 'Pack'}
        <CirclePack {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {:else if prevMode === 'Icicle'}
        <Icicle {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {/if}
    </div>
  {/if}

  <div class="viz-layer" class:entering={transitioning}>
      {#if vizMode === 'Treemap'}
        <Treemap {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {:else if vizMode === 'Sunburst'}
        <Sunburst {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {:else if vizMode === 'Pack'}
        <CirclePack {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {:else if vizMode === 'Icicle'}
        <Icicle {root} {width} {height} {colorMode} {insights} onhover={wrappedHover} {onclick} />
      {/if}
    </div>
</div>

<style>
  .viz-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .viz-layer {
    position: absolute;
    inset: 0;
  }

  .viz-layer.entering {
    animation: viz-fade-in 800ms var(--ease-in-out) forwards;
  }

  .viz-layer.exiting {
    animation: viz-fade-out 800ms var(--ease-in-out) forwards;
    pointer-events: none;
  }

  @keyframes viz-fade-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes viz-fade-out {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(1.03);
    }
  }

  /* Hide labels during transition for readability */
  .viz-layer.entering :global(text),
  .viz-layer.exiting :global(text) {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .viz-layer.entering,
    .viz-layer.exiting {
      animation: none;
    }
    .viz-layer.entering {
      opacity: 1;
    }
    .viz-layer.exiting {
      opacity: 0;
    }
  }
</style>
