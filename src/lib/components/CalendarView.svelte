<script lang="ts">
	import type { CalendarEvent } from '$lib/types/calendar';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	interface Props {
		events: CalendarEvent[];
		onEventClick?: (event: CalendarEvent) => void;
		currentView?: 'month' | 'week' | 'day';
		getEventColor?: (event: CalendarEvent) => string;
	}

	let { events, onEventClick, currentView, getEventColor }: Props = $props();

	let currentDate = $state(new Date());
	const viewType = currentView || 'month';
	let weekScrollRef: HTMLDivElement | null = $state(null);
	let dayScrollRef: HTMLDivElement | null = $state(null);

	const navigateDate = (direction: 'prev' | 'next') => {
		const newDate = new Date(currentDate);

		switch (viewType) {
			case 'month':
				if (direction === 'prev') {
					newDate.setMonth(newDate.getMonth() - 1);
				} else {
					newDate.setMonth(newDate.getMonth() + 1);
				}
				break;
			case 'week':
				if (direction === 'prev') {
					newDate.setDate(newDate.getDate() - 7);
				} else {
					newDate.setDate(newDate.getDate() + 7);
				}
				break;
			case 'day':
				if (direction === 'prev') {
					newDate.setDate(newDate.getDate() - 1);
				} else {
					newDate.setDate(newDate.getDate() + 1);
				}
				break;
		}

		currentDate = newDate;
	};

	const goToToday = () => {
		currentDate = new Date();
	};

	const formatMonthYear = (date: Date) => {
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	};

	const formatWeekRange = (date: Date) => {
		const weekStart = new Date(date);
		weekStart.setDate(date.getDate() - date.getDay());
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 6);

		return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
	};

	const formatDayDate = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const getEventsForDate = (date: Date): CalendarEvent[] => {
		const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
		const endOfDay = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			23,
			59,
			59,
			999
		);
		const startOfDayTimestamp = Math.floor(startOfDay.getTime() / 1000);
		const endOfDayTimestamp = Math.floor(endOfDay.getTime() / 1000);

		return events.filter((event) => {
			if (event.kind === 31922) {
				// All-day event
				if (event.start && event.end) {
					const eventStart = new Date(event.start);
					const eventEnd = new Date(event.end);
					return eventStart <= endOfDay && eventEnd >= startOfDay;
				} else if (event.start) {
					const eventStart = new Date(event.start);
					return (
						eventStart.getFullYear() === date.getFullYear() &&
						eventStart.getMonth() === date.getMonth() &&
						eventStart.getDate() === date.getDate()
					);
				}
				return false;
			} else {
				// Timed event
				const eventStart = parseInt(event.start || '0');
				const eventEnd = parseInt(event.end || eventStart.toString());

				return (
					(eventStart >= startOfDayTimestamp && eventStart <= endOfDayTimestamp) ||
					(eventEnd >= startOfDayTimestamp && eventEnd <= endOfDayTimestamp) ||
					(eventStart <= startOfDayTimestamp && eventEnd >= endOfDayTimestamp)
				);
			}
		});
	};

	const getDaysInMonth = (date: Date) => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days: (Date | null)[] = [];

		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(null);
		}

		for (let i = 1; i <= daysInMonth; i++) {
			days.push(new Date(year, month, i));
		}

		return days;
	};

	const getWeekDays = (date: Date) => {
		const weekDays: Date[] = [];
		const startOfWeek = new Date(date);
		startOfWeek.setDate(date.getDate() - date.getDay());
		const startOfDay = new Date(
			startOfWeek.getFullYear(),
			startOfWeek.getMonth(),
			startOfWeek.getDate()
		);

		for (let i = 0; i < 7; i++) {
			const day = new Date(startOfDay);
			day.setDate(startOfDay.getDate() + i);
			weekDays.push(day);
		}

		return weekDays;
	};

	const calculateEventPosition = (event: CalendarEvent) => {
		if (event.kind === 31922) return null;

		let startTime: number;
		let endTime: number;

		if (event.start?.includes('-')) {
			startTime = new Date(event.start).getTime() / 1000;
			endTime = event.end ? new Date(event.end).getTime() / 1000 : startTime + 3600;
		} else {
			startTime = parseInt(event.start || '0');
			endTime = parseInt(event.end || startTime.toString());
		}

		const start = new Date(startTime * 1000);
		const end = new Date(endTime * 1000);

		const startMinutes = start.getHours() * 60 + start.getMinutes();
		const endMinutes = end.getHours() * 60 + end.getMinutes();
		const duration = endMinutes - startMinutes;

		const topPosition = (startMinutes / 60) * 60;
		const heightPixels = (duration / 60) * 60;

		return {
			top: topPosition,
			height: Math.max(heightPixels, 30),
			startMinutes,
			endMinutes
		};
	};

	const calculateEventLayout = (events: CalendarEvent[]) => {
		if (events.length === 0) return [];

		const sortedEvents = [...events].sort((a, b) => {
			const aStart = parseInt(a.start || '0');
			const bStart = parseInt(b.start || '0');
			return aStart - bStart;
		});

		const layout: Array<{
			event: CalendarEvent;
			position: { top: number; height: number; left: number; width: number };
		}> = [];

		for (let i = 0; i < sortedEvents.length; i++) {
			const currentEvent = sortedEvents[i];
			const currentPosition = calculateEventPosition(currentEvent);

			if (!currentPosition) continue;

			const overlappingEvents = [currentEvent];
			const concurrentEvents: number[] = [i];

			for (let j = i + 1; j < sortedEvents.length; j++) {
				const nextEvent = sortedEvents[j];
				const nextPosition = calculateEventPosition(nextEvent);

				if (!nextPosition) continue;

				if (
					currentPosition.startMinutes < nextPosition.endMinutes &&
					nextPosition.startMinutes < currentPosition.endMinutes
				) {
					overlappingEvents.push(nextEvent);
					concurrentEvents.push(j);
				} else {
					break;
				}
			}

			const eventCount = overlappingEvents.length;
			const eventWidth = 100 / eventCount;

			overlappingEvents.forEach((event, index) => {
				const position = calculateEventPosition(event);
				if (position) {
					layout.push({
						event,
						position: {
							top: position.top,
							height: position.height,
							left: index * eventWidth,
							width: eventWidth
						}
					});
				}
			});

			i += concurrentEvents.length - 1;
		}

		return layout;
	};

	const formatTime = (date: Date): string => {
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	};
</script>

<div class="space-y-6">
	<!-- Calendar Controls -->
	<div class="bg-white border border-gray-200 rounded-lg p-4">
		<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
			<!-- View Type Display -->
			<div class="flex items-center gap-2">
				<div class="text-sm font-medium text-gray-700">
					{viewType === 'month' && 'Month View'}
					{viewType === 'week' && 'Week View'}
					{viewType === 'day' && 'Day View'}
				</div>
			</div>

			<!-- Navigation -->
			<div class="flex items-center gap-4">
				<div class="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
					{viewType === 'month' && formatMonthYear(currentDate)}
					{viewType === 'week' && formatWeekRange(currentDate)}
					{viewType === 'day' && formatDayDate(currentDate)}
				</div>

				<div class="flex items-center gap-2">
					<button
						onclick={() => navigateDate('prev')}
						class="p-2 text-gray-600 hover:text-gray-900 transition-colors"
						aria-label="Previous"
					>
						<ChevronLeft class="w-5 h-5" />
					</button>
					<button
						onclick={goToToday}
						class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-300 rounded"
					>
						Today
					</button>
					<button
						onclick={() => navigateDate('next')}
						class="p-2 text-gray-600 hover:text-gray-900 transition-colors"
						aria-label="Next"
					>
						<ChevronRight class="w-5 h-5" />
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Calendar View -->
	{#if viewType === 'month'}
		{@const days = getDaysInMonth(currentDate)}
		{@const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
		{@const monthEvents = days.flatMap((day) => (day ? getEventsForDate(day) : []))}
		{@const hasEvents = monthEvents.length > 0}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden relative">
			<!-- Weekday headers -->
			<div class="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
				{#each weekDays as day}
					<div class="p-2 text-center text-xs font-semibold text-gray-700">{day}</div>
				{/each}
			</div>

			<!-- Calendar days -->
			<div class="grid grid-cols-7">
				{#each days as day, index}
					{@const dayEvents = day ? getEventsForDate(day) : []}
					{@const isToday = day && day.toDateString() === new Date().toDateString()}
					{@const isCurrentMonth = day && day.getMonth() === currentDate.getMonth()}
					<div
						class="min-h-[100px] p-2 border-r border-b border-gray-200 {isToday ? 'bg-bitcoin-orange/20' : ''} {!isCurrentMonth ? 'bg-gray-50' : ''}"
					>
						{#if day}
							<div
								class="text-sm font-medium mb-1 {isToday ? 'text-bitcoin-orange' : 'text-gray-900'}"
							>
								{day.getDate()}
							</div>
							<div class="space-y-1">
								{#each dayEvents.slice(0, 3) as event, eventIndex}
									<div
										onclick={() => onEventClick?.(event)}
										class="text-xs p-1 text-white rounded cursor-pointer hover:opacity-90 transition-colors whitespace-normal {getEventColor ? getEventColor(event).replace(/border-\w+/, '') : 'bg-bitcoin-orange'}"
										title="{event.title} - {event.kind === 31923 ? (event.start?.includes('-') ? new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : new Date(parseInt(event.start || '0') * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })) : 'All day'}"
									>
										<div class="font-semibold">{event.title}</div>
										{#if event.kind === 31923}
											<div class="text-xs opacity-90">
												{(event.start?.includes('-')
													? new Date(event.start)
													: new Date(parseInt(event.start || '0') * 1000)
												).toLocaleTimeString('en-US', {
													hour: 'numeric',
													minute: '2-digit'
												})}
											</div>
										{/if}
									</div>
								{/each}
								{#if dayEvents.length > 3}
									<div class="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if !hasEvents}
				<div class="absolute inset-0 flex items-start justify-center pt-16 bg-gray-50/90">
					<div class="text-center">
						<div class="text-gray-400 text-6xl mb-4">📅</div>
						<h3 class="text-xl font-semibold text-gray-700 mb-2">No Events This Month</h3>
						<p class="text-gray-500">There are no events scheduled for this month.</p>
					</div>
				</div>
			{/if}
		</div>
	{:else if viewType === 'week'}
		{@const weekDays = getWeekDays(currentDate)}
		{@const weekEvents = weekDays.flatMap((day) => getEventsForDate(day))}
		{@const hasEvents = weekEvents.length > 0}
		{@const calculateTimeRange = (events: CalendarEvent[]) => {
			if (events.length === 0) {
				return {
					startHour: 6,
					endHour: 22,
					hours: Array.from({ length: 16 }, (_, i) => 6 + i)
				};
			}

			let earliestHour = 18;
			let latestHour = 8;

			events.forEach((event) => {
				if (event.kind === 31922) return;
				let startTime: number;
				if (event.start?.includes('-')) {
					startTime = new Date(event.start).getTime() / 1000;
				} else {
					startTime = parseInt(event.start || '0');
				}
				const eventHour = new Date(startTime * 1000).getHours();
				if (eventHour < earliestHour) earliestHour = eventHour;
				if (eventHour > latestHour) latestHour = eventHour;
			});

			const startHour = Math.max(0, earliestHour - 2);
			const endHour = Math.min(23, latestHour + 2);
			const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

			return { startHour, endHour, hours };
		}}
		{@const timeRange = calculateTimeRange(weekEvents)}
		{@const dayLayouts = weekDays.map((day) => {
			const dayEvents = getEventsForDate(day).filter((event) => event.kind !== 31922);
			return calculateEventLayout(dayEvents);
		})}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<!-- Week grid -->
			<div class="grid grid-cols-8">
				<!-- Time column header -->
				<div class="p-2 border-r border-b border-gray-200 bg-gray-50">
					<div class="text-xs font-semibold text-gray-700">Time</div>
				</div>

				<!-- Day headers -->
				{#each weekDays as day, index}
					{@const dayEvents = getEventsForDate(day)}
					{@const isToday = day.toDateString() === new Date().toDateString()}
					<div
						class="p-2 border-r border-b border-gray-200 {isToday ? 'bg-bitcoin-orange/20' : 'bg-gray-50'}"
					>
						<div class="text-xs font-semibold {isToday ? 'text-bitcoin-orange' : 'text-gray-700'}">
							{day.toLocaleDateString('en-US', {
								weekday: 'short',
								month: 'short',
								day: 'numeric'
							})}
						</div>
						{#if dayEvents.length > 0}
							<div class="text-xs text-gray-600 mt-1">
								{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Week grid -->
			<div bind:this={weekScrollRef} class="h-[600px] relative overflow-y-auto">
				{#if !hasEvents}
					<div class="absolute inset-0 flex items-start justify-center pt-16 bg-gray-50/90">
						<div class="text-center">
							<div class="text-gray-400 text-6xl mb-4">📅</div>
							<h3 class="text-xl font-semibold text-gray-700 mb-2">No Events This Week</h3>
							<p class="text-gray-500">There are no events scheduled for this week.</p>
						</div>
					</div>
				{/if}
				{#each timeRange.hours as hour}
					<div data-hour={hour} class="grid grid-cols-8 border-b border-gray-300">
						<!-- Time column -->
						<div class="w-20 p-2 border-r border-gray-200 text-sm text-gray-600">
							{formatTime(new Date(2000, 0, 1, hour, 0, 0, 0))}
						</div>

						<!-- Day columns with events -->
						{#each weekDays as day, dayIndex}
							{@const dayEvents = getEventsForDate(day).filter((event) => event.kind !== 31922)}
							<div class="border-r border-gray-200 relative h-[60px]">
								{#each dayEvents as event}
									{@const eventStart = event.start?.includes('-') ? new Date(event.start) : new Date(parseInt(event.start || '0') * 1000)}
									{@const eventHour = eventStart.getHours()}
									{#if eventHour === hour}
										{@const dayLayout = dayLayouts[dayIndex]}
										{@const layoutItem = dayLayout.find((item) => item.event.id === event.id)}
										{#if layoutItem}
											{@const eventPosition = calculateEventPosition(event)}
											{#if eventPosition}
												{@const relativeTop = eventPosition.top - hour * 60}
												<div
													onclick={() => onEventClick?.(event)}
													class="absolute text-white text-xs p-1 rounded cursor-pointer hover:opacity-90 transition-colors overflow-hidden z-10 {getEventColor ? getEventColor(event).replace(/border-\w+/, '') : 'bg-bitcoin-orange'}"
													style="top: {relativeTop}px; left: {2 + layoutItem.position.left}%; width: {layoutItem.position.width - 4}%; height: {layoutItem.position.height}px; min-height: 20px;"
													title={event.title}
												>
													<div class="font-semibold truncate">{event.title}</div>
													<div class="text-xs opacity-90">
														{formatTime(eventStart)}
														{#if event.end}
															{@const eventEnd = event.end?.includes('-') ? new Date(event.end) : new Date(parseInt(event.end || '0') * 1000)}
															{' - ' + formatTime(eventEnd)}
														{/if}
													</div>
												</div>
											{/if}
										{/if}
									{/if}
								{/each}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{:else if viewType === 'day'}
		{@const dayEvents = getEventsForDate(currentDate)}
		{@const hasEvents = dayEvents.length > 0}
		{@const calculateTimeRange = (events: CalendarEvent[]) => {
			if (events.length === 0) {
				return {
					startHour: 6,
					endHour: 22,
					hours: Array.from({ length: 16 }, (_, i) => 6 + i)
				};
			}

			let earliestHour = 18;
			let latestHour = 8;

			events.forEach((event) => {
				if (event.kind === 31922) return;
				let startTime: number;
				if (event.start?.includes('-')) {
					startTime = new Date(event.start).getTime() / 1000;
				} else {
					startTime = parseInt(event.start || '0');
				}
				const eventHour = new Date(startTime * 1000).getHours();
				if (eventHour < earliestHour) earliestHour = eventHour;
				if (eventHour > latestHour) latestHour = eventHour;
			});

			const startHour = Math.max(0, earliestHour - 2);
			const endHour = Math.min(23, latestHour + 2);
			const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

			return { startHour, endHour, hours };
		}}
		{@const timeRange = calculateTimeRange(dayEvents)}
		{@const timedEvents = dayEvents.filter((event) => event.kind !== 31922)}
		{@const eventLayout = calculateEventLayout(timedEvents)}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<!-- Day header -->
			<div class="p-4 border-b border-gray-200 bg-gray-50">
				<h3 class="text-lg font-semibold text-gray-900">
					{currentDate.toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</h3>
				<div class="text-sm text-gray-600 mt-1">
					{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
				</div>
			</div>

			<div
				class="flex"
				style="height: {Math.min((timeRange.endHour - timeRange.startHour + 1) * 60 + 80, 800)}px;"
			>
				<!-- Fixed time column -->
				<div class="w-20 shrink-0 border-r border-gray-200 bg-gray-50">
					{#each timeRange.hours as hour}
						<div class="h-[60px] p-2 text-sm text-gray-600 border-b border-gray-100 flex items-start">
							{formatTime(new Date(2000, 0, 1, hour, 0, 0, 0))}
						</div>
					{/each}
				</div>
				<!-- Content area -->
				<div bind:this={dayScrollRef} class="flex-1 relative overflow-y-auto">
					{#if !hasEvents}
						<div class="absolute inset-0 flex items-start justify-center pt-16 bg-gray-50/90">
							<div class="text-center">
								<div class="text-gray-400 text-6xl mb-4">📅</div>
								<h3 class="text-xl font-semibold text-gray-700 mb-2">No Events Today</h3>
								<p class="text-gray-500">There are no events scheduled for this day.</p>
							</div>
						</div>
					{/if}
					<!-- Hour grid lines -->
					{#each timeRange.hours as hour, index}
						<div
							data-hour={hour}
							class="absolute left-0 right-0 border-b border-gray-300"
							style="top: {index * 60}px;"
						/>
					{/each}

					<!-- Render events with layout -->
					{#each eventLayout as { event, position }}
						{@const startTime = event.start?.includes('-') ? new Date(event.start).getTime() / 1000 : parseInt(event.start || '0')}
						{@const endTime = event.end ? (event.end.includes('-') ? new Date(event.end).getTime() / 1000 : parseInt(event.end)) : startTime + 3600}
						{@const start = new Date(startTime * 1000)}
						{@const end = new Date(endTime * 1000)}
						{@const startMinutes = start.getHours() * 60 + start.getMinutes()}
						{@const endMinutes = end.getHours() * 60 + end.getMinutes()}
						{@const duration = endMinutes - startMinutes}
						{@const rangeStartMinutes = timeRange.startHour * 60}
						{@const topPosition = (startMinutes - rangeStartMinutes) * 1}
						{@const heightPixels = duration * 1}
						{#if topPosition + heightPixels >= 0 && topPosition <= (timeRange.endHour - timeRange.startHour + 1) * 60}
							<div
								onclick={() => onEventClick?.(event)}
								class="absolute text-white p-2 rounded cursor-pointer hover:opacity-90 transition-colors overflow-hidden z-10 {getEventColor ? getEventColor(event).replace(/border-\w+/, '') : 'bg-bitcoin-orange'}"
								style="top: {topPosition}px; left: {2 + position.left}%; width: {position.width - 4}%; height: {Math.max(heightPixels, 30)}px;"
							>
								<div class="font-semibold text-sm truncate">{event.title}</div>
								<div class="text-xs opacity-90">
									{formatTime(start)}
									{#if event.end}
										{' - ' + formatTime(end)}
									{/if}
								</div>
							</div>
						{/if}
					{/each}

					<!-- All-day events -->
					{#each dayEvents.filter((event) => event.kind === 31922) as event}
						<div
							onclick={() => onEventClick?.(event)}
							class="absolute top-2 left-2 right-2 bg-gray-100 text-gray-800 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden z-10"
						>
							<div class="font-semibold text-sm truncate">{event.title}</div>
							<div class="text-xs text-gray-600">All day</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
