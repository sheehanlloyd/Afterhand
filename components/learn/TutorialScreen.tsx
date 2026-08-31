"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Tutorial } from "@/lib/content/tutorials";
import { RichText } from "@/components/ui/RichText";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { loadTutorials, saveTutorials } from "@/lib/storage/preferences";
import { cn } from "@/lib/utils/cn";

export function TutorialScreen({ tutorial }: { tutorial: Tutorial }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = tutorial.steps.length;
  const current = tutorial.steps[step];
  const last = step === total - 1;

  useEffect(() => {
    if (!last) return;
    const state = loadTutorials();
    if (state.completed[tutorial.game]) return;
    saveTutorials({ ...state, completed: { ...state.completed, [tutorial.game]: true } });
  }, [last, tutorial.game]);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(total - 1, next)));
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header>
        <span className="label">{tutorial.minutes} minute walkthrough</span>
        <h1 className="display mt-4 text-[clamp(2.2rem,5.5vw,3.2rem)] leading-[1.02]">
          {tutorial.title}
        </h1>
        <p className="mt-5 text-[15.5px] leading-relaxed text-fg-2">{tutorial.intro}</p>
      </header>

      <nav aria-label="Tutorial progress" className="mt-10 flex items-center gap-2">
        {tutorial.steps.map((entry, index) => (
          <button
            key={entry.question}
            type="button"
            onClick={() => go(index)}
            aria-label={`Step ${index + 1}: ${entry.question}`}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "h-[3px] flex-1 transition-colors",
              index <= step ? "bg-accent" : "bg-fg/12 hover:bg-fg/25",
            )}
          />
        ))}
      </nav>

      <div className="relative mt-8 min-h-[22rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={step}
            initial={{ opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -18 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="border border-line bg-surface-2 p-6 sm:p-9"
          >
            <div className="flex items-baseline gap-4">
              <span className="label">{String(step + 1).padStart(2, "0")}</span>
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-fg-2 uppercase">
                {current.question}
              </p>
            </div>

            <h2 className="display mt-5 text-[clamp(1.5rem,3.6vw,2rem)] leading-[1.1]">
              {current.heading}
            </h2>

            {current.body.length > 0 ? (
              <div className="mt-5 space-y-3.5">
                {current.body.map((paragraph, index) => (
                  <p key={index} className="text-[14.5px] leading-relaxed text-fg-2">
                    <RichText text={paragraph} />
                  </p>
                ))}
              </div>
            ) : null}

            {current.items ? (
              <dl className="mt-6 divide-y divide-[var(--line)] border-y border-line">
                {current.items.map((item) => (
                  <div
                    key={item.label}
                    className="grid gap-1 py-3 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="font-mono text-[10.5px] tracking-[0.12em] uppercase">
                      {item.label}
                    </dt>
                    <dd className="text-[14px] leading-relaxed text-fg-2">
                      <RichText text={item.text} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {current.aside ? (
              <p className="mt-6 border-l-2 border-accent-2 pl-4 text-[13.5px] leading-relaxed text-fg-2">
                <RichText text={current.aside} />
              </p>
            ) : null}
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="md"
          plate
          onClick={() => go(step - 1)}
          disabled={step === 0}
        >
          Back
        </Button>
        {last ? (
          <LinkButton href={tutorial.playHref} variant="primary" size="lg" plate>
            Play your first hand
          </LinkButton>
        ) : (
          <Button variant="primary" size="lg" plate onClick={() => go(step + 1)}>
            Next
          </Button>
        )}
        <Link
          href={`/games/${tutorial.game}/rules`}
          className="ml-auto font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
        >
          Full rules
        </Link>
      </div>
    </div>
  );
}
