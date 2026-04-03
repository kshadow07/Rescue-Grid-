import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "small";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-orange text-black border-none",
  secondary: "bg-transparent text-orange border border-orange",
  ghost: "bg-surface-3 text-muted border border-border-dim",
  danger: "bg-transparent text-alert border border-alert",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "px-6 py-2.5 text-sm",
  small: "px-4 py-1.5 text-xs",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          font-display font-semibold uppercase tracking-[0.15em]
          clip-path-tactical
          transition-all duration-150 hover:opacity-90 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
