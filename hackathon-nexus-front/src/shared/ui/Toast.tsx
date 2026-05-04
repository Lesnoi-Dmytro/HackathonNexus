import * as RadixToast from "@radix-ui/react-toast";
import { forwardRef } from "react";
import styles from "./Toast.module.css";

/* ── Viewport (where toasts render) ─────────────────────────── */
export const ToastViewport = forwardRef<
  React.ElementRef<typeof RadixToast.Viewport>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Viewport>
>((props, ref) => <RadixToast.Viewport ref={ref} className={styles.viewport} {...props} />);
ToastViewport.displayName = "ToastViewport";

/* ── Individual Toast ────────────────────────────────────────── */
export interface ToastProps extends React.ComponentPropsWithoutRef<typeof RadixToast.Root> {
  variant?: "default" | "success" | "destructive";
}

export const Toast = forwardRef<React.ElementRef<typeof RadixToast.Root>, ToastProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <RadixToast.Root
      ref={ref}
      className={`${styles.toast} ${styles[variant]} ${className ?? ""}`}
      {...props}
    />
  ),
);
Toast.displayName = "Toast";

/* ── Sub-parts ───────────────────────────────────────────────── */
export const ToastTitle = forwardRef<
  React.ElementRef<typeof RadixToast.Title>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Title>
>((props, ref) => <RadixToast.Title ref={ref} className={styles.title} {...props} />);
ToastTitle.displayName = "ToastTitle";

export const ToastDescription = forwardRef<
  React.ElementRef<typeof RadixToast.Description>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Description>
>((props, ref) => <RadixToast.Description ref={ref} className={styles.description} {...props} />);
ToastDescription.displayName = "ToastDescription";

export const ToastClose = forwardRef<
  React.ElementRef<typeof RadixToast.Close>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Close>
>((props, ref) => (
  <RadixToast.Close ref={ref} className={styles.close} aria-label="Close" {...props}>
    ✕
  </RadixToast.Close>
));
ToastClose.displayName = "ToastClose";

export const ToastProvider = RadixToast.Provider;
