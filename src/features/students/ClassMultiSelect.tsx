import { useState } from 'react';
import { Input } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { StdClass } from '../../types';

function classLabel(c: StdClass) {
  return `${c.class_code} ${c.class_name ?? ''}${c.short_name ? ` (${c.short_name})` : ''}`.trim();
}

/** Multi-select picker for กลุ่มเรียน, shared by RegisterPage and MyClassesPage. */
export function ClassMultiSelect({
  classes,
  selectedClassCodes,
  onToggle,
  onAdd,
}: {
  classes: StdClass[];
  selectedClassCodes: string[];
  onToggle: (classCode: string) => void;
  onAdd: (classCode: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();

  const selectedClasses = classes.filter((c) => selectedClassCodes.includes(c.class_code));

  const q = query.trim().toLowerCase();
  const filteredClasses = classes
    .filter((c) => !selectedClassCodes.includes(c.class_code))
    .filter((c) => !q || classLabel(c).toLowerCase().includes(q))
    .sort((a, b) => (a.class_name ?? '').localeCompare(b.class_name ?? ''))
    .slice(0, 50);

  function handleSelect(classCode: string) {
    onAdd(classCode);
    setQuery('');
    setOpen(false);
  }

  async function handleRemove(c: StdClass) {
    const ok = await confirm({
      title: 'เอากลุ่มเรียนนี้ออก',
      description: `ต้องการเอา "${classLabel(c)}" ออกจากกลุ่มเรียนที่ท่านรับผิดชอบใช่หรือไม่?`,
      tone: 'danger',
      confirmText: 'เอาออก',
    });
    if (ok) onToggle(c.class_code);
  }

  return (
    <div>
      {selectedClasses.length > 0 ? (
        <div className="mb-2 space-y-1 rounded-lg bg-gray-50 p-2">
          {selectedClasses.map((c) => (
            <div
              key={c.class_code}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
            >
              <span>{classLabel(c)}</span>
              <button
                type="button"
                onClick={() => handleRemove(c)}
                aria-label={`เอา ${classLabel(c)} ออก`}
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-close-50 hover:text-close-600"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-400">ยังไม่ได้เลือกกลุ่มเรียน</p>
      )}

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="+ เพิ่มกลุ่มเรียนอื่น... (พิมพ์รหัสหรือชื่อกลุ่มเรียนเพื่อค้นหา)"
        />
        {open && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {filteredClasses.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">ไม่พบกลุ่มเรียนที่ตรงกับคำค้นหา</li>
            ) : (
              filteredClasses.map((c) => (
                <li key={c.class_code}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(c.class_code)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                  >
                    {classLabel(c)}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
