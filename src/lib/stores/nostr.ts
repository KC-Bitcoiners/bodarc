import { writable, derived, get } from "svelte/store";
import { browser } from "$app/environment";
import {
  generateSecretKey,
  getPublicKey,
  normalizeToSecretKey,
  npubEncode,
} from "applesauce-core/helpers";
import { isWhitelisted, nostrRelays } from "$lib/config";

// NIP-07 interface for browser extensions
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<any>;
      getRelays(): Promise<any>;
      nip04?: {
        encrypt?(pubkey: string, plaintext: string): Promise<string>;
        decrypt?(pubkey: string, ciphertext: string): Promise<string>;
      };
      nip44?: {
        encrypt?(pubkey: string, plaintext: string): Promise<string>;
        decrypt?(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

export interface NostrUser {
  pubkey: string;
  npub: string;
  privateKey?: string;
  metadata?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
    nip05?: string;
  };
}

// Create stores
export const user = writable<NostrUser | null>(null);
export const isLoading = writable<boolean>(true);
export const hasExtension = writable<boolean>(false);

// Initialize on client side
if (browser) {
  // Check for NIP-07 extension
  hasExtension.set(!!window.nostr);

  // Check for stored user data
  const storedUser = localStorage.getItem("nostr_user");
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      user.set(userData);
    } catch (error) {
      console.error("Failed to parse stored user data:", error);
      localStorage.removeItem("nostr_user");
    }
  }
  isLoading.set(false);
}

const fetchUserMetadata = async (pubkey: string) => {
  console.log("🔍 Fetching metadata for pubkey:", pubkey);

  try {
    const relays = nostrRelays;
    console.log("🌐 Connecting to relays for metadata:", relays);

    const filter = {
      kinds: [0],
      authors: [pubkey],
      limit: 1,
    };

    console.log("📤 Using metadata filter:", filter);

    // Try each relay until we get metadata
    for (const relayUrl of relays) {
      console.log(`🔌 Connecting to relay: ${relayUrl}`);

      try {
        const ws = new WebSocket(relayUrl);

        const metadataPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log(`⏰ Timeout on ${relayUrl}`);
            ws.close();
            reject(new Error("Timeout"));
          }, 5000);

          ws.onopen = () => {
            console.log(`✅ Connected to ${relayUrl}`);

            const reqMessage = JSON.stringify(["REQ", "metadata-sub", filter]);

            console.log(`📤 Sending REQ to ${relayUrl}:`, reqMessage);
            ws.send(reqMessage);
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log(`📨 Message from ${relayUrl}:`, message);

              if (message[0] === "EVENT") {
                const [type, subscriptionId, nostrEvent] = message;

                if (subscriptionId === "metadata-sub") {
                  clearTimeout(timeout);
                  console.log(
                    `🎯 Found metadata event from ${relayUrl}:`,
                    nostrEvent,
                  );

                  try {
                    const metadata = JSON.parse(nostrEvent.content);
                    console.log(
                      `✅ Successfully parsed metadata from ${relayUrl}:`,
                      metadata,
                    );

                    if (metadata.picture) {
                      console.log(`🖼️ Found picture URL: ${metadata.picture}`);
                    } else {
                      console.log(`⚠️ No picture in metadata for ${pubkey}`);
                    }

                    ws.close();
                    resolve(metadata);
                  } catch (parseError) {
                    console.error(
                      `❌ Failed to parse metadata content:`,
                      parseError,
                    );
                    console.log("Raw content:", nostrEvent.content);
                    reject(parseError);
                  }
                }
              } else if (message[0] === "EOSE") {
                console.log(`📭 End of stored events from ${relayUrl}`);
                clearTimeout(timeout);
                ws.close();
                reject(new Error("No metadata found"));
              }
            } catch (error) {
              console.error(
                `💥 Error parsing message from ${relayUrl}:`,
                error,
              );
            }
          };

          ws.onerror = (error) => {
            console.error(`💥 WebSocket error from ${relayUrl}:`, error);
            clearTimeout(timeout);
            reject(error);
          };

          ws.onclose = () => {
            console.log(`🔌 Closed connection to ${relayUrl}`);
            clearTimeout(timeout);
          };
        });

        return await metadataPromise;
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${relayUrl}:`, error);
        // Continue to next relay
      }
    }

    console.log(`❌ No metadata found for pubkey ${pubkey} from any relay`);
    return null;
  } catch (error) {
    console.error("💥 Critical error in fetchUserMetadata:", error);
    return null;
  }
};

export const login = async (privateKeyOrNsec?: string) => {
  try {
    let privateKey: Uint8Array;
    let pubkey: string;

    if (privateKeyOrNsec) {
      privateKey = normalizeToSecretKey(privateKeyOrNsec);
    } else {
      // Generate new key pair
      privateKey = generateSecretKey();
    }

    // Derive public key
    pubkey = await getPublicKey(privateKey);

    // Create npub encoding
    const npub = npubEncode(pubkey);

    // Check if user is whitelisted
    if (!isWhitelisted(npub)) {
      console.log("🚫 User not whitelisted:", npub);
      throw new Error(
        "This account is not whitelisted for calendar events. Only whitelisted users can access the calendar.",
      );
    }

    console.log("✅ User is whitelisted:", npub);

    const userData: NostrUser = {
      pubkey,
      npub,
      privateKey: privateKey.toString(), // Store for signing events
    };

    user.set(userData);
    if (browser) {
      localStorage.setItem("nostr_user", JSON.stringify(userData));
    }
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const loginWithExtension = async () => {
  if (!browser || !window.nostr) {
    throw new Error(
      "No nostr extension found. Please install a nostr extension like Alby, Snort, or Nos2x.",
    );
  }

  try {
    // Request public key from extension
    const pubkey = await window.nostr.getPublicKey();
    const npub = npubEncode(pubkey);

    // Check if the user is whitelisted
    if (!isWhitelisted(npub)) {
      console.log("🚫 User not whitelisted:", npub);
      throw new Error(
        "This account is not whitelisted for calendar events. Only whitelisted users can access the calendar.",
      );
    }

    console.log("✅ User is whitelisted:", npub);

    const userData: NostrUser = {
      pubkey,
      npub,
      // No private key when using extension - extension handles signing
    };

    user.set(userData);
    if (browser) {
      localStorage.setItem("nostr_user", JSON.stringify(userData));
    }

    // Fetch metadata in background
    fetchUserMetadata(pubkey).then((metadata) => {
      if (metadata) {
        const currentUser = get(user);
        if (currentUser) {
          const updatedUser = { ...currentUser, metadata };
          user.set(updatedUser);
          if (browser) {
            localStorage.setItem("nostr_user", JSON.stringify(updatedUser));
          }
        }
      }
    });
  } catch (error) {
    console.error("Extension login failed:", error);
    throw new Error("Failed to connect to nostr extension. Please try again.");
  }
};

export const refreshMetadata = async () => {
  const currentUser = get(user);
  if (!currentUser?.pubkey) return;

  try {
    const metadata = await fetchUserMetadata(currentUser.pubkey);
    if (metadata) {
      const updatedUser = { ...currentUser, metadata };
      user.set(updatedUser);
      if (browser) {
        localStorage.setItem("nostr_user", JSON.stringify(updatedUser));
      }
    }
  } catch (error) {
    console.error("Failed to refresh metadata:", error);
  }
};

export const logout = () => {
  user.set(null);
  if (browser) {
    localStorage.removeItem("nostr_user");
  }
};
