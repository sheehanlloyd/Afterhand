"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useBodyLock } from "@/lib/utils/use-body-lock";
import { cn } from "@/lib/utils/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Overlay({
  open,
  onClose,
  children,
  labelledBy,
  align = "center",
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  align?: "center" | "right" | "bottom";
  className?: string;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  useBodyLock(open);

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !surface.current) return;
      const focusable = Array.from(
        surface.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const target = surface.current?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? surface.current)?.focus();
    });
    document.addEventListener("keydown", handleKey, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKey, true);
      restoreTo.current?.focus?.();
    };
  }, [open, handleKey]);

  if (typeof document === "undefined") return null;

  const positions = {
    center: "items-center justify-center p-4",
    right: "items-stretch justify-end",
    bottom: "items-end justify-center",
  } as const;

  const motionProps = {
    center: {
      initial: { opacity: 0, y: 12, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 8, scale: 0.98 },
    },
    right: {
      initial: { opacity: 0, x: 32 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 32 },
    },
    bottom: {
      initial: { opacity: 0, y: 40 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 40 },
    },
  } as const;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={cn("fixed inset-0 z-50 flex", positions[align])}>
          <motion.div
            className="absolute inset-0 bg-scrim backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={surface}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={cn("relative outline-none", className)}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            {...motionProps[align]}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
