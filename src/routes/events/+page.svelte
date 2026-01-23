<script lang="ts">
	import EventCard from "$lib/components/EventCard.svelte";
	import { eventsConfig, getMeetupUrl } from "$lib/config";
	import { getVenueAddress } from "$lib/meetup";

	let { data }= $props();

	// Helper function to format date
	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric"
		});
	};

	// Helper function to format time
	const formatTime = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
	};

	// Helper function to split description into paragraphs
	const splitDescription = (description: string): string[] => {
		if (!description) return ["No description available."];
		return description
			.split(/\n\s*\n/)
			.filter((paragraph) => paragraph.trim().length > 0)
			.map((paragraph) => paragraph.trim());
	};

	// Process events
	const now = new Date();
	const events = data.group?.events.edges.map((edge) => edge.node) || [];
	const upcomingEvents = events.filter((event) => new Date(event.dateTime) > now);
	const pastEvents = events.filter((event) => new Date(event.dateTime) <= now);
</script>

{#if data.error}
	<div class="container mx-auto px-4 py-12">
		<div class="text-center">
			<h1 class="text-4xl font-bold mb-8 font-archivo-black">Events</h1>
			<div class="bg-red-50 border border-red-200 rounded-lg p-6">
				<p class="text-red-600">
					Unable to load events at this time. Please try again later.
				</p>
				<p class="text-sm text-red-500 mt-2">{data.error}</p>
			</div>
		</div>
	</div>
{:else if !data.group}
	<div class="container mx-auto px-4 py-12">
		<div class="text-center">
			<h1 class="text-4xl font-bold mb-8 font-archivo-black">Events</h1>
			<p class="text-gray-600">No group data available.</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto px-4 py-12">
		<!-- Page Header -->
		<div class="text-center mb-12">
			<h1 class="text-5xl font-bold mb-6 font-archivo-black">
				{eventsConfig.header.title}
			</h1>
			<p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
				{eventsConfig.header.description}
			</p>
		</div>

		<!-- Upcoming Events Section -->
		<section class="mb-16">
			<h2 class="text-3xl font-bold mb-8 font-archivo-black bitcoin-orange">
				{eventsConfig.sections.upcoming.title}
			</h2>

			{#if upcomingEvents.length > 0}
				<div class="space-y-8">
					{#each upcomingEvents as event}
						<EventCard
							date={formatDate(event.dateTime)}
							title={event.title}
							startTime={formatTime(event.dateTime)}
							endTime={event.endTime ? formatTime(event.endTime) : "TBA"}
							location={getVenueAddress(event.venues)}
							description={splitDescription(event.description)}
							link={event.eventUrl}
						/>
					{/each}
				</div>
			{:else}
				<div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
					<p class="text-gray-600 text-lg mb-4">
						{eventsConfig.sections.upcoming.noEventsMessage}
					</p>
					<p class="text-gray-500">
						{eventsConfig.sections.upcoming.followUsMessage}{" "}
						<a
							href={getMeetupUrl()}
							target="_blank"
							rel="noopener noreferrer"
							class="bitcoin-orange hover:underline font-semibold"
						>
							Meetup.com
						</a>
					</p>
				</div>
			{/if}
		</section>

		<!-- Past Events Section -->
		{#if pastEvents.length > 0}
			<section>
				<h2 class="text-3xl font-bold mb-8 font-archivo-black text-gray-700">
					{eventsConfig.sections.past.title}
				</h2>
				<div class="space-y-8 opacity-75">
					{#each pastEvents.slice(0, 5) as event}
						<EventCard
							date={formatDate(event.dateTime)}
							title={event.title}
							startTime={formatTime(event.dateTime)}
							endTime={event.endTime ? formatTime(event.endTime) : "TBA"}
							location={getVenueAddress(event.venues)}
							description={splitDescription(event.description)}
							link={event.eventUrl}
						/>
					{/each}
				</div>

				{#if pastEvents.length > 5}
					<div class="text-center mt-8">
						<p class="text-gray-500">
							{eventsConfig.sections.past.showingRecentMessage}{" "}
							<a
								href="{getMeetupUrl()}events/past/"
								target="_blank"
								rel="noopener noreferrer"
								class="bitcoin-orange hover:underline font-semibold"
							>
								{eventsConfig.sections.past.viewAllText}
							</a>
						</p>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Call to Action -->
		<section class="mt-16 bg-gradient-to-r from-gray-50 to-orange-50 border border-gray-200 rounded-lg p-8 text-center">
			<h3 class="text-2xl font-bold mb-4 font-archivo-black">
				{eventsConfig.callToAction.title}
			</h3>
			<p class="text-gray-600 mb-6 max-w-2xl mx-auto">
				{eventsConfig.callToAction.description}
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href={getMeetupUrl()}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-block bg-bitcoin-orange text-white px-8 py-3 rounded-lg font-semibold hover:bg-bitcoin-orange-hover transition-colors"
				>
					{eventsConfig.callToAction.buttonText}
				</a>
				<!-- Only show in dev mode for testing -->
				{#if import.meta.env.DEV}
					<a
						href={eventsConfig.calendar.webcalUrl}
						download={eventsConfig.calendar.downloadFilename}
						class="inline-block bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
					>
						{eventsConfig.calendar.buttonText}
					</a>
				{/if}
			</div>
		</section>
	</div>
{/if}
