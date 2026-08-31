import { ReactNode } from "react";
import { Surface } from "@/components/layout/Surface";
import { cn } from "@/lib/utils/cn";

/**
 * The room. A fixed height column so the table can own the viewport and the
 * controls stay under the thumb on a phone.
 */
export function GameFrame({
  header,
  children,
  rail,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  rail?: ReactNode;
  className?: string;
}) {
  return (
    <>
      <Surface value="room" />
      <div className={cn("flex h-dvh min-h-0 flex-col overflow-hidden", className)}>
        {header}
        <main id="main" className="relative z-10 flex min-h-0 flex-1 flex-col">
          {children}
        </main>
        {rail ? (
          <div className="relative z-20 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
            {rail}
          </div>
        ) : null}
      </div>
    </>
  );
}
