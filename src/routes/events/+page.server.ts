import { browser } from "$app/environment";
import { fetchMeetupEvents } from "$lib/meetup";

export const load = async () => {
  if (browser) throw new Error("This should not run on the client");

  try {
    // Fetch meetup events data
    const group = await fetchMeetupEvents();

    return {
      group,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching events:", error);

    return {
      group: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
