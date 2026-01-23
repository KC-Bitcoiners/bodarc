<script lang="ts">
	import CalendarView from "$lib/components/CalendarView.svelte";
	import EventCard from "$lib/components/EventCard.svelte";
	import EventDetailsModal from "$lib/components/EventDetailsModal.svelte";
	import EventForm from "$lib/components/EventForm.svelte";
	import { WHITELISTED_NPUBS, WHITELISTED_PUBKEYS } from "$lib/config";
	import { user } from "$lib/stores/nostr";
	import type { CalendarEvent, EventFormData } from "$lib/types/calendar";
	import {
		createEventFromFormData,
		getPastEvents,
		getUpcomingEvents,
		loadEvents,
		saveEvents,
		sortEventsByTime
	} from "$lib/utils/calendar";
	import { convertNostrEventToCalendar, fetchNostrCalendarEvents, publishNostrEvent } from "$lib/utils/nostrEvents";
	import { Check, ExternalLink, Plus, X } from "@lucide/svelte";
	import { browser } from "$app/environment";

	let { data } = $props();
	const meetupEvents: CalendarEvent[] = data.meetupEvents || [];

	// Initialize events with meetup events, then add local events
	let events = $state<CalendarEvent[]>(meetupEvents);
	let showCreateForm = $state(false);
	let editingEvent = $state<CalendarEvent | null>(null);
	let viewMode = $state<"list" | "month" | "week" | "day">("month");
	let selectedEvent = $state<CalendarEvent | null>(null);
	let isSubmitting = $state(false);
	let isLoadingNostrEvents = $state(false);
	let successMessage = $state<{ eventId: string; naddr: string } | null>(null);

	// Load local events and combine with meetup events (only on client)
	$effect(() => {
		if (!browser) return;
		
		console.log("📅 Starting to load initial events...");
		
		// Load local events
		const localEvents = loadEvents();
		console.log(`📊 Loaded ${localEvents.length} local events`);
		
		// Combine local and meetup events
		const immediateEvents = sortEventsByTime([...localEvents, ...meetupEvents]);
		console.log(
			`🚀 Displaying immediate events: ${localEvents.length} local + ${meetupEvents.length} meetup = ${immediateEvents.length} total`
		);
		
		events = immediateEvents;
	});

	// Load nostr events separately in the background
	$effect(() => {
		const timer = setTimeout(async () => {
			console.log("🕰️ Loading nostr events in background...");
			isLoadingNostrEvents = true;
			let nostrEvents: CalendarEvent[] = [];

			try {
				const nostrCalendarEvents = await fetchNostrCalendarEvents();
				console.log(`📡 Found ${nostrCalendarEvents.length} raw nostr events`);
				nostrEvents = nostrCalendarEvents.map(convertNostrEventToCalendar);
				console.log(`✅ Converted ${nostrEvents.length} nostr events to calendar format`);
			} catch (error) {
				console.warn("⚠️ Failed to load nostr events:", error);
			} finally {
				isLoadingNostrEvents = false;
			}

			// Add nostr events to existing events
			console.log(
				`➕ Adding ${nostrEvents.length} nostr events to existing ${events.length} events`
			);
			events = sortEventsByTime([...events, ...nostrEvents]);
			console.log(`📅 Total events after adding nostr: ${events.length}`);
		}, 100);

		return () => clearTimeout(timer);
	});

	const handleCreateEvent = async (formData: EventFormData) => {
		isSubmitting = true;
		try {
			// Publish to nostr instead of saving locally
			console.log("🚀 Creating new nostr event:", formData);

			// Check if user is authenticated
			if (!$user) {
				alert("🔐 Please connect your Nostr wallet or log in to create events.");
				return;
			}

			console.log("🚀 Creating new nostr event with authenticated user:", $user.pubkey);

			// Use Nostr extension for signing
			const result = await publishNostrEvent(formData, undefined, $user.pubkey);

			if (result.success) {
				console.log("✅ Successfully published event to nostr:", result.eventId);
				console.log("🔗 Event naddr:", result.naddr);

				// Create a calendar event to display immediately
				const newEvent = createEventFromFormData(formData);
				newEvent.id = result.eventId || `nostr-${Date.now()}`;
				newEvent.pubkey = $user.pubkey; // Use actual user pubkey from Nostr extension
				newEvent.dTag = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Match the dTag used in publishing

				console.log("📝 Adding new event to local state:", {
					id: newEvent.id,
					title: newEvent.title,
					start: newEvent.start,
					dTag: newEvent.dTag,
					pubkey: newEvent.pubkey
				});

				// Add to existing events without duplicates
				const exists = events.some(
					(e) =>
						e.id === newEvent.id ||
						(e.dTag === newEvent.dTag && e.pubkey === newEvent.pubkey)
				);

				if (!exists) {
					events = sortEventsByTime([...events, newEvent]);
					// Also save to localStorage as backup (but avoid duplicates)
					const existingEvents = loadEvents();
					const hasLocalDuplicate = existingEvents.some(
						(e) =>
							e.id === newEvent.id ||
							(e.dTag === newEvent.dTag && e.pubkey === newEvent.pubkey)
					);

					if (!hasLocalDuplicate) {
						saveEvents(events);
					}
				}

				showCreateForm = false;
				successMessage = {
					eventId: result.eventId || "",
					naddr: result.naddr || ""
				};

				// Fetch the event from relay to ensure it's rendered
				setTimeout(async () => {
					console.log(
						"🔄 Fetching newly published event from relay to verify it was published..."
					);
					try {
						const nostrCalendarEvents = await fetchNostrCalendarEvents();
						const nostrEvents = nostrCalendarEvents.map(convertNostrEventToCalendar);
						events = sortEventsByTime([...events, ...nostrEvents]);
						console.log("✅ Successfully fetched and integrated newly published event from relay");
					} catch (error) {
						console.error("💥 Failed to refetch events after publishing:", error);
					}
				}, 2000); // Wait 2 seconds for relay to propagate
			} else {
				const errorMsg = result.error || "Failed to publish to nostr";
				console.error("❌ Event publishing failed:", errorMsg);
				alert(`❌ Failed to publish event to Nostr. Please try again.\n\nError: ${errorMsg}`);
			}
		} catch (error) {
			console.error("Failed to create event:", error);
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			alert(`❌ Failed to publish event to Nostr. Please try again.\n\nError: ${errorMsg}`);
		} finally {
			isSubmitting = false;
		}
	};

	const handleUpdateEvent = async (formData: EventFormData) => {
		if (!editingEvent) return;

		const currentEvent = editingEvent; // Capture for TypeScript
		isSubmitting = true;
		try {
			const updatedEvent = createEventFromFormData({
				...formData,
				eventType: currentEvent.kind === 31922 ? "all-day" : "timed"
			});
			updatedEvent.id = currentEvent.id;
			updatedEvent.dTag = currentEvent.dTag;
			updatedEvent.created_at = currentEvent.created_at;

			events = sortEventsByTime(
				events.map((event) => (event.id === currentEvent.id ? updatedEvent : event))
			);
			saveEvents(events);
			editingEvent = null;
		} catch (error) {
			console.error("Failed to update event:", error);
			alert("Failed to update event. Please try again.");
		} finally {
			isSubmitting = false;
		}
	};

	// Function to get color based on event creator
	const getEventColor = (event: CalendarEvent): string => {
		if (event.pubkey === "meetup")
			return "border-bitcoin-orange"; // Meetup events - bitcoin orange


		// Find index based on hex format (which nostr events use)
		const hexIndex = WHITELISTED_PUBKEYS.findIndex((hex: string) => hex === event.pubkey);
		const npubIndex = WHITELISTED_NPUBS.findIndex((npub: string) => npub === event.pubkey);
		const colorIndex = Math.max(hexIndex, npubIndex);

		const colors = [
			"bg-purple-500 border-purple-600", // First whitelisted user - purple
			"bg-green-500 border-green-600", // Second user - green
			"bg-yellow-500 border-yellow-600", // Third user - yellow
			"bg-pink-500 border-pink-600", // Fourth user - pink
			"bg-indigo-500 border-indigo-600" // Fifth user - indigo
		];

		return colorIndex >= 0
			? colors[colorIndex % colors.length]
			: "bg-gray-50 border-gray-200"; // Default fallback
	};

	const upcomingEvents = $derived(getUpcomingEvents(events));
	const pastEvents = $derived(getPastEvents(events));

	// Helper functions to format data for EventCard
	const formatDate = (timestamp: string | undefined): string => {
		if (!timestamp) return "TBD";
		const date = new Date(parseInt(timestamp) * 1000);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric"
		});
	};

	const formatTime = (timestamp: string | undefined): string => {
		if (!timestamp) return "TBA";
		const date = new Date(parseInt(timestamp) * 1000);
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
	};

	const splitDescription = (description: string): string[] => {
		if (!description) return ["No description available."];
		return description
			.split(/\n\s*\n/)
			.filter((paragraph) => paragraph.trim().length > 0)
			.map((paragraph) => paragraph.trim());
	};
</script>

<div class="container mx-auto px-4 py-12">
	<div class="relative">
		<!-- Main Content -->
		<div class="flex gap-6">
			<!-- Statistics Sidebar - Fixed in left margin -->
			<div class="w-24 flex-shrink-0">
				<div class="sticky top-24 space-y-2">
					<div class="bg-white border border-gray-200 rounded-lg p-2 text-center shadow-sm">
						<div class="text-lg font-bold text-bitcoin-orange mb-1">{events.length}</div>
						<div class="text-xs text-gray-600">Total</div>
					</div>
					<div class="bg-white border border-gray-200 rounded-lg p-2 text-center shadow-sm">
						<div class="text-lg font-bold text-green-600 mb-1">
							{upcomingEvents.length}
						</div>
						<div class="text-xs text-gray-600">Upcoming</div>
					</div>
					<div class="bg-white border border-gray-200 rounded-lg p-2 text-center shadow-sm">
						<div class="text-lg font-bold text-gray-600 mb-1">{pastEvents.length}</div>
						<div class="text-xs text-gray-600">Past</div>
					</div>
				</div>
			</div>

			<!-- Calendar Content -->
			<div class="flex-1 relative">
				<!-- Loading Overlay - Over calendar with transparent background -->
				{#if viewMode !== "list" && isLoadingNostrEvents}
					<div class="absolute top-4 left-0 right-0 z-50 flex justify-center">
						<div
							class="flex flex-col items-center gap-3 px-6 py-3 bg-white bg-opacity-95 rounded-lg shadow-lg backdrop-blur-sm"
						>
							<img
								src="/bitcoinShaka.jpg"
								alt="Loading..."
								class="w-auto h-auto max-w-12 max-h-12 rounded-full animate-spin"
							/>
							<p class="text-purple-600 font-medium">Loading events from Nostr...</p>
						</div>
					</div>
				{/if}

				<!-- Always show view selector -->
				<div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<button
								onclick={() => (viewMode = "month")}
								class="px-4 py-2 text-sm font-medium transition-colors rounded-l-lg {viewMode === 'month'
									? 'bg-bitcoin-orange text-white'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								Month
							</button>
							<button
								onclick={() => (viewMode = "week")}
								class="px-4 py-2 text-sm font-medium transition-colors {viewMode === 'week'
									? 'bg-bitcoin-orange text-white'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								Week
							</button>
							<button
								onclick={() => (viewMode = "day")}
								class="px-4 py-2 text-sm font-medium transition-colors rounded-r-lg {viewMode === 'day'
									? 'bg-bitcoin-orange text-white'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								Day
							</button>

							<button
								onclick={() => (viewMode = "list")}
								class="px-4 py-2 text-sm font-medium transition-colors rounded-lg border border-gray-200 bg-white ml-2 {viewMode === 'list'
									? 'bg-bitcoin-orange text-white'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								List
							</button>
						</div>

						<!-- Orange plus button for creating events -->
						<button
							onclick={() => (showCreateForm = true)}
							class="inline-flex items-center justify-center w-10 h-10 bg-bitcoin-orange text-white rounded-full hover:bg-bitcoin-orange-hover transition-colors"
							title="Create New Event"
						>
							<Plus class="w-5 h-5" />
						</button>
					</div>
				</div>

				<!-- Calendar View -->
				{#if viewMode !== "list"}
					<CalendarView
						events={events}
						onEventClick={(e) => (selectedEvent = e)}
						currentView={viewMode}
						getEventColor={getEventColor}
					/>
				{/if}

				{#if viewMode === "list"}
					<div class="space-y-8">
						{#if isLoadingNostrEvents}
							<div class="bitcoin-shaka-loading-overlay mb-8">
								<div class="bitcoin-shaka-container">
									<img
										src="/bitcoinShaka.jpg"
										alt="Loading..."
										class="bitcoin-shaka-spinner"
									/>
									<p class="text-purple-600 font-medium mt-4 text-center">
										Loading events from Nostr...
									</p>
								</div>
							</div>
						{/if}

						<!-- Upcoming Events Section -->
						{#if upcomingEvents.length > 0}
							<section class="mb-16">
								<div class="space-y-8">
									{#each upcomingEvents as event}
										<EventCard
											class={getEventColor(event)}
											date={formatDate(event.start)}
											title={event.title || "Untitled Event"}
											startTime={formatTime(event.start)}
											endTime={event.end ? formatTime(event.end) : "TBA"}
											location={event.location || "Location TBD"}
											description={splitDescription(event.description || "")}
											link={event.references?.[0]}
										/>
									{/each}
								</div>
							</section>
						{/if}

						<!-- Past Events Section -->
						{#if pastEvents.length > 0}
							<section>
								<h2 class="text-3xl font-bold mb-8 font-archivo-black text-gray-700">
									Past Events
								</h2>
								<div class="space-y-8 opacity-75">
									{#each pastEvents.slice(0, 5) as event}
										<EventCard
											class={getEventColor(event)}
											date={formatDate(event.start)}
											title={event.title || "Untitled Event"}
											startTime={formatTime(event.start)}
											endTime={event.end ? formatTime(event.end) : "TBA"}
											location={event.location || "Location TBD"}
											description={splitDescription(event.description || "")}
											link={event.references?.[0]}
										/>
									{/each}
								</div>
							</section>
						{/if}

						{#if events.length === 0 && !isLoadingNostrEvents}
							<div class="text-center py-12">
								<div class="bg-gray-50 border border-gray-200 rounded-lg p-8">
									<h3 class="text-xl font-semibold text-gray-900 mb-4">No Events Yet</h3>
									<p class="text-gray-600 mb-6">Start by creating your first community event.</p>
									<button
										onclick={() => (showCreateForm = true)}
										class="inline-flex items-center gap-2 bg-bitcoin-orange text-white px-6 py-3 rounded-lg font-semibold hover:bg-bitcoin-orange-hover transition-colors"
									>
										<Plus class="w-5 h-5" />
										Create Your First Event
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Create/Edit Event Modal -->
		{#if showCreateForm || editingEvent}
			<div
				class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
			>
				<div class="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
					<EventForm
						initialData={
							editingEvent
								? {
										title: editingEvent.title || "",
										description: editingEvent.description || "",
										summary: editingEvent.summary || "",
										image: editingEvent.image || "",
										locations:
											editingEvent.locations ||
											(editingEvent.location ? [editingEvent.location] : []),
										startDate:
											editingEvent.kind === 31922
												? editingEvent.start || ""
												: editingEvent.start
													? new Date(parseInt(editingEvent.start) * 1000)
															.toISOString()
															.split("T")[0]
													: "",
										endDate:
											editingEvent.kind === 31922
												? editingEvent.end || ""
												: editingEvent.end
													? new Date(parseInt(editingEvent.end) * 1000)
															.toISOString()
															.split("T")[0]
													: "",
										startTime:
											editingEvent.kind === 31923
												? editingEvent.start
													? new Date(parseInt(editingEvent.start) * 1000)
															.toTimeString()
															.slice(0, 5)
													: ""
												: "",
										endTime:
											editingEvent.kind === 31923
												? editingEvent.end
													? new Date(parseInt(editingEvent.end) * 1000)
															.toTimeString()
															.slice(0, 5)
													: ""
												: "",
										timezone:
											editingEvent.timezone ||
											Intl.DateTimeFormat().resolvedOptions().timeZone,
										hashtags: editingEvent.hashtags || [],
										references: editingEvent.references || [],
										eventType: editingEvent.kind === 31922 ? "all-day" : "timed"
									}
								: {
										// Default values for new events: tomorrow from noon to 2pm
										title: "",
										description: "",
										summary: "",
										image: "",
										locations: [],
										startDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
											.toISOString()
											.split("T")[0],
										endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
											.toISOString()
											.split("T")[0],
										startTime: "12:00",
										endTime: "14:00",
										timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
										hashtags: [],
										references: [],
										eventType: "timed"
									}
						}
						onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
						onCancel={() => {
							showCreateForm = false;
							editingEvent = null;
						}}
						isSubmitting={isSubmitting}
					/>
				</div>
			</div>
		{/if}

		<!-- Event Details Modal -->
		<EventDetailsModal event={selectedEvent} onClose={() => (selectedEvent = null)} />

		<!-- Success Popup -->
		{#if successMessage}
			<div
				class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
			>
				<div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
					<!-- Close button in top right -->
					<button
						onclick={() => (successMessage = null)}
						class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
						title="Close"
					>
						<X class="w-5 h-5" />
					</button>

					<div class="text-center pr-8">
						<div
							class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
						>
							<Check class="w-8 h-8 text-green-600" />
						</div>
						<h3 class="text-xl font-bold font-archivo-black mb-2">
							Event Published Successfully!
						</h3>
						<p class="text-gray-600 mb-4">
							Your event has been published to the Nostr network.
						</p>

						<div class="bg-gray-50 rounded-lg p-3 mb-4">
							<p class="text-sm font-medium text-gray-700 mb-1">Event ID:</p>
							<p class="text-xs text-gray-600 break-all font-mono">
								{successMessage.eventId}
							</p>
							<p class="text-sm font-medium text-gray-700 mb-2 mt-3">View Event:</p>
							<a
								href="https://plektos.app/event/{successMessage.naddr}"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm"
							>
								<ExternalLink class="w-4 h-4" />
								Open in Plektos
							</a>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
