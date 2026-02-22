<script lang="ts">
  interface Props {
    rate: number // 0-1
  }

  let { rate }: Props = $props()

  let pct = $derived(Math.round(rate * 100))
  let color = $derived(
    rate > 0.8 ? 'var(--fill-full)' :
    rate > 0.3 ? 'var(--fill-partial)' :
    rate > 0.05 ? 'var(--fill-sparse)' :
    'var(--fill-empty)'
  )
</script>

<div class="fill-rate">
  <div class="track">
    <div class="bar" style="width: {pct}%; background: {color}"></div>
  </div>
  <span class="pct" style="color: {color}">{pct}%</span>
</div>

<style>
  .fill-rate {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .track {
    flex: 1;
    height: 4px;
    background: var(--bg-overlay);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .bar {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 600ms var(--ease-out);
  }

  .pct {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    min-width: 36px;
    text-align: right;
  }
</style>
