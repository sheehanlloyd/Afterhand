import { RulesDoc } from "@/lib/content/rules";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/utils/cn";

export function RulesBody({ doc, compact }: { doc: RulesDoc; compact?: boolean }) {
  return (
    <div className={cn("space-y-10", compact && "space-y-8")}>
      {doc.sections.map((section, index) => (
        <section key={section.heading}>
          <div className="flex items-baseline gap-3 border-b border-line pb-2">
            <span className="label">{String(index + 1).padStart(2, "0")}</span>
            <h2 className={cn("font-semibold", compact ? "text-[15px]" : "text-[17px]")}>
              {section.heading}
            </h2>
          </div>

          {section.body ? (
            <div className="mt-4 space-y-3">
              {section.body.map((paragraph, position) => (
                <p
                  key={position}
                  className={cn("leading-relaxed text-fg-2", compact ? "text-[13.5px]" : "text-[14.5px]")}
                >
                  <RichText text={paragraph} />
                </p>
              ))}
            </div>
          ) : null}

          {section.items ? (
            <dl className="mt-4 divide-y divide-[var(--line)] border-y border-line">
              {section.items.map((item, position) => (
                <div
                  key={position}
                  className={cn(
                    "gap-2 py-3",
                    item.label
                      ? "grid sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-6"
                      : "flex gap-3",
                  )}
                >
                  {item.label ? (
                    <dt className="font-mono text-[10.5px] tracking-[0.12em] text-fg uppercase">
                      {item.label}
                    </dt>
                  ) : (
                    <dt aria-hidden="true" className="mt-[9px] h-px w-3 shrink-0 bg-fg-3" />
                  )}
                  <dd
                    className={cn(
                      "leading-relaxed text-fg-2",
                      compact ? "text-[13.5px]" : "text-[14px]",
                    )}
                  >
                    <RichText text={item.text} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ))}
    </div>
  );
}
