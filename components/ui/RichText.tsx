"use client";

import { Fragment, ReactNode } from "react";
import { Term } from "./Term";
import { GLOSSARY } from "@/lib/content/glossary";

const PATTERN_SOURCE = /\[\[([a-z-]+)\|([^\]]+)\]\]/g;

/**
 * Renders authored copy that can mark a glossary term inline as
 * `[[soft-hand|soft hand]]`. Marking is deliberate rather than automatic, so a
 * term is only made interactive where the reader meets it without a definition
 * already beside it.
 */
export function RichText({ text }: { text: string }): ReactNode {
  if (!text.includes("[[")) return text;

  // A fresh regex per call, so nothing carries state between renders.
  const pattern = new RegExp(PATTERN_SOURCE.source, "g");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, id, label] = match;
    parts.push(
      GLOSSARY[id] ? (
        <Term key={`${id}-${match.index}`} id={id}>
          {label}
        </Term>
      ) : (
        label
      ),
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}
