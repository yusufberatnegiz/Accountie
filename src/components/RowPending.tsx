"use client";

import { useLinkStatus } from "next/link";

/** Inside a list row's link: a thin bar runs along the row while its review screen loads (the screen has no skeleton, its title morphs in). */
export function RowPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="row-pending" aria-hidden="true" /> : null;
}
