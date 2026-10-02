export interface SearchBarProps {
  /** Called after the user pauses typing (debounced), on Enter, and on clear. */
  onSearch: (query: string) => void;
  defaultValue?: string;
  placeholder?: string;
  /** Accessible name for the search field. */
  label?: string;
  debounceMs?: number;
  className?: string;
}
