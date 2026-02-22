<script lang="ts">
  interface Props {
    onfiles: (files: { name: string; content: string }[]) => void
  }

  let { onfiles }: Props = $props()

  let dragOver = $state(false)
  let selectedFiles = $state<File[]>([])
  let fileInputEl = $state<HTMLInputElement | null>(null)

  let totalSize = $derived(selectedFiles.reduce((sum, f) => sum + f.size, 0))
  let sizeLabel = $derived(
    totalSize < 1024 ? `${totalSize} B`
    : totalSize < 1024 * 1024 ? `${(totalSize / 1024).toFixed(1)} KB`
    : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
  )
  let hasFiles = $derived(selectedFiles.length > 0)

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    dragOver = true
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    dragOver = false
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    const files = Array.from(e.dataTransfer!.files).filter(f => f.name.endsWith('.json'))
    selectedFiles = files
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement
    selectedFiles = Array.from(input.files!)
  }

  function handleSelectClick() {
    fileInputEl!.click()
  }

  function handleAnalyze() {
    const readers = selectedFiles.map(file =>
      file.text().then(content => ({ name: file.name, content }))
    )
    Promise.all(readers).then(onfiles)
  }
</script>

<div class="drop-zone-container">
  <div
    class="drop-zone"
    class:drag-over={dragOver}
    ondragover={handleDragOver}
    ondragenter={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="region"
    aria-label="File drop zone"
  >
    <h1 class="brand">tokstat</h1>
    <p class="subtitle">Drop JSON files to analyze token costs</p>

    {#if !hasFiles}
      <span class="separator">or</span>
      <button class="select-btn" onclick={handleSelectClick}>
        Select Files
      </button>
    {:else}
      <div class="file-info">
        <span class="file-count">{selectedFiles.length} files selected</span>
        <span class="file-size">{sizeLabel}</span>
      </div>
      <button class="analyze-btn" onclick={handleAnalyze}>
        Analyze
      </button>
    {/if}

    <input
      bind:this={fileInputEl}
      type="file"
      accept=".json"
      multiple
      class="hidden-input"
      onchange={handleInputChange}
    />
  </div>
</div>

<style>
  .drop-zone-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: var(--bg-root);
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-16) var(--space-24);
    border: 2px dashed var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    transition: border-color var(--duration-fast) var(--ease-out),
                background var(--duration-fast) var(--ease-out);
  }

  .drop-zone.drag-over {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .brand {
    font-family: var(--font-display);
    font-size: 36px;
    color: var(--text-primary);
    margin: 0;
    font-weight: 400;
  }

  .subtitle {
    font-family: var(--font-body);
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0;
  }

  .separator {
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-tertiary);
  }

  .select-btn {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    color: white;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-6);
    cursor: pointer;
    transition: background var(--duration-instant) var(--ease-out);
  }

  .select-btn:hover {
    background: var(--accent-hover);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-family: var(--font-mono);
    font-size: 14px;
  }

  .file-count {
    color: var(--text-primary);
  }

  .file-size {
    color: var(--text-secondary);
  }

  .analyze-btn {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    color: white;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-8);
    cursor: pointer;
    transition: background var(--duration-instant) var(--ease-out);
  }

  .analyze-btn:hover {
    background: var(--accent-hover);
  }

  .hidden-input {
    display: none;
  }
</style>
