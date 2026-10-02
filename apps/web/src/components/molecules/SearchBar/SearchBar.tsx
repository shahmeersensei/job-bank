'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { cn } from '@/lib/utils/cn';
import type { SearchBarProps } from './searchBar.types';

export function SearchBar({
  onSearch,
  defaultValue = '',
  placeholder = 'Search…',
  label = 'Search',
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (next: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchRef.current(next.trim()), debounceMs);
  };

  const searchNow = (next: string) => {
    clearTimeout(timer.current);
    onSearchRef.current(next.trim());
  };

  return (
    <form
      role="search"
      className={cn('w-full', className)}
      onSubmit={(event) => {
        event.preventDefault();
        searchNow(value);
      }}
    >
      <Input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          schedule(event.target.value);
        }}
        className="[&::-webkit-search-cancel-button]:hidden"
        startAdornment={<Search aria-hidden="true" />}
        endAdornment={
          value ? (
            <button
              type="button"
              aria-label="Clear search"
              className="text-fg-muted hover:text-fg focus-visible:focus-ring rounded-sm"
              onClick={() => {
                setValue('');
                searchNow('');
              }}
            >
              <X aria-hidden="true" />
            </button>
          ) : null
        }
      />
    </form>
  );
}
