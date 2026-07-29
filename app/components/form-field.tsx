import { CircleAlert } from "lucide-react";

// 폼 입력창은 파일마다 따로 정의돼 있었고 에러를 붙일 자리가 없었다. 이 컴포넌트가
// 라벨·입력창·에러를 한 묶음으로 들고 있어서, 어떤 폼이든 error만 넘기면 해당 입력창
// 바로 아래에 같은 모양으로 표시된다.

export function Required() {
  return <span className="text-primary">*</span>;
}

export function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-2 block text-sm font-black text-charcoal">
      {children} {required ? <Required /> : null}
    </span>
  );
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;

  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-bold leading-5 text-red-600">
      <CircleAlert size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function FormBanner({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
      <CircleAlert size={17} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function fieldControlClassName(error?: string, extra = "") {
  const base =
    "w-full rounded-xl border px-4 py-3.5 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400";
  const tone = error
    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
    : "border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary";

  return `${base} ${tone} ${extra}`.trim();
}

type FormFieldProps = {
  name: string;
  label: string;
  error?: string;
  placeholder?: string;
  helper?: string;
  icon?: React.ReactNode;
  suffix?: string;
  type?: string;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  step?: number | string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  autoComplete?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function FormField({
  name,
  label,
  error,
  placeholder,
  helper,
  icon,
  suffix,
  type = "text",
  min,
  max,
  minLength,
  step,
  inputMode,
  autoComplete,
  defaultValue,
  value,
  onChange,
  disabled = false,
  required = false,
  inputRef
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const helperId = `${name}-helper`;

  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        {icon ? <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">{icon}</span> : null}
        <input
          ref={inputRef}
          name={name}
          type={type}
          min={min}
          max={max}
          minLength={minLength}
          step={step}
          inputMode={inputMode}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          placeholder={placeholder}
          className={fieldControlClassName(error, `${icon ? "pl-10" : ""} ${suffix ? "pr-12" : ""} ${disabled ? "bg-slate-50 text-slate-400" : ""}`)}
        />
        {suffix ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{suffix}</span>
        ) : null}
      </div>
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : helper ? (
        <p id={helperId} className="mt-2 text-xs text-slate-500">
          {helper}
        </p>
      ) : null}
    </label>
  );
}
