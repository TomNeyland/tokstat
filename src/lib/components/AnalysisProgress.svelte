<script lang="ts">
  interface Props {
    filesProcessed: number
    totalFiles: number
  }

  let { filesProcessed, totalFiles }: Props = $props()

  let pct = $derived(filesProcessed / totalFiles)
</script>

<div class="progress-container">
  <div class="progress-card">
    <h2 class="heading">Analyzing...</h2>
    <span class="file-count">{filesProcessed} of {totalFiles} files</span>

    <div class="bar-track">
      <div class="bar-fill" style:width="{pct * 100}%">
        <div class="bar-edge"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .progress-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: var(--bg-root);
  }

  .progress-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-12) var(--space-16);
  }

  .heading {
    font-family: var(--font-display);
    font-size: 28px;
    color: var(--text-primary);
    margin: 0;
    font-weight: 400;
  }

  .file-count {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-secondary);
  }

  .bar-track {
    width: 320px;
    height: 6px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      var(--thermal-0) 0%,
      var(--thermal-2) 25%,
      var(--thermal-5) 50%,
      var(--thermal-7) 75%,
      var(--thermal-9) 100%
    );
    position: relative;
    transition: width var(--duration-fast) var(--ease-out);
  }

  .bar-edge {
    position: absolute;
    right: 0;
    top: 0;
    width: 8px;
    height: 100%;
    background: white;
    opacity: 0.4;
    border-radius: var(--radius-sm);
    animation: pulse-edge 1.5s ease-in-out infinite;
  }

  @keyframes pulse-edge {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.6; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar-fill {
      transition: none;
    }
    .bar-edge {
      animation: none;
      opacity: 0.4;
    }
  }
</style>
