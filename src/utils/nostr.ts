import { NostrEvent } from "applesauce-core/helpers/event";

// Simple nostr utilities for basic functionality
export class NostrUtils {
  // Create a coordinate for replaceable events
  static createCoordinate(
    kind: number,
    pubkey: string,
    identifier: string,
  ): string {
    return `${kind}:${pubkey}:${identifier}`;
  }

  // Parse a coordinate string
  static parseCoordinate(
    coordinate: string,
  ): { kind: number; pubkey: string; identifier: string } | null {
    const parts = coordinate.split(":");
    if (parts.length !== 3) return null;

    const [kindStr, pubkey, identifier] = parts;
    const kind = parseInt(kindStr, 10);

    if (isNaN(kind) || !pubkey || !identifier) return null;

    return { kind, pubkey, identifier };
  }

  // Get tag value from event
  static getTagValue(
    event: NostrEvent,
    tagName: string,
    index: number = 0,
  ): string | undefined {
    const tag = event.tags.find((tag) => tag[0] === tagName);
    return tag ? tag[index + 1] : undefined;
  }

  // Extract event identifier from tags
  static getEventIdentifier(event: NostrEvent): string | undefined {
    return this.getTagValue(event, "d");
  }

  // Filter events by time range
  static filterByTimeRange(
    events: NostrEvent[],
    startTime?: number,
    endTime?: number,
  ): NostrEvent[] {
    return events.filter((event) => {
      if (startTime && event.created_at < startTime) return false;
      if (endTime && event.created_at > endTime) return false;
      return true;
    });
  }

  // Deduplicate replaceable events (keep latest)
  static deduplicateReplaceableEvents(events: NostrEvent[]): NostrEvent[] {
    const coordinateMap = new Map<string, NostrEvent>();

    events.forEach((event) => {
      // Only process replaceable event kinds
      if (![31922, 31923, 30311, 30312, 30313].includes(event.kind)) {
        // For non-replaceable events, just add them
        coordinateMap.set(`${event.id}`, event);
        return;
      }

      const identifier = this.getEventIdentifier(event);
      if (!identifier) return;

      const coordinate = this.createCoordinate(
        event.kind,
        event.pubkey,
        identifier,
      );
      const existing = coordinateMap.get(coordinate);

      // Keep the newer event
      if (!existing || event.created_at > existing.created_at) {
        coordinateMap.set(coordinate, event);
      }
    });

    return Array.from(coordinateMap.values());
  }

  // Create a basic text note event (kind 1)
  static createTextNote(
    content: string,
    privateKey: string,
  ): Partial<NostrEvent> {
    return {
      kind: 1,
      content,
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Create a calendar event (kind 31922)
  static createCalendarEvent(
    title: string,
    startTime: Date,
    endTime?: Date,
    location?: string,
    description?: string,
    privateKey?: string,
  ): Partial<NostrEvent> {
    const tags: string[][] = [];

    // Add title tag
    tags.push(["title", title]);

    // Add start time
    tags.push(["start", Math.floor(startTime.getTime() / 1000).toString()]);

    // Add end time if provided
    if (endTime) {
      tags.push(["end", Math.floor(endTime.getTime() / 1000).toString()]);
    }

    // Add location if provided
    if (location) {
      tags.push(["location", location]);
    }

    // Generate a unique identifier for this event
    const identifier = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    tags.push(["d", identifier]);

    return {
      kind: 31922,
      content: description || title,
      tags,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Validate event structure
  static validateEvent(event: Partial<NostrEvent>): boolean {
    return !!(
      event.kind &&
      event.content !== undefined &&
      event.created_at &&
      Array.isArray(event.tags)
    );
  }
}

export default NostrUtils;
