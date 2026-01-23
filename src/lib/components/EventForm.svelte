<script lang="ts">
	import type { EventFormData } from '$lib/types/calendar';
	import { Calendar, Clock, Plus, X } from '@lucide/svelte';

	interface Props {
		initialData?: Partial<EventFormData>;
		onSubmit: (data: EventFormData) => void;
		onCancel: () => void;
		isSubmitting?: boolean;
	}

	let { initialData, onSubmit, onCancel, isSubmitting = false }: Props = $props();

	let formData = $state<EventFormData>({
		title: initialData?.title || '',
		description: initialData?.description || '',
		summary: initialData?.summary || '',
		image: initialData?.image || '',
		locations: initialData?.locations || [],
		startDate: initialData?.startDate || '',
		endDate: initialData?.endDate || '',
		startTime: initialData?.startTime || '',
		endTime: initialData?.endTime || '',
		timezone: initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
		hashtags: initialData?.hashtags || [],
		references: initialData?.references || [],
		eventType: initialData?.eventType || 'timed'
	});

	let locationInput = $state('');
	let hashtagInput = $state('');
	let referenceInput = $state('');

	const handleInputChange = (field: keyof EventFormData, value: string | string[]) => {
		formData = { ...formData, [field]: value };
	};

	const addLocation = () => {
		if (locationInput.trim() && !formData.locations.includes(locationInput.trim())) {
			formData = {
				...formData,
				locations: [...formData.locations, locationInput.trim()]
			};
			locationInput = '';
		}
	};

	const removeLocation = (location: string) => {
		formData = {
			...formData,
			locations: formData.locations.filter((l) => l !== location)
		};
	};

	const addHashtag = () => {
		if (hashtagInput.trim() && !formData.hashtags.includes(hashtagInput.trim())) {
			const tag = hashtagInput.trim().startsWith('#')
				? hashtagInput.trim().slice(1)
				: hashtagInput.trim();
			formData = {
				...formData,
				hashtags: [...formData.hashtags, tag]
			};
			hashtagInput = '';
		}
	};

	const removeHashtag = (tag: string) => {
		formData = {
			...formData,
			hashtags: formData.hashtags.filter((t) => t !== tag)
		};
	};

	const addReference = () => {
		if (referenceInput.trim() && !formData.references.includes(referenceInput.trim())) {
			formData = {
				...formData,
				references: [...formData.references, referenceInput.trim()]
			};
			referenceInput = '';
		}
	};

	const removeReference = (ref: string) => {
		formData = {
			...formData,
			references: formData.references.filter((r) => r !== ref)
		};
	};

	const handleSubmit = (e: Event) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			alert('Event title is required');
			return;
		}

		if (!formData.startDate) {
			alert('Start date is required');
			return;
		}

		if (formData.eventType === 'timed' && !formData.startTime) {
			alert('Start time is required for timed events');
			return;
		}

		onSubmit(formData);
	};

	const timezones = [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'Europe/London',
		'Europe/Paris',
		'Asia/Tokyo',
		'Asia/Shanghai',
		'Australia/Sydney'
	];

	// Auto-set end time to 1 hour after start time for timed events
	const handleStartTimeChange = (time: string) => {
		handleInputChange('startTime', time);
		if (time && formData.startDate && !formData.endTime) {
			const startDateTime = new Date(`${formData.startDate}T${time}`);
			const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
			handleInputChange('endTime', endDateTime.toTimeString().slice(0, 5));
		}
	};
</script>

<div class="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-2xl font-bold font-archivo-black">
			{initialData ? 'Edit Event' : 'Create New Event'}
		</h2>
		<button onclick={onCancel} class="text-gray-400 hover:text-gray-600 transition-colors">
			<X class="w-6 h-6" />
		</button>
	</div>

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Event Type -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
			<div class="flex gap-4">
				<label class="flex items-center">
					<input
						type="radio"
						value="timed"
						checked={formData.eventType === 'timed'}
						onchange={(e) => handleInputChange('eventType', (e.target as HTMLInputElement).value)}
						class="mr-2"
					/>
					<Clock class="w-4 h-4 mr-1" />
					Timed Event
				</label>
				<label class="flex items-center">
					<input
						type="radio"
						value="all-day"
						checked={formData.eventType === 'all-day'}
						onchange={(e) => handleInputChange('eventType', (e.target as HTMLInputElement).value)}
						class="mr-2"
					/>
					<Calendar class="w-4 h-4 mr-1" />
					All-day Event
				</label>
			</div>
		</div>

		<!-- Basic Information -->
		<div>
			<label for="title" class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
			<input
				id="title"
				type="text"
				bind:value={formData.title}
				placeholder="Event title"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
				required
			/>
		</div>

		<div>
			<label for="summary" class="block text-sm font-medium text-gray-700 mb-1">Summary</label>
			<input
				id="summary"
				type="text"
				bind:value={formData.summary}
				placeholder="Brief summary"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
			/>
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
				Description
			</label>
			<textarea
				id="description"
				bind:value={formData.description}
				placeholder="Event description"
				rows="4"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
			/>
		</div>

		<!-- Date/Time Fields -->
		{#if formData.eventType === 'timed'}
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
							Start Date *
						</label>
						<input
							id="startDate"
							type="date"
							bind:value={formData.startDate}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
							required
						/>
					</div>
					<div>
						<label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
							Start Time *
						</label>
						<input
							id="startTime"
							type="time"
							bind:value={formData.startTime}
							onchange={(e) => handleStartTimeChange((e.target as HTMLInputElement).value)}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
							required
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
							End Date
						</label>
						<input
							id="endDate"
							type="date"
							bind:value={formData.endDate}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
						/>
					</div>
					<div>
						<label for="endTime" class="block text-sm font-medium text-gray-700 mb-1">
							End Time
						</label>
						<input
							id="endTime"
							type="time"
							bind:value={formData.endTime}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
						/>
					</div>
				</div>

				<div>
					<label for="timezone" class="block text-sm font-medium text-gray-700 mb-1">
						Timezone
					</label>
					<select
						id="timezone"
						bind:value={formData.timezone}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
					>
						{#each timezones as tz}
							<option value={tz}>{tz}</option>
						{/each}
					</select>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="startDateAllDay" class="block text-sm font-medium text-gray-700 mb-1">
						Start Date *
					</label>
					<input
						id="startDateAllDay"
						type="date"
						bind:value={formData.startDate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
						required
					/>
				</div>
				<div>
					<label for="endDateAllDay" class="block text-sm font-medium text-gray-700 mb-1">
						End Date (optional)
					</label>
					<input
						id="endDateAllDay"
						type="date"
						bind:value={formData.endDate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
					/>
				</div>
			</div>
		{/if}

		<!-- Locations -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Locations</label>
			<div class="flex gap-2 mb-2">
				<input
					type="text"
					bind:value={locationInput}
					placeholder="Add location or URL"
					onkeypress={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addLocation();
						}
					}}
					class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
				/>
				<button
					type="button"
					onclick={addLocation}
					class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
				>
					<Plus class="w-4 h-4" />
				</button>
			</div>

			{#if formData.locations.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each formData.locations as location}
						<span
							class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
						>
							📍 {location.length > 30 ? `${location.substring(0, 30)}...` : location}
							<button
								type="button"
								onclick={() => removeLocation(location)}
								class="text-gray-500 hover:text-red-600"
							>
								<X class="w-3 h-3" />
							</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<div>
			<label for="image" class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
			<input
				id="image"
				type="url"
				bind:value={formData.image}
				placeholder="https://example.com/image.jpg"
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
			/>
		</div>

		<!-- Hashtags -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
			<div class="flex gap-2 mb-2">
				<input
					type="text"
					bind:value={hashtagInput}
					placeholder="hashtag"
					onkeypress={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addHashtag();
						}
					}}
					class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
				/>
				<button
					type="button"
					onclick={addHashtag}
					class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
				>
					<Plus class="w-4 h-4" />
				</button>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each formData.hashtags as tag}
					<span
						class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
					>
						#{tag}
						<button
							type="button"
							onclick={() => removeHashtag(tag)}
							class="text-gray-500 hover:text-red-600"
						>
							<X class="w-3 h-3" />
						</button>
					</span>
				{/each}
			</div>
		</div>

		<!-- References -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">References & Links</label>
			<div class="flex gap-2 mb-2">
				<input
					type="text"
					bind:value={referenceInput}
					placeholder="Enter URL or reference"
					onkeypress={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addReference();
						}
					}}
					class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
				/>
				<button
					type="button"
					onclick={addReference}
					class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
				>
					<Plus class="w-4 h-4" />
				</button>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each formData.references as ref}
					<span
						class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm max-w-32"
					>
						<span class="truncate">{ref}</span>
						<button
							type="button"
							onclick={() => removeReference(ref)}
							class="text-gray-500 hover:text-red-600 flex-shrink-0"
						>
							<X class="w-3 h-3" />
						</button>
					</span>
				{/each}
			</div>
		</div>

		<!-- Submit -->
		<div class="flex justify-end gap-3 pt-4 border-t">
			<button
				type="button"
				onclick={onCancel}
				class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={isSubmitting}
				class="px-4 py-2 bg-bitcoin-orange text-white rounded-md hover:bg-bitcoin-orange-hover transition-colors disabled:opacity-50"
			>
				{isSubmitting ? 'Publishing...' : 'Publish Event'}
			</button>
		</div>
	</form>
</div>
