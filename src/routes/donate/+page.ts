import { browser } from "$app/environment";
import { nostrConfig, nostrRelays, WHITELISTED_PUBKEYS } from "$lib/config";
import { pool } from "$lib/nostr";
import {
  getZapGoalAmount,
  getZapGoalClosedAt,
  getZapGoalRelays,
  isValidZapGoal,
  ZAP_GOAL_KIND,
} from "$lib/utils/zapGoals";
import type { Filter } from "applesauce-core/helpers";
import { kinds, type NostrEvent } from "applesauce-core/helpers/event";

// Combine community relay with standard relays
const allRelays = [nostrConfig.communityRelay, ...nostrRelays].filter(
  Boolean,
) as string[];

export interface Zapraiser {
  goal: NostrEvent;
  current: number;
  author?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

interface ZapReceipt {
  id: string;
  pubkey: string;
  amount: number;
  zapraiserId: string;
  created_at: number;
}

// Fetch zapraisers from whitelisted users (NIP-75 zap goals)
async function fetchZapraisers(): Promise<Zapraiser[]> {
  console.log("🔍 Starting to fetch zap goals...");

  const filter = {
    kinds: [ZAP_GOAL_KIND], // NIP-75 zap goals
    authors: WHITELISTED_PUBKEYS,
    limit: 100,
  };

  console.log("🎯 Using zap goals filter:", filter);
  console.log("🌐 Using relays:", allRelays);

  const zapraisers: Zapraiser[] = [];

  try {
    const eventsPromise = new Promise<NostrEvent[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("⏰ Request timeout");
        reject(new Error("Request timeout"));
      }, 30000); // 30 second timeout

      const events: NostrEvent[] = [];

      pool.request(allRelays, filter).subscribe({
        next: (nostrEvent: NostrEvent) => {
          console.log(`🎯 Found potential zap goal:`, nostrEvent.id);

          // Validate it's a valid zap goal event
          if (isValidZapGoal(nostrEvent)) {
            events.push(nostrEvent);
            const amount = getZapGoalAmount(nostrEvent);
            console.log(
              `➕ Added zap goal: ${nostrEvent.content.substring(0, 50)}... Goal: ${amount} sats`,
            );
          } else {
            console.log(`⏭ Skipping invalid zap goal: ${nostrEvent.id}`);
          }
        },
        error: (error) => {
          console.error("💥 Error fetching zap goals:", error);
          clearTimeout(timeout);
          reject(error);
        },
        complete: () => {
          console.log("📭 End of stored zap goals");
          clearTimeout(timeout);
          resolve(events);
        },
      });
    });

    const events = await eventsPromise;

    // Convert events to Zapraiser format using helper functions
    for (const event of events) {
      if (!isValidZapGoal(event)) continue;

      const amount = getZapGoalAmount(event);
      if (amount === null) continue;

      const zapraiser: Zapraiser = {
        goal: event,
        current: 0,
      };

      zapraisers.push(zapraiser);
    }
  } catch (error) {
    console.warn("⚠️ Failed to fetch zap goals:", error);
  }

  console.log(`📊 Total zap goals fetched: ${zapraisers.length}`);
  return zapraisers;
}

// Fetch zap receipts for a specific zap goal
async function fetchZapReceipts(goal: NostrEvent): Promise<ZapReceipt[]> {
  console.log(`🔍 Fetching zap receipts for zap goal: ${goal.id}`);

  const relays = getZapGoalRelays(goal);
  const closedAt = getZapGoalClosedAt(goal);
  const filter: Filter = {
    kinds: [kinds.Zap], // Zap receipts
    "#e": [goal.id], // Filter for receipts referencing this zap goal
  };

  // Set upper limit on zaps
  if (closedAt) filter.until = closedAt;

  console.log("🎯 Using zap receipts filter:", filter);
  console.log("🌐 Using goal relays:", relays);

  const receipts: ZapReceipt[] = [];
  const receiptIds = new Set<string>(); // Track unique receipt IDs to prevent duplicates

  try {
    const eventsPromise = new Promise<any[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("⏰ Zap receipts timeout");
        reject(new Error("Request timeout"));
      }, 15000); // 15 second timeout

      const events: any[] = [];

      // Use the relays from the goal event, fallback to allRelays (including community relay) if empty
      // Always include community relay even if goal specifies other relays
      const relaysToUse =
        relays.length > 0
          ? [...new Set([nostrConfig.communityRelay, ...relays])]
          : allRelays;

      pool.request(relaysToUse, filter).subscribe({
        next: (nostrEvent) => {
          console.log(`🎯 Found zap receipt:`, nostrEvent.id);

          // Filter by closed_at if present - only count zaps before closed_at
          if (closedAt && nostrEvent.created_at > closedAt) {
            console.log(
              `⏭ Skipping zap receipt after closed_at: ${nostrEvent.id}`,
            );
            return;
          }

          // Extract amount from bolt11 tag or description tag
          const amount = extractZapAmount(nostrEvent);
          if (amount > 0) {
            // Skip duplicates
            if (receiptIds.has(nostrEvent.id)) {
              console.log(`⏭ Skipping duplicate receipt: ${nostrEvent.id}`);
              return;
            }

            receiptIds.add(nostrEvent.id);

            const receipt: ZapReceipt = {
              id: nostrEvent.id,
              pubkey: nostrEvent.pubkey,
              created_at: nostrEvent.created_at,
              amount: amount,
              zapraiserId: goal.id,
            };

            events.push(receipt);
            receipts.push(receipt);
            console.log(`➕ Added zap receipt: ${amount} sats`);
          }
        },
        error: (error) => {
          console.error("💥 Error fetching zap receipts:", error);
          clearTimeout(timeout);
          reject(error);
        },
        complete: () => {
          console.log("📭 End of stored zap receipts");
          clearTimeout(timeout);
          resolve(events);
        },
      });
    });

    await eventsPromise;
    console.log(`📊 Total zap receipts for ${goal.id}: ${receipts.length}`);
  } catch (error) {
    console.warn(`⚠️ Failed to fetch zap receipts for ${goal.id}:`, error);
  }

  return receipts;
}

// Extract zap amount from a zap receipt event
function extractZapAmount(event: any): number {
  // Try to find amount in bolt11 tag
  const bolt11Tag = event.tags?.find((tag: string[]) => tag[0] === "bolt11");
  if (bolt11Tag && bolt11Tag[1]) {
    // Parse amount from bolt11 invoice - look for milli-satoshis pattern
    const msatMatch = bolt11Tag[1].match(/amount=(\d+)/);
    if (msatMatch) {
      // Convert from millisatoshis to satoshis
      const msats = parseInt(msatMatch[1]);
      return Math.floor(msats / 1000);
    }

    // Alternative: try to extract from the invoice data directly
    try {
      const invoice = bolt11Tag[1];
      if (invoice.includes("lnbc")) {
        // Fallback: try to match amount followed by unit
        const fallbackMatch = invoice.match(/(\d+)([munp])/);
        if (fallbackMatch) {
          const amount = parseInt(fallbackMatch[1]);
          const unit = fallbackMatch[2];

          switch (unit) {
            case "n":
              return Math.floor(amount / 10);
            case "u":
              return Math.floor(amount * 100);
            default:
              return Math.floor(amount * 100000000);
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return 0;
}

// Fetch user metadata
async function fetchUserMetadata(pubkey: string) {
  console.log("🔍 Fetching metadata for pubkey:", pubkey);

  const filter = {
    kinds: [0],
    authors: [pubkey],
    limit: 1,
  };

  try {
    const eventsPromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Metadata timeout"));
      }, 5000);

      pool.request(allRelays, filter).subscribe({
        next: (nostrEvent) => {
          clearTimeout(timeout);
          try {
            const metadata = JSON.parse(nostrEvent.content);
            resolve(metadata);
          } catch (e) {
            resolve({});
          }
        },
        error: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        complete: () => {
          clearTimeout(timeout);
          resolve({});
        },
      });
    });

    return await eventsPromise;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch metadata for ${pubkey}:`, error);
    return {};
  }
}

export const load = async () => {
  // Fetch zapraisers
  const zapraisersData = await fetchZapraisers();

  // For each zapraiser, fetch its zap receipts and author metadata
  const zapraisersWithProgress = await Promise.all(
    zapraisersData.map(async (zapraiser: Zapraiser) => {
      // Fetch zap receipts for this zap goal using its relays
      const receipts = await fetchZapReceipts(zapraiser.goal);
      const totalZapped = receipts.reduce(
        (sum, receipt) => sum + receipt.amount,
        0,
      );

      // Fetch author metadata
      const authorMetadata = await fetchUserMetadata(zapraiser.goal.pubkey);

      return {
        ...zapraiser,
        current: totalZapped,
        author: authorMetadata,
      };
    }),
  );

  // Sort by creation time (newest first)
  zapraisersWithProgress.sort(
    (a: Zapraiser, b: Zapraiser) => b.goal.created_at - a.goal.created_at,
  );

  return {
    zapraisers: zapraisersWithProgress,
    error: null,
  };
};
