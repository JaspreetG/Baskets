import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      visibleToasts={1}
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          top: "3.5rem", // move down from top (56px)
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

let lastToastId: string | number | undefined = undefined;

const toast = {
  message: (msg: string, opts?: Parameters<typeof sonnerToast>[1]) => {
    if (lastToastId !== undefined) {
      sonnerToast.dismiss(lastToastId);
    }
    lastToastId = sonnerToast(msg, opts);
  },
  success: (msg: string, opts?: Parameters<typeof sonnerToast.success>[1]) => {
    if (lastToastId !== undefined) {
      sonnerToast.dismiss(lastToastId);
    }
    lastToastId = sonnerToast.success(msg, opts);
  },
  error: (msg: string, opts?: Parameters<typeof sonnerToast.error>[1]) => {
    if (lastToastId !== undefined) {
      sonnerToast.dismiss(lastToastId);
    }
    lastToastId = sonnerToast.error(msg, opts);
  },
  dismiss: sonnerToast.dismiss,
};

export { Toaster, toast };
