import * as LabelPrimitive from "@radix-ui/react-label";
import * as SelectPrimitive from "@radix-ui/react-select";
import { clsx } from "clsx";
import { type ReactNode } from "react";
import styles from "./Select.module.css";

/* ── Icons (inline SVG, no extra deps) ── */
const ChevronDownIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.5 7l3 3 6-6"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Public option type ── */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label?: string;
  options: SelectOption[];
}

/* ── Main Select props ── */
export interface SelectProps {
  /** Controlled value */
  value?: string;
  /** Uncontrolled default value */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;

  /** Flat list of options */
  options?: SelectOption[];
  /** Grouped options (takes precedence over `options`) */
  groups?: SelectGroup[];

  label?: string;
  hint?: string;
  error?: string;
  selectSize?: "sm" | "md" | "lg";

  /** Portal target — pass `null` to render inline */
  container?: HTMLElement | null;

  className?: string;
  id?: string;

  /** Render extra content at the right of the trigger */
  triggerRight?: ReactNode;
}

function Select({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  disabled,
  options,
  groups,
  label,
  hint,
  error,
  selectSize = "md",
  container,
  className,
  id,
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const resolvedGroups: SelectGroup[] = groups ?? (options ? [{ options }] : []);

  return (
    <div
      className={clsx(
        styles.wrapper,
        selectSize === "sm" && styles.sm,
        selectSize === "lg" && styles.lg,
        error && styles.error,
        className,
      )}
    >
      {label && (
        <LabelPrimitive.Root
          htmlFor={selectId}
          className={styles.label}
          data-disabled={disabled ? "" : undefined}
        >
          {label}
        </LabelPrimitive.Root>
      )}

      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={selectId}
          className={styles.trigger}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        >
          <SelectPrimitive.Value placeholder={placeholder} className={styles.triggerValue} />
          <SelectPrimitive.Icon className={styles.chevron} asChild>
            <ChevronDownIcon />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Content className={styles.content} position="popper" sideOffset={4}>
            <SelectPrimitive.ScrollUpButton className={styles.scrollButton}>
              <ChevronDownIcon />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className={styles.viewport}>
              {resolvedGroups.map((group, gi) => (
                <SelectPrimitive.Group key={gi}>
                  {group.label && (
                    <SelectPrimitive.Label className={styles.groupLabel}>
                      {group.label}
                    </SelectPrimitive.Label>
                  )}

                  {gi > 0 && <SelectPrimitive.Separator className={styles.separator} />}

                  {group.options.map((opt) => (
                    <SelectPrimitive.Item
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.disabled}
                      className={styles.item}
                    >
                      <SelectPrimitive.ItemIndicator className={styles.itemIndicator}>
                        <CheckIcon />
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Group>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className={styles.scrollButton}>
              <ChevronDownIcon />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error ? (
        <span id={`${selectId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${selectId}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export { Select };

/* ── Low-level re-exports for custom composition ── */
export const SelectRoot = SelectPrimitive.Root;
export const SelectTrigger = SelectPrimitive.Trigger;
export const SelectValue = SelectPrimitive.Value;
export const SelectContent = SelectPrimitive.Content;
export const SelectItem = SelectPrimitive.Item;
export const SelectGroup = SelectPrimitive.Group;
export const SelectSeparator = SelectPrimitive.Separator;
