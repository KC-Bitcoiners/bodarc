<script lang="ts">
	import type { CalendarEvent } from '$lib/types/calendar';
	import { formatEventTime, getEventTypeLabel } from '$lib/utils/calendar';
	import { Clock, MapPin } from '@lucide/svelte';

	interface Props {
		event: CalendarEvent;
		onDelete?: (eventId: string) => void;
		onEdit?: () => void;
	}

	let { event, onDelete, onEdit }: Props = $props();

	const handleDelete = () => {
		if (onDelete && window.confirm('Are you sure you want to delete this event?')) {
			onDelete(event.id);
		}
	};
</script>

<div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 w-full overflow-hidden relative">
	<!-- Action buttons -->
	<div class="absolute top-4 right-4 flex gap-2">
		{#if onEdit}
			<button
				onclick={onEdit}
				class="text-gray-400 hover:text-blue-600 transition-colors"
				aria-label="Edit event"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 0 0 2.828l8.586 8.586z"
					/>
				</svg>
			</button>
		{/if}
		{#if onDelete}
			<button
				onclick={handleDelete}
				class="text-gray-400 hover:text-red-600 transition-colors"
				aria-label="Delete event"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Mobile-first layout -->
	<div class="space-y-4 sm:space-y-6 pr-8">
		<!-- Header section with event type and title -->
		<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
			<div class="order-2 sm:order-1 flex-1">
				<div class="mb-2">
					<span class="inline-block px-2 py-1 text-xs font-medium bg-bitcoin-orange/10 text-bitcoin-orange rounded-full mb-2">
						{getEventTypeLabel(event)}
					</span>
				</div>
				<h4 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 font-archivo-black leading-tight">
					{event.title || 'Untitled Event'}
				</h4>
				{#if event.summary}
					<p class="text-sm text-gray-600 mb-2">{event.summary}</p>
				{/if}
			</div>
		</div>

		<!-- Time section -->
		<div class="flex items-start gap-2 text-gray-600">
			<Clock class="size-6 text-gray-500 mt-0.5 flex-shrink-0" />
			<div>
				<span class="font-semibold text-gray-900 block">{formatEventTime(event)}</span>
				{#if event.timezone}
					<span class="text-xs text-gray-500">Timezone: {event.timezone}</span>
				{/if}
			</div>
		</div>

		<!-- Location section -->
		{#if event.location}
			<div class="flex items-start gap-2 text-gray-600">
				<MapPin class="size-6 text-gray-500 mt-0.5 flex-shrink-0" />
				<div>
					<span class="font-semibold text-gray-900 block">Location</span>
					<span class="text-sm sm:text-base block">{event.location}</span>
					{#if event.locations && event.locations.length > 1}
						<span class="text-xs text-gray-500">
							+{event.locations.length - 1} more location{event.locations.length > 2 ? 's' : ''}
						</span>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Description section -->
		{#if event.description}
			<div class="text-gray-700">
				<p class="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
					{event.description}
				</p>
			</div>
		{/if}

		<!-- Tags section -->
		{#if event.hashtags && event.hashtags.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each event.hashtags as tag, index}
					<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
						#{tag}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Event Image -->
		{#if event.image}
			<div class="mt-4">
				<img
					src={event.image}
					alt={event.title || 'Event image'}
					class="w-full h-48 object-cover rounded-lg"
					onerror={(e) => {
						(e.target as HTMLImageElement).style.display = 'none';
					}}
				/>
			</div>
		{/if}

		<!-- References/Links -->
		{#if event.references && event.references.length > 0}
			<div class="space-y-2">
				<span class="font-semibold text-gray-900 text-sm">Links:</span>
				{#each event.references as ref, index}
					<a
						href={ref}
						target="_blank"
						rel="noopener noreferrer"
						class="block text-sm text-bitcoin-orange hover:underline truncate"
					>
						{ref}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
