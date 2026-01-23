import config from "$lib/config";
import { EventStore } from "applesauce-core/event-store";
import {
  createEventLoaderForStore,
  createZapsLoader,
} from "applesauce-loaders/loaders";
import { RelayPool } from "applesauce-relay/pool";

export const eventStore = new EventStore();
export const pool = new RelayPool();

/** Create an event loader for loading normal and replaceable events */
export const eventLoader = createEventLoaderForStore(eventStore, pool, {
  lookupRelays: ["wss://index.hzrd149.com", "wss://purplepag.es"],
  extraRelays: config.nostr.relays,
});

/** Create a loader for loading zap events */
export const zapLoader = createZapsLoader(pool, {
  eventStore,
  extraRelays: config.nostr.relays,
});
