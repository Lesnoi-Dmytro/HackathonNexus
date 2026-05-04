import * as LabelPrimitive from "@radix-ui/react-label";
import { clsx } from "clsx";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  left?: ReactNode;
  right?: ReactNode;
  inputSize?: "sm" | "md" | "lg";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, id, label, hint, error, left, right, inputSize = "md", disabled, ...props },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div
        className={clsx(
          styles.wrapper,
          inputSize === "sm" && styles.sm,
          inputSize === "lg" && styles.lg,
          error && styles.error,
        )}
      >
        {label && (
          <LabelPrimitive.Root
            htmlFor={inputId}
            className={styles.label}
            data-disabled={disabled ? "" : undefined}
          >
            {label}
          </LabelPrimitive.Root>
        )}

        <div
          className={clsx(styles.inputWrapper, left && styles.hasLeft, right && styles.hasRight)}
        >
          {left && <span className={styles.addonLeft}>{left}</span>}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={clsx(styles.input, className)}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {right && <span className={styles.addonRight}>{right}</span>}
        </div>

        {error ? (
          <span id={`${inputId}-error`} className={styles.errorMessage} role="alert">
            {error}
          </span>
        ) : hint ? (
          <span id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
