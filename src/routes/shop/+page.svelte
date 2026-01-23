<script lang="ts">
	import { browser } from "$app/environment";
	import VendorForm from "$lib/components/VendorForm.svelte";
	import { getWhitelistFilter, nostrRelays, config } from "$lib/config";
	import { pool } from "$lib/nostr";
	import { user } from "$lib/stores/nostr";
	import type { BTCMapVendor } from "$lib/utils/btcmap";
	import { AlertTriangle, Bitcoin, Clock, Edit, Globe, Link, Mail, Map, MapPin, Phone, Search, Store, Trash2, Zap } from "@lucide/svelte";
	import { getEventHash, type NostrEvent } from "applesauce-core/helpers/event";
	import { onMount } from "svelte";
	import type { Map as LeafletMap, Marker, DivIcon, LatLngBounds } from "leaflet";
	import L from "leaflet";
	import "leaflet/dist/leaflet.css";

	// Relay configuration for Nostr operations
	const RELAYS = nostrRelays;

	interface NostrVendor {
		id: string;
		name: string;
		category: string;
		lightning: boolean;
		onchain: boolean;
		lightningAddress?: string;
		onchainAddress?: string;
		address: string;
		lat?: number;
		lon?: number;
		email?: string;
		twitter?: string;
		phone?: string;
		website?: string;
		description?: string;
		openingHours?: string;
		images?: string[];
		npub: string;
		eventId: string;
		createdAt: number;
		dTag: string; // Store the dTag for replaceable events
		// For submitter profile info
		submitterName?: string;
		submitterPicture?: string;
	}

	type SortField = keyof NostrVendor | "submitterName";
	type SortDirection = "asc" | "desc";

	let sortField = $state<SortField>("name");
	let sortDirection = $state<SortDirection>("desc");
	let filters = $state<Record<string, string>>({
		name: "",
		category: "",
		submitterName: ""
	});
	let showVendorForm = $state(false);
	let successMessage = $state<{ eventId: string; naddr: string } | null>(null);
	let editVendor = $state<NostrVendor | null>(null);
	let isEdit = $state(false);
	let vendorCardRefs = $state<{ [key: string]: HTMLElement | null }>({});
	let mapContainer: HTMLDivElement | null = $state(null);
	let map: LeafletMap | null = $state(null);
	let markers: Marker[] = $state([]);

	// Get BTCMap vendors from page data (loaded server-side)
	const { data } = $props();

	// BTCMap vendors from server-side load (reactive from props)
	const btcMapVendors = $derived(data.btcMapVendors || []);
	const btcMapError = $derived(data.btcMapError);

	// Nostr vendors state (loaded client-side due to WebSocket requirements)
	let nostrVendors = $state<NostrVendor[]>([]);
	let isLoadingNostr = $state(false);
	let nostrError = $state<string | null>(null);

	// Fetch vendor profile info
	const fetchSubmitterProfile = async (
		npub: string
	): Promise<{ name?: string; picture?: string }> => {
		try {
			const relays = nostrRelays;

			const filter = {
				kinds: [0], // Metadata event
				authors: [npub]
			};

			const eventsPromise = new Promise<NostrEvent[]>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error("Request timeout"));
				}, 10000); // 10 second timeout

				const events: NostrEvent[] = [];

				pool.request(relays, filter).subscribe({
					next: (event: NostrEvent) => {
						events.push(event);
					},
					error: (error) => {
						clearTimeout(timeout);
						reject(error);
					},
					complete: () => {
						clearTimeout(timeout);
						resolve(events);
					}
				});
			});

			const events = await eventsPromise;
			if (events.length > 0) {
				const metadata = JSON.parse(events[0].content);
				return {
					name: metadata.name,
					picture: metadata.picture
				};
			}
		} catch (error) {
			console.warn("Failed to fetch profile for", npub, error);
		}
		return {};
	};

	// Fetch nostr vendors on component mount (client-side only due to WebSocket requirements)
	onMount(() => {
		const fetchNostrVendors = async () => {
			if (!browser) return; // Only run in browser

			isLoadingNostr = true;
			nostrError = null;

			try {
				const relays = nostrRelays;

				// Use whitelist filter to only get events from whitelisted users
				const whitelistFilter = getWhitelistFilter();

				// Modify the whitelist filter for vendor events (kind 30333 instead of calendar kinds)
				const filter = {
					...whitelistFilter,
					kinds: [30333], // Custom Bitcoin Vendor Directory kind
					limit: 100
				};

				const eventsPromise = new Promise<NostrEvent[]>((resolve, reject) => {
					const timeout = setTimeout(() => {
						console.log(`⏰ Request timeout`);
						reject(new Error("Request timeout"));
					}, 30000); // 30 second timeout for all relays

					const events: NostrEvent[] = [];

					pool.request(relays, filter).subscribe({
						next: (event: NostrEvent) => {
							events.push(event);
						},
						error: (error) => {
							console.error(`💥 Error fetching vendor events:`, error);
							clearTimeout(timeout);
							reject(error);
						},
						complete: () => {
							console.log(`📭 End of stored vendor events`);
							clearTimeout(timeout);
							resolve(events);
						}
					});
				});

				const events = await eventsPromise;
				console.log(
					"📝 Fetching nostr vendor events:",
					events.length,
					"total events found from whitelisted authors only"
				);

				const vendors: NostrVendor[] = [];
				let skippedEvents = 0;

				for (const event of events) {
					try {
						let data;
						try {
							data = JSON.parse(event.content);
						} catch {
							// Quietly skip invalid JSON events - these are likely not vendor events
							skippedEvents++;
							continue;
						}

						// Extract dTag from tags for replaceable events
						const dTag =
							event.tags.find((tag: string[]) => tag[0] === "d")?.[1] ||
							`vendor-${event.id}`;

						// Parse lat/lon from location tag if available
						let lat: number | undefined;
						let lon: number | undefined;
						const locationTag = event.tags.find((tag: string[]) => tag[0] === "location");
						if (locationTag && locationTag[1]) {
							const coords = locationTag[1].split(",");
							if (coords.length === 2) {
								lat = parseFloat(coords[0]);
								lon = parseFloat(coords[1]);
							}
						}

						// Get submitter profile info
						const profileInfo = await fetchSubmitterProfile(event.pubkey);

						const vendor: NostrVendor = {
							id: data.id || event.id,
							name: data.name || "Unknown Vendor",
							category: data.category || "General",
							lightning: data.lightning || false,
							onchain: data.onchain || false,
							lightningAddress: data.lightningAddress,
							onchainAddress: data.onchainAddress,
							address: data.address || "No address provided",
							lat,
							lon,
							email: data.email,
							twitter: data.twitter,
							phone: data.phone,
							website: data.website,
							description: data.description,
							openingHours: data.openingHours,
							images: data.images,
							npub: event.pubkey,
							eventId: event.id,
							createdAt: event.created_at,
							dTag, // Store the dTag for replaceable events
							submitterName: profileInfo.name,
							submitterPicture: profileInfo.picture
						};

						vendors.push(vendor);
					} catch (parseError) {
						console.warn("Failed to parse vendor event:", event.id, parseError);
					}
				}

				// Sort by creation date (newest first) by default
				vendors.sort((a, b) => b.createdAt - a.createdAt);
				nostrVendors = vendors;

				// Update map markers after vendors are loaded
				// Use filteredAndSortedVendors which will include both nostr and btcMap vendors
				updateMapMarkers(filteredAndSortedVendors);

				// Log summary
				if (skippedEvents > 0) {
					console.log(
						`📊 Nostr vendor summary: ${vendors.length} valid vendors, ${skippedEvents} non-vendor events skipped`
					);
				} else {
					console.log(`📊 Nostr vendor summary: ${vendors.length} valid vendors found`);
				}
			} catch (error) {
				console.error("Error fetching nostr vendors:", error);
				nostrError =
					error instanceof Error ? error.message : "Failed to fetch nostr vendors";
			} finally {
				isLoadingNostr = false;
			}
		};

		fetchNostrVendors();
	});

	// Initialize map when container is ready
	$effect(() => {
		if (browser && mapContainer && !map) {
			initializeMap();
		}
	});

	// Update map when filtered vendors change
	$effect(() => {
		if (browser && map) {
			// Capture vendors at this point to avoid reading reactive state inside updateMapMarkers
			const vendors = filteredAndSortedVendors;
			updateMapMarkers(vendors);
		}
	});

	// Apply filters and sorting to all vendors
	const filteredAndSortedVendors = $derived.by(() => {
		let result = [...nostrVendors, ...btcMapVendors];

		// Apply filters
		Object.keys(filters).forEach((key) => {
			const filterValue = filters[key].toLowerCase();
			if (filterValue) {
				result = result.filter((vendor) => {
					if (key === "submitterName") {
						// Handle both Nostr and BTCMap vendors
						if (filterValue === "btcmap") {
							// Show only BTCMap vendors
							return !("submitterName" in vendor);
						} else {
							// Show Nostr vendors with matching submitter name
							return (
								"submitterName" in vendor &&
								(vendor.submitterName || "").toLowerCase().includes(filterValue)
							);
						}
					}
					return (
						vendor[key as keyof (NostrVendor | BTCMapVendor)]?.toString() || ""
					).toLowerCase().includes(filterValue);
				});
			}
		});

		// Apply sorting
		result.sort((a, b) => {
			let aValue: string | number | undefined = a[
				sortField as keyof (NostrVendor | BTCMapVendor)
			] as string | number | undefined;
			let bValue: string | number | undefined = b[
				sortField as keyof (NostrVendor | BTCMapVendor)
			] as string | number | undefined;

			if (sortField === "submitterName") {
				if ("submitterName" in a) {
					aValue = a.submitterName || "";
				} else {
					aValue = "BTCMap"; // Sort BTCMap vendors as "BTCMap"
				}

				if ("submitterName" in b) {
					bValue = b.submitterName || "";
				} else {
					bValue = "BTCMap"; // Sort BTCMap vendors as "BTCMap"
				}
			}

			// Handle string comparison
			if (typeof aValue === "string" && typeof bValue === "string") {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}

			// Handle undefined/null values
			if (aValue === undefined || aValue === null) aValue = "";
			if (bValue === undefined || bValue === null) bValue = "";

			if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
			if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});

		return result;
	});

	// Handle sort
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			sortDirection = sortDirection === "asc" ? "desc" : "asc";
		} else {
			sortField = field;
			sortDirection = "asc";
		}
	};

	// Handle filter change
	const handleFilterChange = (field: string, value: string) => {
		filters = {
			...filters,
			[field]: value
		};
	};

	// Create custom pin icon
	const createPinIcon = (
		hasLightning: boolean,
		hasOnchain: boolean
	): DivIcon | undefined => {
		if (!browser) return undefined;

		// Use Bitcoin symbol by default, Lightning if available
		const paymentIcon = hasLightning ? "⚡" : "₿";

		const iconHtml = `
			<div class="bg-bitcoin-orange text-white rounded-full shadow-lg flex items-center justify-center text-xl font-bold" style="width: 32px; height: 32px; border: 3px solid white; font-family: system-ui, -apple-system, sans-serif;">
				${paymentIcon}
			</div>
		`;

		return L.divIcon({
			html: iconHtml,
			className: "custom-div-icon",
			iconSize: [32, 32],
			iconAnchor: [16, 16],
			popupAnchor: [0, -16]
		});
	};

	// Initialize map
	const initializeMap = () => {
		if (!browser || !mapContainer || map) return;

		// Fix for default markers in Leaflet
		delete (L.Icon.Default.prototype as any)._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
			iconUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
			shadowUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
		});

		// Create map
		const newMap = L.map(mapContainer, {
			center: [
				config.site.organization.coordinates.lat,
				config.site.organization.coordinates.lon
			],
			zoom: 12
		});

		// Add tile layer
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(newMap);

		map = newMap;
		updateMapMarkers();
	};

	// Update map markers when vendors change
	const updateMapMarkers = (vendorsToUse = filteredAndSortedVendors) => {
		if (!browser || !map) return;

		// Remove existing markers
		markers.forEach((marker) => {
			map?.removeLayer(marker);
		});
		markers = [];

		// Get vendors with coordinates
		const vendorsWithCoords = vendorsToUse.filter(
			(v) => v.lat && v.lon
		);

		if (vendorsWithCoords.length === 0) return;

		// Create bounds to fit all markers
		const bounds = L.latLngBounds(
			vendorsWithCoords.map((v) => [v.lat!, v.lon!] as [number, number])
		);

		// Add markers
		vendorsWithCoords.forEach((vendor) => {
			const isNostrVendor = "npub" in vendor;
			const hasLightning = isNostrVendor
				? (vendor as NostrVendor).lightning
				: (vendor as BTCMapVendor).lightning;
			const hasOnchain = isNostrVendor
				? (vendor as NostrVendor).onchain
				: (vendor as BTCMapVendor).onchain;

			const icon = createPinIcon(hasLightning, hasOnchain);
			const marker = L.marker([vendor.lat!, vendor.lon!], { icon });

			// Create popup content
			const popupContent = `
				<div class="p-2">
					<h3 class="font-bold text-lg">${vendor.name}</h3>
					<p class="text-sm text-gray-600">${vendor.category}</p>
					<p class="text-xs text-gray-500 mt-1">${vendor.address}</p>
					${hasLightning ? '<p class="text-sm text-yellow-600">⚡ Lightning</p>' : ""}
					${hasOnchain ? '<p class="text-sm text-orange-600">₿ On-chain</p>' : ""}
					<p class="text-xs text-gray-500 mt-2">Click marker to view details</p>
				</div>
			`;

			marker.bindPopup(popupContent);

			// Add click handler to scroll to vendor card when marker is clicked
			marker.on("click", () => {
				scrollToVendor(vendor.id);
			});

			// Add hover tooltip
			marker.bindTooltip(`${vendor.name} - ${vendor.category}`, {
				permanent: false,
				direction: "top",
				offset: [0, -20],
				className:
					"bg-gray-900 text-white px-2 py-1 rounded text-xs border border-gray-700"
			});

			marker.addTo(map!);
			markers.push(marker);
		});

		// Fit map to bounds with padding
		map.fitBounds(bounds, { padding: [50, 50] });
	};

	// Scroll to vendor card when map pin is clicked
	const scrollToVendor = (vendorId: string) => {
		const element = vendorCardRefs[vendorId];
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			// Add highlight effect
			element.classList.add("ring-4", "ring-bitcoin-orange", "ring-opacity-50");
			setTimeout(() => {
				element.classList.remove(
					"ring-4",
					"ring-bitcoin-orange",
					"ring-opacity-50"
				);
			}, 2000);
		}
	};


	// Handle vendor deletion
	const handleDeleteVendor = async (vendor: NostrVendor) => {
		if (!$user || !pool) {
			alert("You must be logged in to delete vendors.");
			return;
		}

		try {
			// Create delete event template
			const deleteEventTemplate = {
				kind: 5, // Kind 5 is for deletion events
				created_at: Math.floor(Date.now() / 1000),
				tags: [
					["e", vendor.id], // Reference to the event being deleted
					["k", "30333"] // The kind of the event being deleted
				],
				content: "Deleted vendor entry"
			};

			// Sign the event using the user's signing method
			if (!browser || !window.nostr) {
				throw new Error(
					"Nostr extension not found. Please install a Nostr extension like Nos2x or Snort."
				);
			}
			const signedEvent = await window.nostr.signEvent(deleteEventTemplate);

			// Add the ID to the signed event
			const deleteEvent = {
				...signedEvent,
				id: signedEvent.id || getEventHash(signedEvent)
			};

			// Publish the delete event to relays
			const responses = await pool.publish(RELAYS, deleteEvent);

			// Check if at least one relay accepted the event
			const successfulResponses = responses.filter((r) => r.ok);
			const failedResponses = responses.filter((r) => !r.ok);

			if (successfulResponses.length === 0) {
				const errorMessages = failedResponses
					.map((r) => `${r.from}: ${r.message}`)
					.join("; ");
				throw new Error(`Failed to publish to all relays: ${errorMessages}`);
			}

			if (failedResponses.length > 0) {
				console.warn(
					`⚠️ Failed on ${failedResponses.length} relays:`,
					failedResponses.map((r) => `${r.from}: ${r.message}`)
				);
			}

			// Update local state to remove the deleted vendor
			nostrVendors = nostrVendors.filter((v) => v.id !== vendor.id);

			// Show success message
			successMessage = {
				eventId: deleteEvent.id,
				naddr: `Deleted "${vendor.name}" from the directory`
			};
		} catch (error) {
			console.error("Error deleting vendor:", error);
			alert("Failed to delete vendor. Please try again.");
		}
	};

	// Render sort indicator (returns string for use in option text)
	const getSortIndicator = (field: SortField): string => {
		if (sortField !== field) return "⇅";
		return sortDirection === "asc" ? "↑" : "↓";
	};

	const sortableFields: { key: SortField; label: string }[] = [
		{ key: "name", label: "Vendor Name" },
		{ key: "category", label: "Category" },
		{ key: "submitterName", label: "Submitted By" },
		{ key: "createdAt", label: "Date Added" }
	];

	// Get all unique values for filters (use unfiltered data for submitter options)
	const allNames = $derived(
		Array.from(new Set(filteredAndSortedVendors.map((v) => v.name)))
	);
	const allCategories = $derived(
		Array.from(new Set(filteredAndSortedVendors.map((v) => v.category)))
	);

	// Get all unique submitter values from unfiltered vendors including "BTCMap" for BTCMap vendors
	const allUnfilteredVendors = $derived([...nostrVendors, ...btcMapVendors]);
	const allSubmitters = $derived(
		Array.from(
			new Set([
				...allUnfilteredVendors
					.filter((v) => "submitterName" in v) // Only Nostr vendors have submitterName
					.map((v) => (v as NostrVendor).submitterName)
					.filter(Boolean),
				...(allUnfilteredVendors.some((v) => !("submitterName" in v))
					? ["BTCMap"]
					: [])
			])
		)
	);
</script>

<div class="container mx-auto px-4 py-12">
	<!-- Loading State -->
	{#if isLoadingNostr && filteredAndSortedVendors.length === 0}
		<div class="text-center py-16">
			<Search class="w-16 h-16 mx-auto mb-4 text-gray-400" />
			<div class="text-lg text-gray-600 mb-2">
				Fetching vendors from Nostr network...
			</div>
			<div
				class="animate-spin inline-block w-8 h-8 border-4 border-bitcoin-orange border-t-transparent rounded-full"
			></div>
		</div>
	{/if}

	<!-- Filter and Sort Controls -->
	{#if filteredAndSortedVendors.length > 0}
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<!-- Filter by Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Filter Vendor Name
					</label>
					<select
						value={filters.name || ""}
						onchange={(e) => handleFilterChange("name", (e.target as HTMLSelectElement).value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:border-transparent"
					>
						<option value="">All Vendors</option>
						{#each allNames as name}
							<option value={name}>{name}</option>
						{/each}
					</select>
				</div>

				<!-- Filter by Category -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Filter Category</label>
					<select
						value={filters.category || ""}
						onchange={(e) => handleFilterChange("category", (e.target as HTMLSelectElement).value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:border-transparent"
					>
						<option value="">All Categories</option>
						{#each allCategories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>

				<!-- Filter by Submitter -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Filter Submitter</label>
					<select
						value={filters.submitterName || ""}
						onchange={(e) => handleFilterChange("submitterName", (e.target as HTMLSelectElement).value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:border-transparent"
					>
						<option value="">All Submitters</option>
						{#each allSubmitters as submitterName}
							<option value={submitterName}>{submitterName}</option>
						{/each}
					</select>
				</div>

				<!-- Sort -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
					<select
						value={sortField}
						onchange={(e) => handleSort((e.target as HTMLSelectElement).value as SortField)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:border-transparent"
					>
					{#each sortableFields as field}
						<option value={field.key}>
							{field.label} {getSortIndicator(field.key)}
						</option>
					{/each}
					</select>
				</div>
			</div>

			<!-- Results Count -->
			<div class="text-sm text-gray-600">
				Showing <span class="font-semibold text-bitcoin-orange">{filteredAndSortedVendors.length}</span> vendors
				total
				<span class="ml-4">
					(<span class="font-semibold text-yellow-500">{nostrVendors.length}</span> from Nostr,
					<span class="font-semibold text-orange-500 ml-1">{btcMapVendors.length}</span> from BTCMap)
				</span>
			</div>
		</div>
	{/if}

	<!-- Interactive Map -->
	{#if filteredAndSortedVendors.length > 0 &&
		filteredAndSortedVendors.some((v) => v.lat && v.lon)}
		<section class="mb-16">
			<div class="bg-white rounded-lg shadow-md p-6">
				<!-- Leaflet Map -->
				<div
					bind:this={mapContainer}
					class="rounded-lg overflow-hidden"
					style="height: 500px;"
				></div>

				<!-- Map Legend -->
				<div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
					<div>
						<span class="font-semibold text-bitcoin-orange">
							{filteredAndSortedVendors.filter((v) => v.lat && v.lon).length}
						</span>{" "}
						vendors with locations
					</div>
					<div>
						<span class="font-semibold text-yellow-500">
							{filteredAndSortedVendors.filter(
								(v) =>
									v.lat &&
									v.lon &&
									(("npub" in v && (v as NostrVendor).lightning) ||
										(!("npub" in v) && (v as BTCMapVendor).lightning))
							).length}
						</span>{" "}
						accept Lightning
					</div>
					<div>
						<span class="font-semibold text-orange-500">
							{filteredAndSortedVendors.filter(
								(v) =>
									v.lat &&
									v.lon &&
									(("npub" in v && (v as NostrVendor).onchain) ||
										(!("npub" in v) && (v as BTCMapVendor).onchain))
							).length}
						</span>{" "}
						accept On-chain
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Vendor Cards -->
	{#if filteredAndSortedVendors.length > 0}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredAndSortedVendors as vendor}
				{@const isNostrVendor = "npub" in vendor}
				{@const hasLightning = isNostrVendor
					? (vendor as NostrVendor).lightning
					: (vendor as BTCMapVendor).lightning}
				{@const hasOnchain = isNostrVendor
					? (vendor as NostrVendor).onchain
					: (vendor as BTCMapVendor).onchain}
				<div
					bind:this={vendorCardRefs[vendor.id]}
					id="vendor-card-{vendor.id}"
					class="{isNostrVendor
						? 'bg-purple-900 border-purple-800'
						: 'bg-white border-gray-200'} border rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 hover:border-bitcoin-orange/50 {isNostrVendor ? 'text-white' : ''}"
				>
					<!-- Header with Vendor Name and Payment Methods -->
					<div class="flex justify-between items-start mb-4">
						<div class="flex-1">
							<h3
								class="text-xl font-bold mb-2 {isNostrVendor ? 'text-white' : 'text-gray-900'}"
							>
								{vendor.name}
							</h3>
							<span
								class="inline-block px-2 py-1 text-xs font-medium bg-bitcoin-orange text-white rounded"
							>
								{vendor.category}
							</span>
							{#if hasLightning}
								<span
									class="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded"
								>
									<Zap class="w-3 h-3" />
									Lightning
								</span>
							{/if}
							{#if hasOnchain}
								<span
									class="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded"
								>
									<Bitcoin class="w-3 h-3" />
									On-chain
								</span>
							{/if}
						</div>

						<!-- Edit/Delete buttons for owners -->
						{#if $user && isNostrVendor && (vendor as NostrVendor).npub === $user.pubkey}
							<div class="flex gap-2 ml-2">
								<button
									onclick={() => {
										editVendor = vendor as NostrVendor;
										isEdit = true;
										showVendorForm = true;
									}}
									class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
									title="Edit vendor"
								>
									<Edit class="w-5 h-5" />
								</button>
								<button
									onclick={() => {
										if (
											confirm(
												`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`
											)
										) {
											handleDeleteVendor(vendor as NostrVendor);
										}
									}}
									class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
									title="Delete vendor"
								>
									<Trash2 class="w-5 h-5" />
								</button>
							</div>
						{/if}
					</div>

					<!-- Description -->
					{#if vendor.description}
						<p
							class="{isNostrVendor ? 'text-gray-200' : 'text-gray-600'} text-sm mb-4"
						>
							{vendor.description}
						</p>
					{/if}

					<!-- Location -->
					<div
						class="flex items-center gap-2 mb-3 {isNostrVendor ? 'text-gray-200' : 'text-gray-700'}"
					>
						<MapPin class="w-4 h-4" />
						<span class="text-sm">{vendor.address}</span>
					</div>

					<!-- Contact Information -->
					<div
						class="space-y-2 text-sm mb-4 {isNostrVendor ? 'text-gray-200' : 'text-gray-700'}"
					>
						{#if isNostrVendor}
							{@const nostrVendor = vendor as NostrVendor}
							{#if nostrVendor.lightningAddress}
								<div class="flex items-center gap-2">
									<Zap class="w-4 h-4 text-yellow-500" />
									<a
										href="lightning:{nostrVendor.lightningAddress}"
										class="text-blue-600 hover:underline truncate"
									>
										{nostrVendor.lightningAddress}
									</a>
								</div>
							{/if}

							{#if nostrVendor.onchainAddress}
								<div class="flex items-center gap-2">
									<Bitcoin class="w-4 h-4 text-orange-500" />
									<a
										href="bitcoin:{nostrVendor.onchainAddress}"
										class="text-blue-600 hover:underline truncate font-mono"
									>
										{nostrVendor.onchainAddress?.substring(0, 16)}...
									</a>
								</div>
							{/if}

							{#if nostrVendor.email}
								<div class="flex items-center gap-2">
									<Mail class="w-4 h-4 text-gray-500" />
									<a
										href="mailto:{nostrVendor.email}"
										class="text-blue-600 hover:underline"
									>
										{nostrVendor.email}
									</a>
								</div>
							{/if}

							{#if nostrVendor.website}
								<div class="flex items-center gap-2">
									<Globe class="w-4 h-4 text-gray-500" />
									<a
										href={nostrVendor.website}
										target="_blank"
										rel="noopener noreferrer"
										class="text-blue-600 hover:underline truncate"
									>
										{nostrVendor.website?.replace(/^https?:\/\//, "")}
									</a>
								</div>
							{/if}

							{#if nostrVendor.openingHours}
								<div class="flex items-center gap-2">
									<Clock class="w-4 h-4 text-gray-500" />
									<span class="text-gray-700">{nostrVendor.openingHours}</span>
								</div>
							{/if}
						{:else}
							{@const btcMapVendor = vendor as BTCMapVendor}
							{#if btcMapVendor.phone}
								<div class="flex items-center gap-2">
									<Phone class="w-4 h-4 text-gray-500" />
									<a href="tel:{btcMapVendor.phone}" class="text-blue-600 hover:underline">
										{btcMapVendor.phone}
									</a>
								</div>
							{/if}

							{#if btcMapVendor.website}
								<div class="flex items-center gap-2">
									<Globe class="w-4 h-4 text-gray-500" />
									<a
										href={btcMapVendor.website}
										target="_blank"
										rel="noopener noreferrer"
										class="text-blue-600 hover:underline truncate"
									>
										{btcMapVendor.website?.replace(/^https?:\/\//, "")}
									</a>
								</div>
							{/if}

							{#if btcMapVendor.email}
								<div class="flex items-center gap-2">
									<Mail class="w-4 h-4 text-gray-500" />
									<a
										href="mailto:{btcMapVendor.email}"
										class="text-blue-600 hover:underline"
									>
										{btcMapVendor.email}
									</a>
								</div>
							{/if}

							{#if btcMapVendor.opening_hours}
								<div class="flex items-center gap-2">
									<Clock class="w-4 h-4 text-gray-500" />
									<span class="text-gray-700">{btcMapVendor.opening_hours}</span>
								</div>
							{/if}

							<div class="flex items-center gap-2">
								<Map class="w-4 h-4 text-blue-500" />
								<span class="text-xs text-blue-600 font-medium">BTCMap Vendor</span>
							</div>

							{#if btcMapVendor.btcmap_id}
								<div class="flex items-center gap-2 mt-2">
									<a
										href="https://btcmap.org/merchant/{btcMapVendor.btcmap_id}"
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
									>
										<Link class="w-3 h-3" />
										Open in BTCMap
									</a>
								</div>
							{/if}
						{/if}
					</div>

					<!-- Footer with Submitter Info -->
					{#if isNostrVendor}
						<div
							class="mt-4 pt-4 border-t {isNostrVendor ? 'border-purple-700' : 'border-gray-100'} flex justify-between items-center"
						>
							<div class="flex items-center gap-2">
								<!-- Submitter Profile Picture -->
								{#if (vendor as NostrVendor).submitterPicture}
									<img
										src={(vendor as NostrVendor).submitterPicture}
										alt={(vendor as NostrVendor).submitterName || "Submitter"}
										class="w-6 h-6 rounded-full"
									/>
								{:else}
									<div
										class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600"
									>
										?
									</div>
								{/if}
								<div class="text-xs {isNostrVendor ? 'text-gray-300' : 'text-gray-500'}">
									Submitted by{" "}
									{#if (vendor as NostrVendor).submitterName}
										<a
											href="https://nostrudel.ninja/u/{(vendor as NostrVendor).npub}"
											target="_blank"
											rel="noopener noreferrer"
											class="text-bitcoin-orange hover:underline font-medium"
										>
											{(vendor as NostrVendor).submitterName}
										</a>
									{:else}
										<a
											href="https://nostrudel.ninja/u/{(vendor as NostrVendor).npub}"
											target="_blank"
											rel="noopener noreferrer"
											class="text-bitcoin-orange hover:underline"
										>
											{(vendor as NostrVendor).npub.substring(0, 8)}...
										</a>
									{/if}
								</div>
							</div>
							<div class="text-xs {isNostrVendor ? 'text-gray-400' : 'text-gray-400'}">
								{new Date((vendor as NostrVendor).createdAt * 1000).toLocaleDateString()}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Empty State - No Vendors Found -->
	{#if !isLoadingNostr &&
		nostrVendors.length === 0 &&
		btcMapVendors.length === 0}
		<div class="text-center py-16">
			<Store class="w-16 h-16 mx-auto mb-4 text-gray-400" />
			<div class="text-xl font-bold text-gray-800 mb-2">No Bitcoin Vendors Found</div>
			<div class="text-lg text-gray-600 mb-6">
				Be the first to add a Bitcoin-accepting business to our directory!
			</div>
			<div
				class="bg-gradient-to-r from-bitcoin-orange/10 to-orange-10 border border-bitcoin-orange/20 rounded-lg p-6 max-w-md mx-auto"
			>
				<h3 class="text-lg font-bold text-gray-800 mb-3">🚀 Add Your First Vendor</h3>
				<p class="text-gray-600 mb-4">
					Help grow the Bitcoin ecosystem in Kansas City by submitting local businesses that
					accept Bitcoin payments.
				</p>
				<button
					onclick={() => (showVendorForm = true)}
					class="px-6 py-3 bg-bitcoin-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:ring-offset-2"
				>
					Submit New Vendor
				</button>
			</div>
		</div>
	{/if}

	<!-- Error State -->
	{#if !isLoadingNostr &&
		nostrVendors.length === 0 &&
		btcMapVendors.length === 0 &&
		(nostrError || btcMapError)}
		<div class="text-center py-16">
			<AlertTriangle class="w-16 h-16 mx-auto mb-4 text-yellow-500" />
			<div class="text-lg text-gray-600 mb-2">Unable to load vendor data</div>
			<div class="text-sm text-gray-500">{nostrError || btcMapError || "No vendors found"}</div>
		</div>
	{/if}

	<!-- Success Message -->
	{#if successMessage}
		<div class="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
			<h3 class="text-xl font-bold mb-4 font-archivo-black text-green-800">
				Vendor Submitted Successfully!
			</h3>
			<p class="text-green-600 mb-4">
				Your vendor submission has been published to the Nostr network.
			</p>
			<div class="space-y-2 text-sm text-green-700">
				<p>
					<strong>Event ID:</strong> {successMessage.eventId.substring(0, 20)}...
				</p>
				<p class="break-all"><strong>Nostr Address:</strong> {successMessage.naddr}</p>
			</div>
			<button
				onclick={() => (successMessage = null)}
				class="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Call to Action -->
	<section
		class="mt-16 bg-gradient-to-r from-gray-50 to-orange-50 border border-gray-200 rounded-lg p-8 text-center"
	>
		<h3 class="text-2xl font-bold mb-4 font-archivo-black">
			Know a Bitcoin-Accepting Business?
		</h3>
		<p class="text-gray-600 mb-6 max-w-2xl mx-auto">
			Help grow this decentralized vendor directory! If you know of a local business that accepts
			Bitcoin, submit their information to the Nostr network.
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<button
				onclick={() => (showVendorForm = true)}
				class="px-6 py-3 bg-bitcoin-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:ring-offset-2"
			>
				Submit New Vendor
			</button>
			{#if !$user}
				<p class="text-sm text-gray-500 self-center">
					Connect your Nostr account to submit vendors
				</p>
			{/if}
		</div>
	</section>

	<!-- Vendor Form Modal -->
	{#if showVendorForm}
		<VendorForm
			onClose={() => {
				showVendorForm = false;
				editVendor = null;
				isEdit = false;
			}}
			onSuccess={(data) => {
				successMessage = data;
				showVendorForm = false;
				editVendor = null;
				isEdit = false;
			}}
			editVendor={editVendor}
			isEdit={isEdit}
		/>
	{/if}
</div>
