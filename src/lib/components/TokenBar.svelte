<script lang="ts">
  interface Props {
    schema: number
    value: number
    nullWaste: number
    height?: number
    showLabels?: boolean
  }

  let { schema, value, nullWaste, height = 12, showLabels = true }: Props = $props()

  let total = $derived(schema + value + nullWaste)
  let schemaPct = $derived((schema / total) * 100)
  let valuePct = $derived((value / total) * 100)
  let nullPct = $derived((nullWaste / total) * 100)
</script>

<div class="token-bar">
  <div class="track" style="height: {height}px">
    <div class="segment schema" style="width: {schemaPct}%">
      {#if showLabels && schemaPct > 12}
        <span>Schema {Math.round(schemaPct)}%</span>
      {/if}
    </div>
    <div class="segment value" style="width: {valuePct}%">
      {#if showLabels && valuePct > 12}
        <span>Value {Math.round(valuePct)}%</span>
      {/if}
    </div>
    {#if nullPct > 0}
      <div class="segment null-waste" style="width: {nullPct}%">
        {#if showLabels && nullPct > 12}
          <span>Null {Math.round(nullPct)}%</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if showLabels}
    <div class="legend">
      <div class="legend-item">
        <div class="legend-dot schema-dot"></div>
        <span>Schema overhead</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot value-dot"></div>
        <span>Value payload</span>
      </div>
      {#if nullPct > 0}
        <div class="legend-item">
          <div class="legend-dot null-dot"></div>
          <span>Null waste</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .token-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .track {
    display: flex;
    border-radius: var(--radius-full);
    overflow: hidden;
    gap: 2px;
  }

  .segment {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    transition: flex-basis var(--duration-normal) var(--ease-out);
  }

  .segment span {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--bg-root);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
  }

  .schema { background: var(--weight-schema); }
  .value { background: var(--weight-value); }
  .null-waste { background: var(--weight-null); }

  .legend {
    display: flex;
    gap: var(--space-6);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .schema-dot { background: var(--weight-schema); }
  .value-dot { background: var(--weight-value); }
  .null-dot { background: var(--weight-null); }
</style>
