import type { NostrEvent } from "applesauce-core/helpers/event";
import { getTagValue } from "applesauce-core/helpers/event";

// NIP-75 Zap Goal kind
export const ZAP_GOAL_KIND = 9041;

/**
 * Read amount tag (in millisats) and convert to satoshis
 * @param event - The zap goal event
 * @returns Amount in satoshis, or null if not found or invalid
 */
export function getZapGoalAmount(event: NostrEvent): number | null {
  const amountStr = getTagValue(event, "amount");
  if (!amountStr) return null;

  const millisats = parseInt(amountStr, 10);
  if (isNaN(millisats) || millisats <= 0) return null;

  // Convert millisats to satoshis
  return Math.floor(millisats / 1000);
}

/**
 * Read relays tag and return array of all relay URLs
 * The relays tag can have multiple values: ["relays", "wss://relay1", "wss://relay2", ...]
 * @param event - The zap goal event
 * @returns Array of relay URLs, or empty array if not found
 */
export function getZapGoalRelays(event: NostrEvent): string[] {
  const relaysTag = event.tags.find((tag) => tag[0] === "relays");
  if (!relaysTag || relaysTag.length < 2) return [];

  // Return all values after index 0 (the tag name)
  return relaysTag
    .slice(1)
    .filter(
      (relay): relay is string => typeof relay === "string" && relay.length > 0,
    );
}

/**
 * Read title from summary tag or fall back to content
 * @param event - The zap goal event
 * @returns Title string
 */
export function getZapGoalTitle(event: NostrEvent): string {
  const summary = getZapGoalSummary(event);
  if (summary) return summary;

  // Fall back to content if no summary
  return event.content || "";
}

/**
 * Read closed_at timestamp
 * @param event - The zap goal event
 * @returns Unix timestamp in seconds, or undefined if not found
 */
export function getZapGoalClosedAt(event: NostrEvent): number | undefined {
  const closedAtStr = getTagValue(event, "closed_at");
  if (!closedAtStr) return undefined;

  const timestamp = parseInt(closedAtStr, 10);
  if (isNaN(timestamp)) return undefined;

  return timestamp;
}

/**
 * Read image URL
 * @param event - The zap goal event
 * @returns Image URL string, or undefined if not found
 */
export function getZapGoalImage(event: NostrEvent): string | undefined {
  return getTagValue(event, "image");
}

/**
 * Read summary text
 * @param event - The zap goal event
 * @returns Summary string, or undefined if not found
 */
export function getZapGoalSummary(event: NostrEvent): string | undefined {
  return getTagValue(event, "summary");
}

/**
 * Validate event is kind 9041 with required tags (amount and relays)
 * @param event - The event to validate
 * @returns true if valid zap goal event, false otherwise
 */
export function isValidZapGoal(event: NostrEvent): boolean {
  // Must be kind 9041
  if (event.kind !== ZAP_GOAL_KIND) return false;

  // Must have amount tag
  const amount = getZapGoalAmount(event);
  if (amount === null) return false;

  // Must have relays tag with at least one relay
  const relays = getZapGoalRelays(event);
  if (relays.length === 0) return false;

  return true;
}
