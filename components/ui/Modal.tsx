"use client";

import { ReactNode, useId } from "react";
import { Overlay } from "./Overlay";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleId = useId();
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

  return (
    <Overlay open={open} onClose={onClose} labelledBy={titleId} align="center">
      <div
        className={cn(
          "card-surface w-[calc(100vw-2rem)] rounded-sm shadow-[0_30px_70px_-40px_rgba(0,0,0,0.7)]",
          widths[size],
        )}
      >
        <div className="px-6 pt-5 pb-4">
          <h2 id={titleId} className="display text-[24px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-[14px] leading-relaxed text-fg-2">{description}</p>
          ) : null}
        </div>
        {children ? <div className="px-6 pb-4">{children}</div> : null}
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </Overlay>
  );
}
