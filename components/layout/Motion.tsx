"use client";

import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";

/**
 * Honours the operating system reduced motion setting across every animation,
 * not just the ones that opt in individually.
 */
export function Motion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
