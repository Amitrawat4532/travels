"use client";

import { useSyncExternalStore } from "react";
import { toIstDateString } from "./format";

const noopSubscribe = () => () => {};

/** Today's IST date ("YYYY-MM-DD") on the client; "" during SSR (no hydration mismatch). */
export function useClientToday(): string {
  return useSyncExternalStore(noopSubscribe, () => toIstDateString(new Date()), () => "");
}

export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+05:30`);
  return toIstDateString(new Date(d.getTime() + days * 86_400_000));
}
