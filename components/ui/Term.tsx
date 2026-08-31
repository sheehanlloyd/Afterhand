"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GLOSSARY } from "@/lib/content/glossary";
import { cn } from "@/lib/utils/cn";

/**
 * Inline glossary term. Opens on click and on keyboard focus activation, never
 * on hover alone, so it works on touch and never blocks a control underneath.
 */
export function Term({
  id,
  children,
  className,
}: {
  id: keyof typeof GLOSSARY | string;
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[id];
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!entry) return <>{children ?? id}</>;

  return (
    <span ref={wrapper} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => {
          const rect = wrapper.current?.getBoundingClientRect();
          setAbove(rect ? window.innerHeight - rect.bottom < 180 : false);
          setOpen((value) => !value);
        }}
        className={cn(
          "cursor-help underline decoration-accent-2/70 decoration-dotted underline-offset-4 transition-colors hover:text-accent-2",
          open && "text-accent-2",
          className,
        )}
      >
        {children ?? entry.term}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.span
            id={popoverId}
            role="note"
            initial={{ opacity: 0, y: above ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: above ? 4 : -4 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "card-surface absolute left-0 z-40 block w-[min(20rem,calc(100vw-2.5rem))] rounded-sm p-4 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]",
              above ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            <span className="label block">{entry.term}</span>
            <span className="mt-2 block text-[13px] leading-relaxed text-fg-2">
              {entry.definition}
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
