import { useEffect, useState } from 'react';
import { Input } from './Form';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

/**
 * Compact single-select, type-to-filter dropdown over a list of {value, label}
 * options. The "all" row at the top emits `allValue` when clicked — pass a
 * non-empty sentinel (not `''`) if the caller needs to distinguish "user
 * deliberately chose to see everything" from "nothing chosen yet".
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  allLabel,
  allValue = '',
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allLabel: string;
  allValue?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Keep the visible text in sync when the value changes from outside (e.g. reset).
  useEffect(() => {
    if (!value) {
      setQuery('');
      return;
    }
    if (value === allValue) {
      setQuery(allLabel);
      return;
    }
    const match = options.find((o) => o.value === value);
    setQuery(match?.label ?? value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => !q || o.label.toLowerCase().includes(q));

  function select(next: SearchableSelectOption) {
    onChange(next.value);
    setQuery(next.label);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select({ value: allValue, label: allLabel })}
              className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-brand-50"
            >
              {allLabel}
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">ไม่พบตัวเลือกที่ตรงกับคำค้นหา</li>
          ) : (
            filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(o)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
