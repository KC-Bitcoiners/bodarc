/**
 * Application configuration object containing all site-wide settings, API endpoints,
 * and page-specific configurations.
 *
 * This config is imported and re-exported from `src/lib/config.ts` with additional
 * helper functions and type definitions.
 *
 * @see {@link src/lib/config.ts} - Main config module with exports and helpers
 */

import { decodePointer } from "applesauce-core/helpers";

const defaultConfig = {
  /**
   * Site-wide configuration used across the entire application.
   *
   * Used in:
   * - `src/lib/components/Layout.svelte` - Organization name in header/footer, logo alt text
   * - `src/lib/components/Nav.svelte` - Organization name, external links
   * - `src/lib/config.ts` - Exported as `siteConfig`, `siteTitle`, `siteDescription`, `organization`, `externalLinks`
   * - `src/lib/config.ts` - Used to generate `socialLinks` array for social media components
   */
  site: {
    /**
     * Site title used for SEO and page metadata.
     * Used in: `src/lib/config.ts` (exported as `siteTitle`)
     */
    title: "KC Bitcoin Meetup Group",
    /**
     * Site description for SEO meta tags and general site description.
     * Used in: `src/lib/config.ts` (exported as `siteDescription`)
     */
    description:
      "Bitcoin only group focused on fostering relationships and building community in Kansas City",
    /**
     * Organization information displayed in navigation, headers, and footers.
     *
     * Used in:
     * - `src/lib/components/Layout.svelte` - Organization name in logo, header, footer
     * - `src/lib/components/Nav.svelte` - Organization name next to logo
     * - `src/lib/config.ts` - Exported as `organization`
     */
    organization: {
      name: "KC Bitcoiners",
      location: "Kansas City",
      /**
       * Geographic coordinates for the organization location.
       * Used for map displays and location-based features.
       */
      coordinates: {
        lat: 39.03219,
        lon: -94.58101,
      },
    },
    /**
     * External links displayed in navigation and social links components.
     *
     * Used in:
     * - `src/lib/components/Layout.svelte` - Meetup.com link in navigation
     * - `src/lib/components/Nav.svelte` - Meetup.com link in desktop/mobile nav
     * - `src/lib/components/SocialLinks.svelte` - All links with icons converted to socialLinks array
     * - `src/lib/config.ts` - Exported as `externalLinks`, used by `getMeetupUrl()`, `getGithubUrl()`, `getExternalLink()`
     * - `src/routes/events/+page.svelte` - Meetup URL via `getMeetupUrl()` helper
     */
    externalLinks: {
      /**
       * GitHub repository link with icon for social links.
       * Used in: `src/lib/components/SocialLinks.svelte`, `src/lib/config.ts` (via `getGithubUrl()`)
       */
      GitHub: {
        url: "https://github.com/KC-Bitcoiners/website",
        icon: "GitHubIcon",
        ariaLabel: "Visit our GitHub repository",
      },
      /**
       * Meetup.com group link and URL name for API calls.
       *
       * Used in:
       * - `src/lib/components/Layout.svelte` - Navigation link
       * - `src/lib/components/Nav.svelte` - Desktop and mobile navigation
       * - `src/lib/config.ts` - `getMeetupUrl()` helper function
       * - `src/routes/events/+page.svelte` - Call-to-action buttons and links
       * - `src/lib/meetup.ts` - `urlname` used in GraphQL queries to fetch events
       */
      meetup: {
        urlname: "kansas-city-bitcoin-meetup-group",
        url: "https://www.meetup.com/kansas-city-bitcoin-meetup-group/",
      },
    },
    /**
     * Image assets configuration for logos and icons.
     *
     * Used in:
     * - `src/lib/components/Layout.svelte` - Logo display with fallback
     */
    images: {
      logo: "/logo.svg",
      logoFallback: "/logo.jpeg",
    },
  },
  /**
   * Nostr protocol configuration for decentralized event publishing and calendar features.
   *
   * Used in:
   * - `src/lib/services/nostr.ts` - Relay pool configuration via `config.nostr.relays`
   * - `src/lib/stores/nostr.ts` - User authentication and whitelist checking via `isWhitelisted()`
   * - `src/lib/config.ts` - Exported as `nostrConfig`, `nostrRelays`, `whitelistedNpubs`
   * - `src/lib/config.ts` - Converted to `WHITELISTED_PUBKEYS` for relay queries
   * - `src/routes/calendar/+page.svelte` - Whitelist checking for calendar access
   * - `src/routes/shop/+page.svelte` - Relay configuration for vendor events
   */
  nostr: {
    /**
     * Community-specific relay URL (currently not actively used in codebase).
     * Reserved for future community relay integration.
     */
    communityRelay: "wss://relay.kcbitcoiners.com",
    /**
     * List of Nostr relay URLs used for publishing and subscribing to events.
     *
     * Used in:
     * - `src/lib/services/nostr.ts` - Passed to `eventLoader` as `extraRelays`
     * - `src/routes/shop/+page.svelte` - Vendor event fetching and publishing
     * - `src/lib/config.ts` - Exported as `nostrRelays`
     */
    relays: [
      "wss://relay.kcbitcoiners.com",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.snort.social",
    ],
    /**
     * Whitelisted Nostr public keys (npubs) allowed to create calendar events and vendor entries.
     *
     * Used in:
     * - `src/lib/config.ts` - Converted to hex format as `WHITELISTED_PUBKEYS` for relay filters
     * - `src/lib/stores/nostr.ts` - `isWhitelisted()` function checks user login against this list
     * - `src/lib/config.ts` - `getWhitelistFilter()` creates relay query filters with these authors
     * - `src/routes/calendar/+page.svelte` - Imported as `WHITELISTED_NPUBS` for display/validation
     * - `src/routes/shop/+page.svelte` - Vendor event filtering via `getWhitelistFilter()`
     */
    whitelistedNpubs: [
      "npub16ux4qzg4qjue95vr3q327fzata4n594c9kgh4jmeyn80v8k54nhqg6lra7",
      "npub1nrswn76gtr6apep95rev06y0cylk2t7utqyw9yn5x7qv8atgn3fscmpv2z",
      "npub187w4ykkurr3e89mm0rg5p49x6lveqtq0pp0um7qyk6xyrpeerx3s84exkz",
      "npub1nv5c7sj2zxtjv7uayp2q2mneymm39mfp93wjhl5287y6yp6ey02qrsjhcn",
      "npub1yvscx9vrmpcmwcmydrm8lauqdpngum4ne8xmkgc2d4rcaxrx7tkswdwzdu",
    ],
  },
  /**
   * Page-specific configurations for different routes in the application.
   *
   * Used in:
   * - `src/lib/config.ts` - Exported as `pagesConfig` and individual page configs
   * - Various route components (`+page.svelte` files) for page-specific content
   */
  pages: {
    /**
     * Home page configuration.
     *
     * Used in:
     * - `src/routes/+page.svelte` - All home page content (title, meta tags, hero section, topics, CTA buttons)
     */
    home: {
      /**
       * Page title displayed in the page header.
       * Used in: `src/routes/+page.svelte`
       */
      title: "KC Bitcoiners",
      /**
       * SEO meta tags for the home page.
       * Used in: `src/routes/+page.svelte` - `<title>` and `<meta name="description">` tags
       */
      meta: {
        title: "KC Bitcoin Meetup Group",
        description:
          "Bitcoin only group focused on fostering relationships and building community in Kansas City",
      },
      /**
       * Hero section content displayed prominently on the home page.
       * Used in: `src/routes/+page.svelte` - Hero title, description, and topics list
       */
      hero: {
        title: "KC Bitcoiners",
        description:
          "We are a Bitcoin only group focused on fostering relationships and building community. We meet twice monthly throughout the Kansas City metro area.",
        topics: {
          intro:
            "Whether you're new to Bitcoin or a long time HODLer this group is for you. Meetups include discussions on topics such as:",
          list: [
            "Economics",
            "Protocol & Software",
            "Digital Wallets",
            "Investing",
            "Mining",
            "And all other topics Bitcoin!",
          ],
        },
      },
      /**
       * Call-to-action section at the bottom of the home page.
       * Used in: `src/routes/+page.svelte` - CTA title and button configurations
       */
      callToAction: {
        title: "Ready to Join the Community?",
        buttons: [
          {
            text: "Join Our Meetups",
            url: "https://www.meetup.com/kansas-city-bitcoin-meetup-group/",
            style: "primary",
          },
          {
            text: "Support Us",
            url: "#",
            style: "secondary",
          },
        ],
      },
    },
    /**
     * Calendar page configuration for the interactive calendar view.
     *
     * Used in:
     * - `src/routes/calendar/+page.svelte` - Calendar view settings and event display
     * - `src/lib/meetup.ts` - Meetup API configuration for fetching events
     */
    calendar: {
      /**
       * Page title for the calendar route.
       */
      title: "Calendar",
      /**
       * SEO meta tags for the calendar page.
       */
      meta: {
        title: "Calendar - KC Bitcoiners",
        description: "Community calendar for KC Bitcoiners events and meetups",
      },
      /**
       * Meetup.com API configuration for fetching events.
       *
       * Used in:
       * - `src/lib/meetup.ts` - `graphqlUrl` for GraphQL client, `groupName` in GraphQL queries
       * - `src/lib/config.ts` - Exported as `meetupConfig`
       * - `src/routes/calendar/+page.ts` - Server-side data loading
       */
      api: {
        meetup: {
          graphqlUrl: "https://api.meetup.com/gql-ext",
          groupName: "kansas-city-bitcoin-meetup-group",
        },
      },
      /**
       * Default calendar view mode (month/week/day).
       * Used in: `src/routes/calendar/+page.svelte` - Initial view state
       */
      defaultView: "month",
      /**
       * Color classes for event cards in the calendar view.
       * Used for styling different event types in the calendar UI.
       */
      eventColors: [
        "bg-purple-500 border-purple-600",
        "bg-green-500 border-green-600",
        "bg-yellow-500 border-yellow-600",
        "bg-pink-500 border-pink-600",
        "bg-indigo-500 border-indigo-600",
      ],
      /**
       * Color class for Meetup.com events.
       * Used to distinguish Meetup events from other event sources.
       */
      meetupColor: "bg-bitcoin-orange border-bitcoin-orange",
      /**
       * Default color class for events without a specific color assignment.
       */
      defaultColor: "bg-gray-50 border-gray-200",
      /**
       * Labels for calendar statistics display.
       * Used for showing total, upcoming, and past event counts.
       */
      statistics: {
        total: "Total",
        upcoming: "Upcoming",
        past: "Past",
      },
      /**
       * Default event settings for new event creation forms.
       * Used as default values when creating new calendar events.
       */
      defaultEvent: {
        durationHours: 2,
        startTime: "12:00",
        endTime: "14:00",
      },
    },
    /**
     * Events listing page configuration.
     *
     * Used in:
     * - `src/routes/events/+page.svelte` - All page content, sections, and iCalendar export
     */
    events: {
      /**
       * Page title for the events route.
       */
      title: "Events",
      /**
       * SEO meta tags for the events page.
       * Used in: `src/routes/events/+page.svelte` - Page metadata
       */
      meta: {
        title: "Events - KC Bitcoiners",
        description:
          "Bitcoin meetups, educational sessions, and community building in Kansas City",
      },
      /**
       * Header section content for the events page.
       * Used in: `src/routes/events/+page.svelte` - Page header title and description
       */
      header: {
        title: "Events",
        description:
          "Join us for Bitcoin meetups, educational sessions, and community building in Kansas City. All skill levels welcome - from Bitcoin beginners to seasoned hodlers!",
      },
      /**
       * Section-specific content for upcoming and past events.
       * Used in: `src/routes/events/+page.svelte` - Section titles and empty state messages
       */
      sections: {
        upcoming: {
          title: "Upcoming Events",
          noEventsMessage: "No upcoming events scheduled at the moment.",
          followUsMessage:
            "Check back soon or follow us on Meetup.com for the latest updates!",
        },
        past: {
          title: "Past Events",
          showingRecentMessage: "Showing the 5 most recent past events.",
          viewAllText: "View all past events on Meetup.com",
        },
      },
      /**
       * Call-to-action section at the bottom of the events page.
       * Used in: `src/routes/events/+page.svelte` - CTA section with button
       */
      callToAction: {
        title: "Stay Connected",
        description:
          "Don't miss out on any Bitcoin discussions and networking opportunities. Join our Meetup group to get notified about new events and connect with fellow Bitcoin enthusiasts in Kansas City.",
        buttonText: "Join Our Meetup Group",
      },
      /**
       * iCalendar export configuration for downloadable calendar files.
       *
       * Used in:
       * - `src/routes/events/+page.svelte` - Calendar download button and webcal link
       * - `src/lib/utils/icalendar.ts` - iCalendar file generation (domain, prodId, description, timezone)
       * - `src/lib/config.ts` - Exported as `icalConfig`
       */
      calendar: {
        /**
         * Webcal URL for subscribing to events calendar.
         * Used in: `src/routes/events/+page.svelte` - Calendar subscription link
         */
        webcalUrl: "webcal://kcbitcoiners.com/events.ics",
        /**
         * Filename for downloaded iCalendar file.
         * Used in: `src/routes/events/+page.svelte` - Download link filename
         */
        downloadFilename: "kansas-city-bitcoin-events.ics",
        /**
         * Button text for calendar download/subscription.
         * Used in: `src/routes/events/+page.svelte` - Calendar button label
         */
        buttonText: "🗓️ Add to Calendar",
        /**
         * iCalendar file generation settings.
         *
         * Used in:
         * - `src/lib/utils/icalendar.ts` - All iCalendar properties (domain, prodId, defaultDescription, timezone)
         * - `src/lib/config.ts` - Exported as `icalConfig`
         */
        ical: {
          /**
           * Domain used in iCalendar UID generation.
           * Used in: `src/lib/utils/icalendar.ts` - `generateEventUID()` function
           */
          domain: "kansas-city-bitcoin-meetup.com",
          /**
           * Product identifier for iCalendar files.
           * Used in: `src/lib/utils/icalendar.ts` - PRODID field in iCalendar output
           */
          prodId: "//Kansas City Bitcoiners//Events//EN",
          /**
           * Default description for events without descriptions.
           * Used in: `src/lib/utils/icalendar.ts` - DESCRIPTION field fallback
           */
          defaultDescription: "Bitcoin meetups and events in Kansas City",
          /**
           * Timezone for iCalendar events.
           * Used in: `src/lib/utils/icalendar.ts` - X-WR-TIMEZONE field
           */
          timezone: "America/Chicago",
        },
      },
    },
    /**
     * Shop/Vendors page configuration for Bitcoin-accepting businesses directory.
     *
     * Used in:
     * - `src/routes/shop/+page.svelte` - Vendor directory page
     * - `src/lib/utils/btcmap.ts` - BTCMap API integration
     */
    shop: {
      /**
       * Page title for the shop/vendors route.
       */
      title: "Bitcoin Vendors",
      /**
       * SEO meta tags for the shop page.
       */
      meta: {
        title: "Bitcoin Vendors - KC Bitcoiners",
        description: "Directory of Bitcoin-accepting businesses in Kansas City",
      },
      /**
       * Page description text.
       * Used for page header or description sections.
       */
      description:
        "Directory of Bitcoin-accepting businesses and vendors in Kansas City area",
      /**
       * Location name for the vendor directory.
       */
      location: "Kansas City",
      /**
       * Geographic coordinates for the shop/vendor directory center point.
       * Used for map centering and location-based features.
       */
      coordinates: {
        lat: 39.03219,
        lon: -94.58101,
      },
      /**
       * BTCMap API configuration for fetching Bitcoin-accepting vendors from OpenStreetMap.
       *
       * Used in:
       * - `src/lib/utils/btcmap.ts` - All BTCMap API calls (`overpassUrl`, `defaultBounds`, `userAgent`)
       * - `src/lib/config.ts` - Exported as `btcmapConfig`
       * - `src/routes/shop/+page.svelte` - Vendor fetching via `fetchBTCMapVendors()`
       */
      api: {
        btcmap: {
          /**
           * Overpass API endpoint URL for querying OpenStreetMap data.
           * Used in: `src/lib/utils/btcmap.ts` - `fetchBTCMapVendors()` function
           */
          overpassUrl: "https://overpass-api.de/api/interpreter",
          /**
           * Default geographic bounds for vendor searches (Kansas City metro area).
           * Used in: `src/lib/utils/btcmap.ts` - Overpass query bounding box
           */
          defaultBounds: {
            minLat: 38.5,
            maxLat: 39.5,
            minLon: -95.5,
            maxLon: -93.5,
          },
          /**
           * User-Agent string for BTCMap API requests.
           * Used in: `src/lib/utils/btcmap.ts` - HTTP request headers
           */
          userAgent: "BitcoinVendorDirectory/1.0",
        },
      },
      /**
       * Map display configuration for vendor locations.
       * Used for initializing map views and centering.
       */
      map: {
        /**
         * Map center coordinates.
         * Used for initial map viewport positioning.
         */
        center: {
          lat: 39.03219,
          lon: -94.58101,
        },
        /**
         * Default zoom level for the map.
         * Used for initial map zoom setting.
         */
        defaultZoom: 12,
        /**
         * Padding around map bounds when fitting markers.
         * Used for map viewport calculations.
         */
        boundsPadding: [50, 50],
      },
      /**
       * Call-to-action section for vendor submission.
       * Used in: `src/routes/shop/+page.svelte` - CTA section encouraging vendor submissions
       */
      callToAction: {
        title: "Know a Bitcoin-Accepting Business?",
        description:
          "Help grow this decentralized vendor directory! If you know of a local business that accepts Bitcoin, submit their information to the Nostr network.",
        buttonText: "Submit New Vendor",
      },
    },
  },
};

// Named export of the config object
export const config = defaultConfig;

// Re-export default config
export default defaultConfig;

// Helper exports for easier access
export const siteConfig = defaultConfig.site;
export const siteTitle = defaultConfig.site.title;
export const siteDescription = defaultConfig.site.description;
export const organization = defaultConfig.site.organization;
export const externalLinks = defaultConfig.site.externalLinks;

// Nostr configuration exports
export const nostrConfig = defaultConfig.nostr;
export const nostrRelays = defaultConfig.nostr.relays;
export const whitelistedNpubs = defaultConfig.nostr.whitelistedNpubs;

// Convert whitelisted npubs to hex pubkeys for relay queries
export const WHITELISTED_PUBKEYS: string[] =
  defaultConfig.nostr.whitelistedNpubs
    .map((npub: string) => {
      try {
        const { type, data } = decodePointer(npub);
        if (type !== "npub") {
          console.error(`Invalid npub type: ${type}`);
          return "";
        }
        const pubkeyBytes = data as unknown as Uint8Array;
        return Array.from(pubkeyBytes)
          .map((b: number) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch (error) {
        console.error(`Failed to decode npub ${npub}:`, error);
        return "";
      }
    })
    .filter(Boolean);

// Export whitelisted npubs as a constant array
export const WHITELISTED_NPUBS = defaultConfig.nostr.whitelistedNpubs;

// Check if a user's npub is whitelisted
export function isWhitelisted(npub: string): boolean {
  return defaultConfig.nostr.whitelistedNpubs.includes(npub);
}

// Create a relay filter for whitelisted authors
export function getWhitelistFilter() {
  return {
    authors: WHITELISTED_PUBKEYS,
  };
}

// Social links array for SocialLinks component
export const socialLinks = Object.entries(defaultConfig.site.externalLinks)
  .filter(([_, link]) => {
    // Only include links that have an icon property (like GitHub)
    return "icon" in link && link.icon && link.url;
  })
  .map(([name, link]) => {
    // TypeScript now knows link has icon property due to filter
    const linkWithIcon = link as {
      url: string;
      icon: string;
      ariaLabel?: string;
    };
    return {
      name,
      url: linkWithIcon.url,
      icon: linkWithIcon.icon,
      ariaLabel: linkWithIcon.ariaLabel || `Visit our ${name} page`,
    };
  });

// Page-specific config exports
export const pagesConfig = defaultConfig.pages;
export const eventsConfig = defaultConfig.pages.events;
export const meetupConfig = defaultConfig.pages.calendar.api.meetup;
export const btcmapConfig = defaultConfig.pages.shop.api.btcmap;
export const icalConfig = defaultConfig.pages.events.calendar.ical;

// Helper function to get Meetup URL
export function getMeetupUrl(): string {
  return defaultConfig.site.externalLinks.meetup.url;
}
