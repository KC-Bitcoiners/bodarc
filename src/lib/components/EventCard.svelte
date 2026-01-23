<script lang="ts">
	import { Clock, MapPin } from '@lucide/svelte';

	interface Props {
		date: string;
		title: string;
		startTime: string;
		endTime: string;
		location: string;
		link?: string;
		description: string[];
		class?: string;
	}

	let {
		date,
		title,
		startTime,
		endTime,
		location,
		description,
		link,
		class: className
	}: Props = $props();
</script>

<div
	class="{className || 'bg-white border border-gray-200'} rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 w-full overflow-hidden"
>
	<!-- Mobile-first layout -->
	<div class="space-y-4 sm:space-y-6">
		<!-- Header section with date and title -->
		<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
			<div class="order-2 sm:order-1 flex-1">
				<h4 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 font-archivo-black leading-tight">
					{#if link}
						<a
							class="hover:underline"
							href={link}
							target="_blank"
							rel="noopener noreferrer"
						>
							{title}
						</a>
					{:else}
						{title}
					{/if}
				</h4>
			</div>
			<div class="order-1 sm:order-2 flex-shrink-0">
				<h3 class="text-2xl sm:text-3xl font-bold bitcoin-orange font-archivo-black">
					{date}
				</h3>
			</div>
		</div>

		<!-- Time and location section -->
		<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-gray-600">
		<div class="flex items-center gap-2">
			<Clock class="size-6 text-gray-500" />
			<span class="font-semibold text-gray-900">
				{startTime} - {endTime}
			</span>
		</div>
		<div class="flex items-center gap-2">
			<MapPin class="size-6 text-gray-500" />
				{#if location && location !== 'Location TBD'}
					<a
						href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(location)}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm sm:text-base text-blue-600 hover:text-blue-800 underline hover:underline-offset-2"
						title="Open in Google Maps"
					>
						{location}
					</a>
				{:else}
					<span class="text-sm sm:text-base">{location}</span>
				{/if}
			</div>
		</div>

		<!-- Description section -->
		<div class="text-gray-700 space-y-2">
			{#each description as paragraph}
				<p class="text-sm sm:text-base leading-relaxed">{paragraph.replaceAll('\\', '')}</p>
			{/each}
		</div>
	</div>
</div>
