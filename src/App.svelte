<script lang="ts">
  import DesignReference from './lib/reference/DesignReference.svelte'
  import TokstatApp from './lib/tokstat/TokstatApp.svelte'

  const params = new URLSearchParams(window.location.search)
  const showReference = params.has('reference') || params.has('design')
</script>

{#if showReference}
  <DesignReference />
{:else}
  <TokstatApp />
{/if}
