/**
 * Send times as models read them in the transcript (issue #295).
 *
 * Times are absolute and in one fixed zone (TRANSCRIPT_TIME.ZONE) rather than
 * relative ("5 min ago"): a relative label would change on every prompt, and
 * a model can work out elapsed time itself once it is told the current time.
 * A message shows only its clock time unless it is the first one on a new
 * day, which keeps the per-message token cost to a few characters.
 */

import { TRANSCRIPT_TIME } from "@/orchestrator/constants.js";

const pad = (value: number) => String(value).padStart(2, "0");

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TRANSCRIPT_TIME.ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "long",
  hourCycle: "h23",
});

type TimeParts = { date: string; time: string; weekday: string };

const toParts = (timestamp: number): TimeParts => {
  const parts = Object.fromEntries(
    partsFormatter
      .formatToParts(new Date(timestamp))
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${pad(Number(parts.hour))}:${pad(Number(parts.minute))}`,
    weekday: parts.weekday ?? "",
  };
};

const isValidTimestamp = (timestamp: unknown): timestamp is number =>
  typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0;

/** "2026-11-27 20:03", or undefined for a message with no usable time. */
export const formatDateTime = (timestamp: unknown): string | undefined => {
  if (!isValidTimestamp(timestamp)) return undefined;
  const { date, time } = toParts(timestamp);
  return `${date} ${time}`;
};

/** "Friday 2026-11-27 20:15 UTC" - the "now" a model measures against. */
export const formatCurrentTime = (now: number): string => {
  const { date, time, weekday } = toParts(now);
  return `${weekday} ${date} ${time} ${TRANSCRIPT_TIME.ZONE}`;
};

/**
 * Returns a labeller that gives each message "20:03", or "2026-11-27 20:03"
 * when its day differs from the previous labelled message's. Stateful, so
 * call it on the messages in order.
 */
export const createTimeLabeller = () => {
  let previousDate: string | undefined;
  return (timestamp: unknown): string | undefined => {
    if (!isValidTimestamp(timestamp)) return undefined;
    const { date, time } = toParts(timestamp);
    const label = date === previousDate ? time : `${date} ${time}`;
    previousDate = date;
    return label;
  };
};
