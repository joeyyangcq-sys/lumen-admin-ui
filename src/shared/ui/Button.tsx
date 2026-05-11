import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "bg-bg-subtle text-fg hover:bg-bg-elevated border border-border",
  ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-9 px-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = "Button";
