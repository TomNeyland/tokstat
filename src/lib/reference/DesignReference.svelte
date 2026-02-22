<script lang="ts">
  import { onMount } from 'svelte'

  const thermal = [
    { stop: 0, hex: '#2E5EAA', label: 'Coldest' },
    { stop: 1, hex: '#3B8BD4', label: 'Cool' },
    { stop: 2, hex: '#47BFA8', label: 'Teal' },
    { stop: 3, hex: '#6BD48E', label: 'Green' },
    { stop: 4, hex: '#B8D44A', label: 'Lime' },
    { stop: 5, hex: '#F0C63A', label: 'Gold' },
    { stop: 6, hex: '#F09A3A', label: 'Orange' },
    { stop: 7, hex: '#EB6E45', label: 'Hot' },
    { stop: 8, hex: '#E04562', label: 'Red' },
    { stop: 9, hex: '#D42B7B', label: 'Hottest' },
  ]

  const basePalette = [
    { token: '--bg-root', hex: '#08080C', label: 'Root' },
    { token: '--bg-surface', hex: '#111116', label: 'Surface' },
    { token: '--bg-elevated', hex: '#1A1A21', label: 'Elevated' },
    { token: '--bg-overlay', hex: '#22222B', label: 'Overlay' },
    { token: '--border-subtle', hex: '#1E1E27', label: 'Border subtle' },
    { token: '--border-default', hex: '#2C2C38', label: 'Border default' },
    { token: '--border-strong', hex: '#3E3E4D', label: 'Border strong' },
    { token: '--text-primary', hex: '#E4E4ED', label: 'Text primary' },
    { token: '--text-secondary', hex: '#8C8CA3', label: 'Text secondary' },
    { token: '--text-tertiary', hex: '#5C5C73', label: 'Text tertiary' },
    { token: '--text-ghost', hex: '#3A3A4D', label: 'Text ghost' },
  ]

  const typeColors = [
    { type: 'string', hex: '#3B8BD4' },
    { type: 'number', hex: '#6BD48E' },
    { type: 'boolean', hex: '#F0C63A' },
    { type: 'object', hex: '#8B7FFF' },
    { type: 'array', hex: '#EB6E45' },
    { type: 'null', hex: '#5C5C73' },
  ]

  const semanticColors = [
    { token: 'weight-schema', hex: '#8B7FFF', label: 'Schema overhead' },
    { token: 'weight-value', hex: '#47BFA8', label: 'Value payload' },
    { token: 'weight-null', hex: '#3A3A4D', label: 'Null waste' },
  ]

  const fillRates = [
    { token: 'fill-full', hex: '#47BFA8', label: 'Full (>80%)', pct: 94 },
    { token: 'fill-partial', hex: '#F0C63A', label: 'Partial (30-80%)', pct: 56 },
    { token: 'fill-sparse', hex: '#F09A3A', label: 'Sparse (5-30%)', pct: 18 },
    { token: 'fill-empty', hex: '#5C5C73', label: 'Empty (<5%)', pct: 3 },
  ]

  const typeScale = [
    { token: 'text-5xl', size: '64px', lh: '1.0', weight: 400, font: 'display', sample: '$1,847' },
    { token: 'text-4xl', size: '48px', lh: '1.05', weight: 400, font: 'display', sample: 'Token Cost' },
    { token: 'text-3xl', size: '36px', lh: '1.1', weight: 400, font: 'display', sample: 'Design System' },
    { token: 'text-2xl', size: '28px', lh: '1.2', weight: 400, font: 'display', sample: 'Section Title' },
    { token: 'text-xl', size: '22px', lh: '1.3', weight: 600, font: 'body', sample: 'Subsection' },
    { token: 'text-lg', size: '18px', lh: '1.5', weight: 500, font: 'body', sample: 'Large body text' },
    { token: 'text-base', size: '15px', lh: '1.6', weight: 400, font: 'body', sample: 'Body text for descriptions and content that needs to be readable at length.' },
    { token: 'text-sm', size: '13px', lh: '1.5', weight: 400, font: 'body', sample: 'Secondary label' },
    { token: 'text-xs', size: '11px', lh: '1.45', weight: 500, font: 'body', sample: 'FINE PRINT' },
  ]

  const monoScale = [
    { token: 'mono-2xl', size: '32px', weight: 700, sample: '4,200' },
    { token: 'mono-xl', size: '24px', weight: 600, sample: '$0.0092' },
    { token: 'mono-lg', size: '18px', weight: 500, sample: 'avg 142 tok' },
    { token: 'mono-base', size: '14px', weight: 400, sample: 'endpoints[].endpoint_phrase' },
    { token: 'mono-sm', size: '12px', weight: 400, sample: 'root > endpoints[] > adverse_events[]' },
    { token: 'mono-xs', size: '11px', weight: 400, sample: 'p95: 280 tok  max: 412 tok' },
  ]

  // Stagger animation state
  let visible = $state(false)
  onMount(() => {
    // Trigger stagger after initial paint
    requestAnimationFrame(() => {
      visible = true
    })
  })

  // Mock data for component demos
  const mockToggleOptions = ['Treemap', 'Sunburst', 'Pack', 'Icicle']
  let activeToggle = $state('Treemap')

  const mockColorModes = ['Cost', 'Fill rate', 'Overhead', 'Depth']
  let activeColorMode = $state('Cost')
</script>

<div class="reference" class:visible>

  <!-- ═══════════════ HERO ═══════════════ -->
  <header class="hero">
    <div class="hero-badge">Design System v0.1</div>
    <h1 class="hero-title">tokstat</h1>
    <p class="hero-subtitle">Visual language for token cost exploration</p>
    <div class="hero-rule"></div>
  </header>

  <!-- ═══════════════ PRINCIPLES ═══════════════ -->
  <section class="section" style="--stagger: 1">
    <h2 class="section-title">Principles</h2>
    <div class="principles-grid">
      <div class="principle-card">
        <span class="principle-number">01</span>
        <h3 class="principle-name">The Data Is the Decoration</h3>
        <p class="principle-desc">UI chrome is invisible. All visual interest comes from the data visualization itself. Color, size, position, and glow communicate data properties.</p>
      </div>
      <div class="principle-card">
        <span class="principle-number">02</span>
        <h3 class="principle-name">Transition Is Understanding</h3>
        <p class="principle-desc">Animated transitions maintain mental continuity. When rectangles morph to arcs, you understand it's the same data from a different angle.</p>
      </div>
      <div class="principle-card">
        <span class="principle-number">03</span>
        <h3 class="principle-name">Cost Has Color</h3>
        <p class="principle-desc">Cool blues to hot magentas. Glance at any view and immediately know where the money burns. Thermal metaphor, everywhere, always.</p>
      </div>
    </div>
  </section>

  <!-- ═══════════════ THERMAL SCALE ═══════════════ -->
  <section class="section" style="--stagger: 2">
    <h2 class="section-title">Thermal Scale</h2>
    <p class="section-desc">The hero of the color system. Maps token cost to color temperature. Cool is cheap. Hot is expensive.</p>

    <div class="thermal-gradient">
      {#each thermal as t, i}
        <div class="thermal-stop" style="--color: {t.hex}; --delay: {i * 40}ms">
          <div class="thermal-swatch"></div>
          <span class="thermal-label">{t.stop}</span>
          <span class="thermal-hex">{t.hex}</span>
        </div>
      {/each}
    </div>

    <!-- Continuous gradient bar -->
    <div class="thermal-bar">
      <div class="thermal-bar-label thermal-bar-label-left">$0.0001/tok</div>
      <div class="thermal-bar-label thermal-bar-label-right">$0.0100/tok</div>
    </div>

    <!-- Glow demo -->
    <div class="glow-demo">
      <p class="glow-demo-label">Glow intensity scales with thermal value</p>
      <div class="glow-row">
        {#each thermal as t, i}
          <div
            class="glow-orb"
            style="
              --color: {t.hex};
              --glow-radius: {8 + i * 2}px;
              --glow-opacity: {0.15 + i * 0.02};
              --delay: {i * 60}ms;
            "
          ></div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ═══════════════ BASE PALETTE ═══════════════ -->
  <section class="section" style="--stagger: 3">
    <h2 class="section-title">Base Palette</h2>
    <p class="section-desc">Blue-black foundation. Slight blue undertone creates depth and pairs with thermal colors.</p>

    <div class="palette-grid">
      {#each basePalette as color, i}
        <div class="palette-swatch" style="--delay: {i * 30}ms">
          <div
            class="palette-color"
            style="background: {color.hex}; {color.token.startsWith('--text') ? `color: ${color.hex}; background: var(--bg-root);` : ''}"
          >
            {#if color.token.startsWith('--text')}
              <span style="color: {color.hex}">Aa</span>
            {/if}
          </div>
          <div class="palette-info">
            <span class="palette-token">{color.token}</span>
            <span class="palette-hex">{color.hex}</span>
            <span class="palette-label">{color.label}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═══════════════ SEMANTIC COLORS ═══════════════ -->
  <section class="section" style="--stagger: 4">
    <h2 class="section-title">Semantic Colors</h2>

    <div class="semantic-group">
      <h3 class="semantic-group-title">Token Weight Decomposition</h3>
      <div class="token-bar-demo">
        <div class="token-bar-track">
          <div class="token-bar-segment" style="width: 38%; background: var(--weight-schema)">
            <span>Schema 38%</span>
          </div>
          <div class="token-bar-segment" style="width: 42%; background: var(--weight-value)">
            <span>Value 42%</span>
          </div>
          <div class="token-bar-segment" style="width: 20%; background: var(--weight-null)">
            <span>Null 20%</span>
          </div>
        </div>
        <div class="semantic-swatches">
          {#each semanticColors as c}
            <div class="semantic-swatch-item">
              <div class="semantic-dot" style="background: {c.hex}"></div>
              <span class="semantic-swatch-label">{c.label}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="semantic-group">
      <h3 class="semantic-group-title">Fill Rate</h3>
      <div class="fill-rate-demos">
        {#each fillRates as fr}
          <div class="fill-rate-row">
            <span class="fill-rate-label">{fr.label}</span>
            <div class="fill-rate-track">
              <div class="fill-rate-bar" style="width: {fr.pct}%; background: {fr.hex}"></div>
            </div>
            <span class="fill-rate-pct" style="color: {fr.hex}">{fr.pct}%</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="semantic-group">
      <h3 class="semantic-group-title">Type Badges</h3>
      <div class="type-badge-row">
        {#each typeColors as tc}
          <span class="type-badge" style="--type-color: {tc.hex}">{tc.type}</span>
        {/each}
      </div>
    </div>
  </section>

  <!-- ═══════════════ TYPOGRAPHY ═══════════════ -->
  <section class="section" style="--stagger: 5">
    <h2 class="section-title">Typography</h2>

    <!-- Font specimens -->
    <div class="font-specimens">
      <div class="font-specimen">
        <span class="font-specimen-label">Instrument Serif — Display</span>
        <p class="font-specimen-sample font-display">
          The cost of your schema,<br/>made visible.
        </p>
        <p class="font-specimen-chars font-display">AaBbCcDdEeFfGg 0123456789 $.,;:</p>
      </div>

      <div class="font-specimen">
        <span class="font-specimen-label">Manrope — Body & UI</span>
        <p class="font-specimen-sample font-body-demo">
          Every field has a price. Every null is waste. Every brace costs tokens.
        </p>
        <p class="font-specimen-chars font-body-demo">AaBbCcDdEeFfGg 0123456789 $.,;:</p>
        <div class="font-weight-strip">
          {#each [200, 300, 400, 500, 600, 700, 800] as w}
            <span style="font-weight: {w}; font-family: var(--font-body); font-size: 14px; color: var(--text-secondary)">
              {w}
            </span>
          {/each}
        </div>
      </div>

      <div class="font-specimen">
        <span class="font-specimen-label">JetBrains Mono — Data</span>
        <p class="font-specimen-sample font-mono-demo">
          endpoints[].mechanism_of_action
        </p>
        <p class="font-specimen-chars font-mono-demo">AaBbCcDdEeFfGg 0Oo1Il $.,;: {"{}"} []</p>
        <div class="font-weight-strip">
          {#each [100, 200, 300, 400, 500, 600, 700, 800] as w}
            <span style="font-weight: {w}; font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary)">
              {w}
            </span>
          {/each}
        </div>
      </div>
    </div>

    <!-- Type scale -->
    <div class="type-scale">
      <h3 class="semantic-group-title">Display & Body Scale</h3>
      {#each typeScale as ts, i}
        <div class="type-scale-row" style="--delay: {i * 40}ms">
          <span class="type-scale-token">{ts.token}</span>
          <span class="type-scale-meta">{ts.size} / {ts.lh}</span>
          <p
            class="type-scale-sample"
            style="
              font-size: {ts.size};
              line-height: {ts.lh};
              font-weight: {ts.weight};
              font-family: var({ts.font === 'display' ? '--font-display' : '--font-body'});
            "
          >
            {ts.sample}
          </p>
        </div>
      {/each}
    </div>

    <div class="type-scale">
      <h3 class="semantic-group-title">Mono Scale</h3>
      {#each monoScale as ms, i}
        <div class="type-scale-row" style="--delay: {i * 40}ms">
          <span class="type-scale-token">{ms.token}</span>
          <span class="type-scale-meta">{ms.size}</span>
          <p
            class="type-scale-sample"
            style="
              font-size: {ms.size};
              font-weight: {ms.weight};
              font-family: var(--font-mono);
              line-height: 1.4;
            "
          >
            {ms.sample}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═══════════════ SPACING ═══════════════ -->
  <section class="section" style="--stagger: 6">
    <h2 class="section-title">Spacing</h2>
    <p class="section-desc">4px base unit.</p>

    <div class="spacing-scale">
      {#each [
        { token: '1', px: 4 },
        { token: '2', px: 8 },
        { token: '3', px: 12 },
        { token: '4', px: 16 },
        { token: '5', px: 20 },
        { token: '6', px: 24 },
        { token: '8', px: 32 },
        { token: '10', px: 40 },
        { token: '12', px: 48 },
        { token: '16', px: 64 },
        { token: '20', px: 80 },
        { token: '24', px: 96 },
      ] as s}
        <div class="spacing-row">
          <span class="spacing-token">--space-{s.token}</span>
          <span class="spacing-px">{s.px}px</span>
          <div class="spacing-bar" style="width: {s.px}px"></div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═══════════════ COMPONENTS ═══════════════ -->
  <section class="section" style="--stagger: 7">
    <h2 class="section-title">Components</h2>

    <!-- Toggle Group -->
    <div class="component-demo">
      <h3 class="component-name">ToggleGroup</h3>
      <p class="component-desc">Segmented control for switching modes.</p>
      <div class="demo-row">
        <div class="toggle-group">
          {#each mockToggleOptions as opt}
            <button
              class="toggle-option"
              class:active={activeToggle === opt}
              onclick={() => activeToggle = opt}
            >
              {opt}
            </button>
          {/each}
        </div>
        <div class="toggle-group">
          {#each mockColorModes as opt}
            <button
              class="toggle-option"
              class:active={activeColorMode === opt}
              onclick={() => activeColorMode = opt}
            >
              {opt}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Stat Block -->
    <div class="component-demo">
      <h3 class="component-name">StatBlock</h3>
      <p class="component-desc">Single statistic with label and optional delta.</p>
      <div class="demo-row">
        <div class="stat-block">
          <span class="stat-label">Total Cost</span>
          <span class="stat-value">$47.20</span>
          <span class="stat-delta stat-delta-up">+12%</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Avg Tokens</span>
          <span class="stat-value">1,847</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Null Waste</span>
          <span class="stat-value">23%</span>
          <span class="stat-delta stat-delta-down">-4%</span>
        </div>
        <div class="stat-block stat-block-accent">
          <span class="stat-label">Files Analyzed</span>
          <span class="stat-value">551</span>
        </div>
      </div>
    </div>

    <!-- Panel -->
    <div class="component-demo">
      <h3 class="component-name">Panel</h3>
      <p class="component-desc">Container with surface background, subtle border.</p>
      <div class="demo-row" style="flex-direction: column; gap: 16px; max-width: 480px;">
        <div class="panel">
          <span class="stat-label">Default Panel</span>
          <p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">Subtle border, surface background, standard padding.</p>
        </div>
        <div class="panel panel-active">
          <span class="stat-label">Active Panel</span>
          <p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">Stronger border, elevated shadow. Used for selected or focused content.</p>
        </div>
        <div class="panel panel-accent">
          <span class="stat-label">Accent Panel</span>
          <p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">Left accent border. Used for contextual emphasis like the detail panel.</p>
        </div>
      </div>
    </div>

    <!-- Breadcrumb -->
    <div class="component-demo">
      <h3 class="component-name">Breadcrumb</h3>
      <p class="component-desc">Navigation trail with cost summary.</p>
      <div class="breadcrumb-bar">
        <div class="breadcrumb-path">
          <span class="breadcrumb-segment">root</span>
          <span class="breadcrumb-sep">&rsaquo;</span>
          <span class="breadcrumb-segment">endpoints[]</span>
          <span class="breadcrumb-sep">&rsaquo;</span>
          <span class="breadcrumb-segment breadcrumb-active">adverse_events[]</span>
        </div>
        <span class="breadcrumb-cost">$0.047/instance</span>
      </div>
    </div>

    <!-- Tooltip preview -->
    <div class="component-demo">
      <h3 class="component-name">Tooltip</h3>
      <p class="component-desc">Hover detail for visualization nodes.</p>
      <div class="tooltip-preview">
        <div class="tooltip-static">
          <div class="tooltip-header">
            <span class="tooltip-title">endpoints[].endpoint_phrase</span>
            <span class="type-badge" style="--type-color: #3B8BD4">string</span>
          </div>
          <span class="tooltip-subtitle">100% fill rate</span>
          <div class="tooltip-divider"></div>
          <div class="tooltip-stats">
            <div class="tooltip-stat">
              <span class="tooltip-stat-label">avg</span>
              <span class="tooltip-stat-value">142 tok</span>
            </div>
            <div class="tooltip-stat">
              <span class="tooltip-stat-label">p95</span>
              <span class="tooltip-stat-value">280 tok</span>
            </div>
            <div class="tooltip-stat">
              <span class="tooltip-stat-label">max</span>
              <span class="tooltip-stat-value">412 tok</span>
            </div>
            <div class="tooltip-stat">
              <span class="tooltip-stat-label">cost</span>
              <span class="tooltip-stat-value">$0.0007</span>
            </div>
          </div>
          <div class="tooltip-divider"></div>
          <div class="tooltip-token-bar">
            <div class="token-bar-track" style="height: 6px;">
              <div class="token-bar-segment" style="width: 22%; background: var(--weight-schema)"></div>
              <div class="token-bar-segment" style="width: 78%; background: var(--weight-value)"></div>
            </div>
            <span style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">78% value payload</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ MOTION ═══════════════ -->
  <section class="section" style="--stagger: 8">
    <h2 class="section-title">Motion</h2>
    <p class="section-desc">Easing curves and duration tokens.</p>

    <div class="motion-grid">
      <div class="motion-demo">
        <span class="motion-label">ease-out</span>
        <span class="motion-meta">cubic-bezier(0.16, 1, 0.3, 1)</span>
        <div class="motion-track">
          <div class="motion-ball" style="animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1)"></div>
        </div>
        <span class="motion-usage">Elements entering</span>
      </div>
      <div class="motion-demo">
        <span class="motion-label">ease-in-out</span>
        <span class="motion-meta">cubic-bezier(0.65, 0, 0.35, 1)</span>
        <div class="motion-track">
          <div class="motion-ball" style="animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1)"></div>
        </div>
        <span class="motion-usage">Layout shifts, morphing</span>
      </div>
      <div class="motion-demo">
        <span class="motion-label">ease-spring</span>
        <span class="motion-meta">cubic-bezier(0.34, 1.56, 0.64, 1)</span>
        <div class="motion-track">
          <div class="motion-ball" style="animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)"></div>
        </div>
        <span class="motion-usage">Playful bounce, toggles</span>
      </div>
    </div>

    <div class="duration-grid">
      {#each [
        { token: 'instant', ms: 50 },
        { token: 'fast', ms: 150 },
        { token: 'normal', ms: 300 },
        { token: 'slow', ms: 500 },
        { token: 'viz', ms: 800 },
      ] as d}
        <div class="duration-demo">
          <span class="duration-label">{d.token}</span>
          <span class="duration-ms">{d.ms}ms</span>
          <div class="duration-bar" style="--width: {(d.ms / 800) * 100}%"></div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ═══════════════ ACCENT ═══════════════ -->
  <section class="section" style="--stagger: 9">
    <h2 class="section-title">Accent</h2>
    <p class="section-desc">Soft violet. Distinct from every thermal stop. For interactive elements only.</p>
    <div class="accent-demos">
      <div class="accent-swatch" style="background: var(--accent)">
        <span>--accent</span>
        <span>#8B7FFF</span>
      </div>
      <div class="accent-swatch" style="background: var(--accent-hover)">
        <span>--accent-hover</span>
        <span>#9D93FF</span>
      </div>
      <div class="accent-swatch" style="background: var(--accent-muted); border: 1px solid var(--border-default)">
        <span style="color: var(--accent)">--accent-muted</span>
        <span style="color: var(--text-tertiary)">10% opacity</span>
      </div>
      <div class="accent-swatch" style="background: var(--accent-strong); border: 1px solid var(--border-default)">
        <span style="color: var(--accent)">--accent-strong</span>
        <span style="color: var(--text-tertiary)">25% opacity</span>
      </div>
    </div>
  </section>

  <!-- ═══════════════ FOOTER ═══════════════ -->
  <footer class="footer">
    <span class="footer-logo">tokstat</span>
    <span class="footer-version">Design System v0.1 — February 2026</span>
  </footer>
</div>

<style>
  /* ═══════════════════════════════════
     REFERENCE PAGE STYLES
     ═══════════════════════════════════ */

  .reference {
    max-width: 1120px;
    margin: 0 auto;
    padding: var(--space-16) var(--space-8);
  }

  /* ─── Stagger animation ─── */
  .reference :global(> *) {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 600ms var(--ease-out), transform 600ms var(--ease-out);
  }

  .reference.visible :global(> *:nth-child(1)) { opacity: 1; transform: none; transition-delay: 0ms; }
  .reference.visible :global(> *:nth-child(2)) { opacity: 1; transform: none; transition-delay: 80ms; }
  .reference.visible :global(> *:nth-child(3)) { opacity: 1; transform: none; transition-delay: 160ms; }
  .reference.visible :global(> *:nth-child(4)) { opacity: 1; transform: none; transition-delay: 240ms; }
  .reference.visible :global(> *:nth-child(5)) { opacity: 1; transform: none; transition-delay: 320ms; }
  .reference.visible :global(> *:nth-child(6)) { opacity: 1; transform: none; transition-delay: 400ms; }
  .reference.visible :global(> *:nth-child(7)) { opacity: 1; transform: none; transition-delay: 480ms; }
  .reference.visible :global(> *:nth-child(8)) { opacity: 1; transform: none; transition-delay: 560ms; }
  .reference.visible :global(> *:nth-child(9)) { opacity: 1; transform: none; transition-delay: 640ms; }
  .reference.visible :global(> *:nth-child(10)) { opacity: 1; transform: none; transition-delay: 720ms; }
  .reference.visible :global(> *:nth-child(11)) { opacity: 1; transform: none; transition-delay: 800ms; }

  /* ─── Hero ─── */
  .hero {
    text-align: center;
    padding-bottom: var(--space-16);
  }

  .hero-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--accent);
    background: var(--accent-muted);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    letter-spacing: 0.04em;
    margin-bottom: var(--space-6);
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: 80px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  }

  .hero-subtitle {
    font-family: var(--font-body);
    font-size: 18px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-bottom: var(--space-10);
  }

  .hero-rule {
    width: 64px;
    height: 2px;
    background: linear-gradient(90deg, var(--thermal-0), var(--thermal-3), var(--thermal-5), var(--thermal-7), var(--thermal-9));
    margin: 0 auto;
    border-radius: var(--radius-full);
  }

  /* ─── Section ─── */
  .section {
    padding: var(--space-16) 0;
    border-top: 1px solid var(--border-subtle);
  }

  .section-title {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 400;
    color: var(--text-primary);
    margin-bottom: var(--space-2);
  }

  .section-desc {
    font-size: 15px;
    color: var(--text-secondary);
    margin-bottom: var(--space-10);
    max-width: 600px;
  }

  /* ─── Principles ─── */
  .principles-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
  }

  .principle-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    transition: border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  .principle-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-md);
  }

  .principle-number {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    display: block;
    margin-bottom: var(--space-3);
  }

  .principle-name {
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-2);
  }

  .principle-desc {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  /* ─── Thermal Scale ─── */
  .thermal-gradient {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .thermal-stop {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1-5);
  }

  .thermal-swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    background: var(--color);
    box-shadow: 0 0 16px color-mix(in srgb, var(--color) 30%, transparent);
    transition: transform var(--duration-fast) var(--ease-spring),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  .thermal-swatch:hover {
    transform: scale(1.08);
    box-shadow: 0 0 24px color-mix(in srgb, var(--color) 50%, transparent);
  }

  .thermal-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .thermal-hex {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .thermal-bar {
    height: 8px;
    border-radius: var(--radius-full);
    background: linear-gradient(
      90deg,
      var(--thermal-0),
      var(--thermal-1),
      var(--thermal-2),
      var(--thermal-3),
      var(--thermal-4),
      var(--thermal-5),
      var(--thermal-6),
      var(--thermal-7),
      var(--thermal-8),
      var(--thermal-9)
    );
    margin: var(--space-6) 0 var(--space-2);
    position: relative;
  }

  .thermal-bar-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    position: absolute;
    bottom: -24px;
  }

  .thermal-bar-label-left { left: 0; }
  .thermal-bar-label-right { right: 0; }

  /* Glow demo */
  .glow-demo {
    margin-top: var(--space-12);
  }

  .glow-demo-label {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-bottom: var(--space-6);
  }

  .glow-row {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: var(--space-10) 0;
  }

  .glow-orb {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color);
    box-shadow:
      0 0 var(--glow-radius) color-mix(in srgb, var(--color) calc(var(--glow-opacity) * 1000%), transparent),
      0 0 calc(var(--glow-radius) * 2) color-mix(in srgb, var(--color) calc(var(--glow-opacity) * 500%), transparent);
    transition: transform var(--duration-fast) var(--ease-spring);
  }

  .glow-orb:hover {
    transform: scale(1.3);
  }

  /* ─── Base Palette ─── */
  .palette-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-3);
  }

  .palette-swatch {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .palette-color {
    width: 100%;
    aspect-ratio: 1.2;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 28px;
    transition: transform var(--duration-fast) var(--ease-spring);
  }

  .palette-color:hover {
    transform: scale(1.04);
  }

  .palette-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .palette-token {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
  }

  .palette-hex {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .palette-label {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  /* ─── Semantic Colors ─── */
  .semantic-group {
    margin-bottom: var(--space-10);
  }

  .semantic-group-title {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--space-4);
  }

  .token-bar-demo {
    max-width: 600px;
  }

  .token-bar-track {
    display: flex;
    height: 12px;
    border-radius: var(--radius-full);
    overflow: hidden;
    gap: 2px;
  }

  .token-bar-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    transition: flex-basis var(--duration-normal) var(--ease-out);
  }

  .token-bar-segment span {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--bg-root);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
  }

  .semantic-swatches {
    display: flex;
    gap: var(--space-6);
    margin-top: var(--space-3);
  }

  .semantic-swatch-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .semantic-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .semantic-swatch-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  /* Fill rate */
  .fill-rate-demos {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 500px;
  }

  .fill-rate-row {
    display: grid;
    grid-template-columns: 140px 1fr 48px;
    align-items: center;
    gap: var(--space-3);
  }

  .fill-rate-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .fill-rate-track {
    height: 6px;
    background: var(--bg-overlay);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .fill-rate-bar {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 600ms var(--ease-out);
  }

  .fill-rate-pct {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    text-align: right;
  }

  /* Type badges */
  .type-badge-row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .type-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--type-color);
    background: color-mix(in srgb, var(--type-color) 12%, transparent);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    transition: background var(--duration-instant);
  }

  .type-badge:hover {
    background: color-mix(in srgb, var(--type-color) 20%, transparent);
  }

  /* ─── Typography ─── */
  .font-specimens {
    display: flex;
    flex-direction: column;
    gap: var(--space-10);
    margin-bottom: var(--space-10);
  }

  .font-specimen {
    padding: var(--space-6);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }

  .font-specimen-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--accent);
    letter-spacing: 0.04em;
    display: block;
    margin-bottom: var(--space-4);
  }

  .font-specimen-sample {
    font-size: 32px;
    line-height: 1.2;
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  }

  .font-specimen-chars {
    font-size: 20px;
    color: var(--text-tertiary);
    letter-spacing: 0.02em;
  }

  .font-display {
    font-family: var(--font-display);
  }

  .font-body-demo {
    font-family: var(--font-body);
  }

  .font-mono-demo {
    font-family: var(--font-mono);
  }

  .font-weight-strip {
    display: flex;
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border-subtle);
  }

  /* Type scale */
  .type-scale {
    margin-bottom: var(--space-10);
  }

  .type-scale-row {
    display: grid;
    grid-template-columns: 100px 80px 1fr;
    align-items: baseline;
    gap: var(--space-4);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .type-scale-token {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .type-scale-meta {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-ghost);
  }

  .type-scale-sample {
    color: var(--text-primary);
  }

  /* ─── Spacing ─── */
  .spacing-scale {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .spacing-row {
    display: grid;
    grid-template-columns: 100px 48px 1fr;
    align-items: center;
    gap: var(--space-3);
    height: 28px;
  }

  .spacing-token {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .spacing-px {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-ghost);
    text-align: right;
  }

  .spacing-bar {
    height: 8px;
    background: var(--accent-muted);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    min-width: 4px;
    transition: width var(--duration-normal) var(--ease-spring);
  }

  /* ─── Components ─── */
  .component-demo {
    margin-bottom: var(--space-12);
  }

  .component-name {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-1);
  }

  .component-desc {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-bottom: var(--space-6);
  }

  .demo-row {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
    align-items: flex-start;
  }

  /* Toggle Group */
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

  /* Stat Block */
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

  .stat-block-accent {
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
  }

  .stat-delta-up { color: var(--thermal-7); }
  .stat-delta-down { color: var(--thermal-2); }

  /* Panel */
  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    box-shadow: var(--shadow-sm);
    transition: border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  .panel-active {
    border-color: var(--border-default);
    box-shadow: var(--shadow-md);
  }

  .panel-accent {
    border-left: 3px solid var(--accent);
  }

  /* Breadcrumb */
  .breadcrumb-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
  }

  .breadcrumb-path {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .breadcrumb-segment {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--duration-instant);
  }

  .breadcrumb-segment:hover {
    color: var(--text-primary);
  }

  .breadcrumb-active {
    color: var(--text-primary);
    font-weight: 500;
  }

  .breadcrumb-sep {
    color: var(--text-ghost);
    font-size: 14px;
  }

  .breadcrumb-cost {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }

  /* Tooltip */
  .tooltip-preview {
    display: flex;
    justify-content: flex-start;
  }

  .tooltip-static {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-lg);
    min-width: 260px;
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-1);
  }

  .tooltip-title {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .tooltip-subtitle {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .tooltip-divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-3) 0;
  }

  .tooltip-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1-5) var(--space-4);
  }

  .tooltip-stat {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .tooltip-stat-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .tooltip-stat-value {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .tooltip-token-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  /* ─── Motion ─── */
  .motion-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
    margin-bottom: var(--space-10);
  }

  .motion-demo {
    display: flex;
    flex-direction: column;
    gap: var(--space-1-5);
  }

  .motion-label {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .motion-meta {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-ghost);
  }

  .motion-track {
    height: 32px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
    margin: var(--space-2) 0;
  }

  .motion-ball {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 12px rgba(139, 127, 255, 0.4);
    animation: motion-slide 2s infinite alternate;
  }

  @keyframes motion-slide {
    0% { left: 8px; }
    100% { left: calc(100% - 24px); }
  }

  .motion-usage {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  /* Duration */
  .duration-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 500px;
  }

  .duration-demo {
    display: grid;
    grid-template-columns: 72px 48px 1fr;
    align-items: center;
    gap: var(--space-3);
  }

  .duration-label {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .duration-ms {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-ghost);
    text-align: right;
  }

  .duration-bar {
    height: 6px;
    background: var(--accent);
    border-radius: var(--radius-full);
    width: var(--width);
    opacity: 0.6;
  }

  /* ─── Accent ─── */
  .accent-demos {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
  }

  .accent-swatch {
    aspect-ratio: 2;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    font-family: var(--font-mono);
    font-size: 11px;
    color: white;
    transition: transform var(--duration-fast) var(--ease-spring);
  }

  .accent-swatch:hover {
    transform: scale(1.03);
  }

  /* ─── Footer ─── */
  .footer {
    padding: var(--space-16) 0 var(--space-8);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .footer-logo {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text-ghost);
  }

  .footer-version {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-ghost);
  }
</style>
