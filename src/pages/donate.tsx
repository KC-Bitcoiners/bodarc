import { useState, useEffect, useRef } from "react";
import { WHITELISTED_PUBKEYS, nostrRelays } from "@/config";
import { pool } from "@/lib/nostr";
import { normalizeToPubkey } from "applesauce-core/helpers";

export interface Zapraiser {
  id: string;
  pubkey: string;
  content: string;
  goal: number;
  current: number;
  created_at: number;
  author?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

export interface ZapReceipt {
  id: string;
  pubkey: string;
  amount: number;
  zapraiserId: string;
  created_at: number;
}

// Progress bar component with smooth animation
const ProgressBar = ({
  current,
  goal,
  label,
}: {
  current: number;
  goal: number;
  label: string;
}) => {
  const targetPercentage = Math.min((current / goal) * 100, 100);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation when target changes
  useEffect(() => {
    console.log("🔹 ProgressBar useEffect triggered", {
      current,
      goal,
      targetPercentage,
      displayPercentage,
    });

    // Force a new animation by incrementing the key
    setAnimationKey((prev) => prev + 1);

    // Reset to 0
    setDisplayPercentage(0);
    console.log("🔹 Reset to 0%");

    // Start animation after a delay
    const timer = setTimeout(() => {
      console.log("🔹 Starting animation to", targetPercentage);
      setDisplayPercentage(targetPercentage);
    }, 300);

    return () => clearTimeout(timer);
  }, [targetPercentage]);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {current.toLocaleString()} / {goal.toLocaleString()} sats (
          {targetPercentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          key={animationKey}
          className="bg-bitcoin-orange h-3 rounded-full"
          style={{
            width: `${displayPercentage}%`,
            transition: displayPercentage === 0 ? "none" : "width 1s ease-out",
          }}
        />
      </div>
    </div>
  );
};

// Fetch zapraisers from whitelisted users
async function fetchZapraisers(): Promise<Zapraiser[]> {
  console.log("🔍 Starting to fetch zapraisers...");

  const filter = {
    kinds: [1], // Text notes
    authors: WHITELISTED_PUBKEYS,
    limit: 10, // Get more events to find zapraisers
  };

  console.log("🎯 Using zapraisers filter:", filter);
  console.log("🌐 Using relays:", nostrRelays);

  const zapraisers: Zapraiser[] = [];

  try {
    const eventsPromise = new Promise<any[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("⏰ Request timeout");
        reject(new Error("Request timeout"));
      }, 30000); // 30 second timeout

      const events: any[] = [];

      pool.request(nostrRelays, filter).subscribe({
        next: (nostrEvent) => {
          console.log(`🎯 Found potential zapraiser:`, nostrEvent.id);

          // Check if event has a zapraiser tag with a goal amount
          const zapraiserTag = nostrEvent.tags?.find(
            (tag: string[]) => tag[0] === "zapraiser",
          );

          if (zapraiserTag && zapraiserTag[1]) {
            const goal = parseInt(zapraiserTag[1]);
            if (!isNaN(goal) && goal > 0) {
              events.push(nostrEvent);
              console.log(
                `➕ Added zapraiser: ${nostrEvent.content.substring(0, 50)}... Goal: ${goal} sats`,
              );
            }
          }
        },
        error: (error) => {
          console.error("💥 Error fetching zapraisers:", error);
          clearTimeout(timeout);
          reject(error);
        },
        complete: () => {
          console.log("📭 End of stored zapraisers");
          clearTimeout(timeout);
          resolve(events);
        },
      });
    });

    const events = await eventsPromise;

    // Convert events to Zapraiser format
    for (const event of events) {
      const zapraiserTag = event.tags?.find(
        (tag: string[]) => tag[0] === "zapraiser",
      );

      if (zapraiserTag && zapraiserTag[1]) {
        const goal = parseInt(zapraiserTag[1]);
        if (!isNaN(goal) && goal > 0) {
          const zapraiser: Zapraiser = {
            id: event.id,
            pubkey: event.pubkey,
            content: event.content,
            goal: goal,
            current: 0, // Will be calculated later
            created_at: event.created_at,
          };

          zapraisers.push(zapraiser);
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to fetch zapraisers:", error);
  }

  console.log(`📊 Total zapraisers fetched: ${zapraisers.length}`);
  return zapraisers;
}

// Fetch zap receipts for a specific zapraiser
async function fetchZapReceipts(zapraiserId: string): Promise<ZapReceipt[]> {
  console.log(`🔍 Fetching zap receipts for zapraiser: ${zapraiserId}`);

  const filter = {
    kinds: [9735], // Zap receipts
    "#e": [zapraiserId], // Filter for receipts referencing this zapraiser
    limit: 100,
  };

  console.log("🎯 Using zap receipts filter:", filter);

  const receipts: ZapReceipt[] = [];
  const receiptIds = new Set<string>(); // Track unique receipt IDs to prevent duplicates

  try {
    const eventsPromise = new Promise<any[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("⏰ Zap receipts timeout");
        reject(new Error("Request timeout"));
      }, 15000); // 15 second timeout

      const events: any[] = [];

      pool.request(nostrRelays, filter).subscribe({
        next: (nostrEvent) => {
          console.log(`🎯 Found zap receipt:`, nostrEvent.id);

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
              amount: amount,
              zapraiserId: zapraiserId,
              created_at: nostrEvent.created_at,
            };

            events.push(nostrEvent);
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
    console.log(`📊 Total zap receipts for ${zapraiserId}: ${receipts.length}`);
  } catch (error) {
    console.warn(`⚠️ Failed to fetch zap receipts for ${zapraiserId}:`, error);
  }

  return receipts;
}

// Extract zap amount from a zap receipt event
function extractZapAmount(event: any): number {
  return 10000;
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
            // case 'p': return Math.floor(amount / 10);
            case "n":
              return Math.floor(amount / 10);
            case "u":
              return Math.floor(amount * 100);
            // case 'm': return Math.floor(amount * 100000);
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

      pool.request(nostrRelays, filter).subscribe({
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

export default function DonatePage() {
  const [zapraisers, setzapraisers] = useState<Zapraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh zap receipts every 30 seconds
  useEffect(() => {
    if (zapraisers.length === 0) return; // Don't refresh if no zapraisers

    const interval = setInterval(async () => {
      console.log("🔄 Auto-refreshing zap receipts...");

      // Update each zapraiser with new zap receipts
      const updatedzapraisers = await Promise.all(
        zapraisers.map(async (zapraiser: Zapraiser) => {
          // Fetch fresh zap receipts for this zapraiser
          const receipts = await fetchZapReceipts(zapraiser.id);
          const totalZapped = receipts.reduce(
            (sum, receipt) => sum + receipt.amount,
            0,
          );

          return {
            ...zapraiser,
            current: totalZapped,
          };
        }),
      );

      // Update state with new progress
      setzapraisers(updatedzapraisers);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [zapraisers]); // Only run interval when zapraisers are loaded

  useEffect(() => {
    async function loadzapraisers() {
      try {
        setLoading(true);
        setError(null);

        // Fetch zapraisers
        const zapraisersData = await fetchZapraisers();

        // For each zapraiser, fetch its zap receipts and author metadata
        const zapraisersWithProgress = await Promise.all(
          zapraisersData.map(async (zapraiser: Zapraiser) => {
            // Fetch zap receipts for this zapraiser
            const receipts = await fetchZapReceipts(zapraiser.id);
            const totalZapped = receipts.reduce(
              (sum, receipt) => sum + receipt.amount,
              0,
            );

            // Fetch author metadata
            const authorMetadata = await fetchUserMetadata(zapraiser.pubkey);

            return {
              ...zapraiser,
              current: totalZapped,
              author: authorMetadata,
            };
          }),
        );

        // Sort by creation time (newest first)
        zapraisersWithProgress.sort(
          (a: Zapraiser, b: Zapraiser) => b.created_at - a.created_at,
        );

        setzapraisers(zapraisersWithProgress);
      } catch (err) {
        console.error("Failed to load zapraisers:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load zapraisers",
        );
      } finally {
        setLoading(false);
      }
    }

    loadzapraisers();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 font-archivo-black">Donate</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bitcoin-orange mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading zapraisers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 font-archivo-black">Donate</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">
              Unable to load zapraisers at this time.
            </p>
            <p className="text-sm text-red-500 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-6 font-archivo-black">Donate</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Support our community with Bitcoin zaps! These zapraisers are
          fundraising campaigns from trusted community members. Every sat counts
          towards building a stronger Bitcoin ecosystem.
        </p>
      </div>

      {/* zapraisers Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 font-archivo-black bitcoin-orange">
          Active zapraisers
        </h2>

        {zapraisers.length > 0 ? (
          <div className="space-y-8">
            {zapraisers.map((zapraiser) => (
              <div
                key={zapraiser.id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Author Info */}
                <div className="flex items-center mb-4">
                  {zapraiser.author?.picture && (
                    <img
                      src={zapraiser.author.picture}
                      alt={zapraiser.author.name || "Author"}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {zapraiser.author?.name ||
                        zapraiser.author?.display_name ||
                        "Anonymous"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(
                        zapraiser.created_at * 1000,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Zapraiser Content */}
                <div className="mb-6">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {zapraiser.content}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <ProgressBar
                    key={`${zapraiser.id}-${zapraiser.current}`}
                    current={zapraiser.current}
                    goal={zapraiser.goal}
                    label="Progress"
                  />
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    {zapraiser.current > 0
                      ? `${((zapraiser.current / zapraiser.goal) * 100).toFixed(1)}% funded`
                      : "No zaps yet"}
                  </span>
                  <span>
                    {zapraiser.goal - zapraiser.current > 0
                      ? `${(zapraiser.goal - zapraiser.current).toLocaleString()} sats remaining`
                      : "Goal reached! 🎉"}
                  </span>
                </div>

                {/* Zap Button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">
                    Note ID: {zapraiser.id}
                  </p>
                  <p className="text-xs text-gray-400">
                    Use this note ID in your favorite Nostr client to send zaps
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 text-lg mb-4">
              No active zapraisers found
            </p>
            <p className="text-gray-500">
              Check back later for new fundraising campaigns from our community
              members.
            </p>
          </div>
        )}
      </section>

      {/* Info Section */}
      <section className="mt-16 bg-gradient-to-r from-gray-50 to-orange-50 border border-gray-200 rounded-lg p-8">
        <h3 className="text-2xl font-bold mb-4 font-archivo-black">
          How to Zap
        </h3>
        <div className="prose max-w-none text-gray-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>Copy the note ID from any zapraiser above</li>
            <li>
              Paste it into your favorite Nostr client (like Snort, Coracle, or
              Damus)
            </li>
            <li>Click the zap button and enter your amount</li>
            <li>Send your sats and watch the progress bar update!</li>
          </ol>
          <p className="mt-4">
            Only whitelisted community members can create zapraisers, ensuring
            all campaigns are from trusted sources.
          </p>
        </div>
      </section>
    </div>
  );
}
