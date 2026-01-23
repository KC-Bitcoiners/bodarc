You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Avaliable Libraries:

## Available Tools:

### @lucide/svelte Icon Library

The **@lucide/svelte** tool allows AI agents to leverage a wide array of modern SVG icons as ready-made Svelte components. Lucide icons help enhance UI clarity and provide visual cues within generated interfaces or code suggestions.

#### How AI agents can use @lucide/svelte:

- **Insert Customizable Icons in Svelte Output**: Effortlessly add icons to responses or UI code by importing them (e.g. `import { Plus, Trash } from '@lucide/svelte'`) and using them as Svelte components.
- **Dynamic Styling**: Adapt icon size, color, and style through standard Svelte props or Tailwind/utility classes, helping agents tailor icons to match any generated UI theme.
- **Consistent Visual Language**: Promote best practices by recommending icons that maintain a unified and accessible look across projects.
- **Discoverable Icon Set**: Agents can quickly browse or suggest suitable icons for different use-cases, thanks to the searchable catalog at [lucide.dev/icons](https://lucide.dev/icons).

AI agents should use @lucide/svelte components when suggesting Svelte UI code that needs standardized, flexible icons—improving developer experience and UI accessibility.

### nostr Tool

The **nostr** tool gives you access to documentation and features related to the [Nostr protocol](https://nostr.com/), which is a decentralized social network protocol. This tool makes it easy to access up-to-date docs, code snippets, and development workflows relevant to building on or integrating with Nostr.

#### What you can do with the nostr tool:

- **Access Protocol Documentation**: Retrieve comprehensive documentation about Nostr's event structures, relay communication, cryptographic keys, and best practices.
- **Find Code Examples**: Search and retrieve ready-to-use code snippets for common tasks such as publishing events, verifying signatures, subscribing to relays, and more.
- **API Reference**: Quickly look up API documentation for existing Nostr libraries, client implementations, and standards.
- **Guides and How-To's**: Find step-by-step development guides for onboarding, running a relay, creating a client, or integrating Nostr features into apps.
- **Recent Improvements**: Stay up-to-date with the latest protocol extensions (NIPs), new community libraries, and updates within the Nostr ecosystem.

### daisyui Tool

The **daisyui** tool provides documentation, guides, and code snippets related to the DaisyUI component library for Tailwind CSS.

#### What you can do with the daisyui tool:

- **Find UI Component Examples**: Retrieve ready-to-use DaisyUI components and examples.
- **Get Customization Tips**: Learn how to customize themes, styles, and component options in DaisyUI.
- **Integrate with SvelteKit**: Access best practices and snippets for using DaisyUI in Svelte or SvelteKit projects.
- **Look Up API and Utilities**: Quickly find references for DaisyUI plugin usage, configuration, and advanced utility classes.

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
