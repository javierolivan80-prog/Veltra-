import { diffMinutesRolloverAware } from "@/lib/duration";
import type { SleepLog } from "@/types/models";

export function timeInBedMinutes(log: Pick<SleepLog, "bedTime" | "riseTime">): number {
  return diffMinutesRolloverAware(log.bedTime, log.riseTime);
}

export function sleptMinutes(log: Pick<SleepLog, "sleepTime" | "wakeTime">): number {
  return diffMinutesRolloverAware(log.sleepTime, log.wakeTime);
}

export function fallAsleepMinutes(log: Pick<SleepLog, "bedTime" | "sleepTime">): number {
  return diffMinutesRolloverAware(log.bedTime, log.sleepTime);
}

export function wakeLatencyMinutes(log: Pick<SleepLog, "wakeTime" | "riseTime">): number {
  return diffMinutesRolloverAware(log.wakeTime, log.riseTime);
}

export function averageSleptMinutes(logs: SleepLog[]): number {
  if (logs.length === 0) return 0;
  return logs.reduce((sum, l) => sum + sleptMinutes(l), 0) / logs.length;
}
