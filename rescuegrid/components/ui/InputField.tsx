import { InputHTMLAttributes, forwardRef } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={inputId}
          className="font-mono text-[10px] text-orange uppercase tracking-[0.2em]"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2
            bg-surface-3 border-b border-border-dim
            border-l-3 border-l-orange
            font-body text-sm text-ink
            placeholder:text-dim
            focus:outline-none focus:bg-surface-4 focus:border-orange
            transition-colors duration-150
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

InputField.displayName = "InputField";

export default InputField;
