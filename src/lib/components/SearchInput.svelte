<script lang="ts">
  interface Props {
    value: string
    placeholder?: string
    oninput: (value: string) => void
  }

  let { value, placeholder = 'Search fields…', oninput }: Props = $props()
</script>

<div class="search-input">
  <svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <line x1="12.5" y1="12.5" x2="17" y2="17" />
  </svg>
  <input
    type="text"
    {value}
    {placeholder}
    oninput={(e) => oninput(e.currentTarget.value)}
  />
</div>

<style>
  .search-input {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    transition: border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  .search-input:focus-within {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-glow);
  }

  .icon {
    width: 16px;
    height: 16px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    min-width: 0;
  }

  input::placeholder {
    color: var(--text-tertiary);
  }
</style>
