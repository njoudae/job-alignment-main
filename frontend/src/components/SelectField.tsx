interface Option {
  label: string;
  value: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | Option>;
  placeholder?: string;
  disabled?: boolean;
}

export default function SelectField({ label, value, onChange, options, placeholder, disabled }: Props) {
  const normalizedOptions: Option[] = options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option,
  );

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">{placeholder ?? 'Select an option'}</option>
        {normalizedOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
