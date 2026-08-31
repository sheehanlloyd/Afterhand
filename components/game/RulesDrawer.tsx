"use client";

import { GameId } from "@/types";
import { Drawer } from "@/components/ui/Drawer";
import { RULES } from "@/lib/content/rules";
import { RulesBody } from "@/components/rules/RulesBody";
import { RichText } from "@/components/ui/RichText";

/** Rules open beside the table so the hand in progress is never lost. */
export function RulesDrawer({
  game,
  open,
  onClose,
}: {
  game: GameId;
  open: boolean;
  onClose: () => void;
}) {
  const doc = RULES[game];
  return (
    <Drawer open={open} onClose={onClose} title={`${doc.title} rules`}>
      <p className="mb-8 text-[14px] leading-relaxed text-fg-2">
        <RichText text={doc.intro} />
      </p>
      <RulesBody doc={doc} compact />
    </Drawer>
  );
}
