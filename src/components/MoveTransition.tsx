"use client";

import { ViewTransition, type ViewTransitionProps } from "react";
import { moveOnly } from "@/lib/view-transition";

/** A <ViewTransition> whose moves are transform alone (the group is never resized); usable from server components. */
export function MoveTransition(props: ViewTransitionProps) {
  return <ViewTransition {...props} onUpdate={(i) => moveOnly(i)} onShare={(i) => moveOnly(i)} />;
}
