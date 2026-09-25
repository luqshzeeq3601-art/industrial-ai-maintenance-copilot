import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { controlClass } from "../../lib/styles";

interface FieldShellProps {
  /** Control id; generated when omitted. */
  id?: string;
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  /** Label beside the control (Settings) instead of above it. */
  inline?: boolean;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

/** Visible label, optional hint, and an error announced next to the control. */
function FieldShell({ id: givenId, label, error, hint, required, inline, children }: FieldShellProps) {
  const generated = useId();
  const id = givenId ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={inline ? "grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center" : "space-y-1.5"}>
      <label htmlFor={id} className="block text-meta font-semibold text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      <div className="space-y-1.5 min-w-0">
        {children({ id, describedBy })}
        {hint && !error && (
          <p id={hintId} className="text-meta text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-meta font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

type Common = { label: string; error?: string | null; hint?: string; inline?: boolean };

export function TextField({ id: givenId, label, error, hint, inline, className, required, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={givenId} label={label} error={error} hint={hint} required={required} inline={inline}>
      {({ id, describedBy }) => (
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass, "px-3 placeholder:text-subtle", error && "border-danger", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({ id: givenId, label, error, hint, inline, className, required, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={givenId} label={label} error={error} hint={hint} required={required} inline={inline}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass, "h-auto min-h-24 px-3 py-2 leading-[21px] placeholder:text-subtle", error && "border-danger", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

interface SelectFieldProps extends Common, SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ id: givenId, label, error, hint, inline, options, placeholder, className, required, ...rest }: SelectFieldProps) {
  return (
    <FieldShell id={givenId} label={label} error={error} hint={hint} required={required} inline={inline}>
      {({ id, describedBy }) => (
        <span className="relative block">
          <select
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(controlClass, "appearance-none pl-3 pr-9 cursor-pointer", error && "border-danger", className)}
            {...rest}
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
        </span>
      )}
    </FieldShell>
  );
}
