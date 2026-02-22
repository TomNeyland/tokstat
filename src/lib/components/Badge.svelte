<script lang="ts">
  import type { JsonType } from '../../engine/types'

  interface Props {
    type: JsonType
  }

  let { type }: Props = $props()

  const typeTokenMap: Record<JsonType, string> = {
    string: 'var(--type-string)',
    number: 'var(--type-number)',
    boolean: 'var(--type-boolean)',
    object: 'var(--type-object)',
    array: 'var(--type-array)',
    null: 'var(--type-null)',
  }

  let color = $derived(typeTokenMap[type])
</script>

<span class="badge" style="--type-color: {color}">{type}</span>

<style>
  .badge {
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
    line-height: 1;
    white-space: nowrap;
  }

  .badge:hover {
    background: color-mix(in srgb, var(--type-color) 20%, transparent);
  }
</style>
