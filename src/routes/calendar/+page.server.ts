import { fetchMeetupEvents, getVenueAddress } from "$lib/meetup";
import type { CalendarEvent } from "$lib/types/calendar";

function transformMeetupEvents(meetup: Awaited<ReturnType<typeof fetchMeetupEvents>>): CalendarEvent[] {
	if (!meetup) return [];

	return meetup.events.edges.map((edge) => {
		const event = edge.node;
		// meetup.com dateTime is an ISO string, convert to Unix timestamp
		const startTime = Math.floor(new Date(event.dateTime).getTime() / 1000);
		const endTime = event.endTime
			? Math.floor(new Date(event.endTime).getTime() / 1000)
			: startTime + 3600; // Default 1 hour duration

		return {
			id: `meetup-${event.id}`,
			kind: 31923, // Timed event
			pubkey: "meetup",
			tags: [],
			content: event.description,
			dTag: "meetup-event",
			title: event.title,
			summary: event.title,
			description: event.description,
			location: getVenueAddress(event.venues),
			locations: event.venues?.map((v) => v.address) || [],
			start: startTime.toString(),
			end: endTime.toString(),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			image: event.venues?.[0]?.id
				? `https://secure.meetupstatic.com/photos/event/${event.venues[0].id}/450x300.jpeg`
				: undefined,
			hashtags: [],
			references: [event.eventUrl],
			created_at: Math.floor(Date.now() / 1000)
		};
	});
}

export const load = async (): Promise<{ meetupEvents: CalendarEvent[] }> => {
	// Fetch meetup events data
	const meetup = await fetchMeetupEvents();
	// Transform meetup events to CalendarEvent format on the server
	const meetupEvents = transformMeetupEvents(meetup);
	return { meetupEvents };
};
