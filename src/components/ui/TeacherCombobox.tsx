import { useState } from 'react';
import { Input } from './Form';
import type { Teacher } from '../../types';

/** Compact single-select, type-to-filter combobox for picking a teacher's name. */
export function TeacherCombobox({
  teachers,
  value,
  onChange,
}: {
  teachers: Teacher[];
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = teachers.filter((t) => !q || t.tname.toLowerCase().includes(q)).slice(0, 50);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="พิมพ์ชื่อครูเพื่อค้นหา..."
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">ไม่พบชื่อครูที่ตรงกับคำค้นหา</li>
          ) : (
            filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(t.tname);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                >
                  {t.tname}
                  {t.dep_name ? ` (${t.dep_name})` : ''}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
