import type { ResultGroup } from '../../types';
import { RESULT_GROUP_LABEL } from '../../types';

const OPTIONS: { value: ResultGroup; activeClass: string }[] = [
  { value: 'trust', activeClass: 'bg-trust-600 text-white ring-trust-600' },
  { value: 'concern', activeClass: 'bg-concern-600 text-white ring-concern-600' },
  { value: 'close', activeClass: 'bg-close-600 text-white ring-close-600' },
];

export function GroupSelector({
  value,
  onChange,
  name,
}: {
  value: ResultGroup;
  onChange: (value: ResultGroup) => void;
  name: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          name={name}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-2 py-2 text-xs font-semibold ring-1 ring-inset transition-colors sm:text-sm ${
            value === opt.value ? opt.activeClass : 'bg-white text-gray-600 ring-gray-300 hover:bg-gray-50'
          }`}
        >
          {RESULT_GROUP_LABEL[opt.value]}
        </button>
      ))}
    </div>
  );
}
