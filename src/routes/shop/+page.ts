import { fetchBTCMapVendors, type BTCMapVendor } from "$lib/utils/btcmap";

export const load = async () => {
	try {
		// Fetch BTCMap vendors server-side for better performance
		const btcMapVendors = await fetchBTCMapVendors();
		
		return {
			btcMapVendors,
			btcMapError: null
		};
	} catch (error) {
		console.error("Error fetching BTCMap vendors:", error);
		
		return {
			btcMapVendors: [] as BTCMapVendor[],
			btcMapError: error instanceof Error ? error.message : "Failed to fetch BTCMap vendors"
		};
	}
};
