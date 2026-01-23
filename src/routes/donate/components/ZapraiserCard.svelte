<script lang="ts">
	import { browser } from "$app/environment";
	import { nostrConfig } from "$lib/config";
	import { pool } from "$lib/nostr";
	import {
		getZapGoalAmount,
		getZapGoalClosedAt,
		getZapGoalRelays
	} from "$lib/utils/zapGoals";
	import { qrcode } from "@libs/qrcode";
	import { MoreVertical } from "@lucide/svelte";
	import { relaySet } from "applesauce-core/helpers";
	import type { NostrEvent } from "applesauce-core/helpers/event";
	import { kinds } from "applesauce-core/helpers/event";
	import { getEventPointerForEvent, neventEncode } from "applesauce-core/helpers/pointers";
	import { onMount } from "svelte";
	import type { Zapraiser } from "../+page.client.client";

	let { zapraiser, index = 0 } = $props<{ zapraiser: Zapraiser; index?: number }>();
	let current = $state(zapraiser.current);

	// Extract zap amount from a zap receipt event (used for auto-refresh)
	function extractZapAmount(event: any): number {
		// Try to find amount in bolt11 tag
		const bolt11Tag = event.tags?.find((tag: string[]) => tag[0] === "bolt11");
		if (bolt11Tag && bolt11Tag[1]) {
			// Parse amount from bolt11 invoice - look for milli-satoshis pattern
			const msatMatch = bolt11Tag[1].match(/amount=(\d+)/);
			if (msatMatch) {
				// Convert from millisatoshis to satoshis
				const msats = parseInt(msatMatch[1]);
				return Math.floor(msats / 1000);
			}

			// Alternative: try to extract from the invoice data directly
			try {
				const invoice = bolt11Tag[1];
				if (invoice.includes("lnbc")) {
					// Fallback: try to match amount followed by unit
					const fallbackMatch = invoice.match(/(\d+)([munp])/);
					if (fallbackMatch) {
						const amount = parseInt(fallbackMatch[1]);
						const unit = fallbackMatch[2];

						switch (unit) {
							case "n":
								return Math.floor(amount / 10);
							case "u":
								return Math.floor(amount * 100);
							default:
								return Math.floor(amount * 100000000);
						}
					}
				}
			} catch (e) {
				// Ignore parsing errors
			}
		}

		return 0;
	}

	// Fetch zap receipts for this zap goal
	async function fetchZapReceipts(goal: NostrEvent): Promise<number> {
		console.log(`🔍 Fetching zap receipts for zap goal: ${goal.id}`);

		const relays = getZapGoalRelays(goal);
		const closedAt = getZapGoalClosedAt(goal);
		const filter: any = {
			kinds: [kinds.Zap], // Zap receipts
			"#e": [goal.id] // Filter for receipts referencing this zap goal
		};

		// Set upper limit on zaps
		if (closedAt) filter.until = closedAt;

		const receipts: any[] = [];
		const receiptIds = new Set<string>(); // Track unique receipt IDs to prevent duplicates

		try {
			const eventsPromise = new Promise<any[]>((resolve, reject) => {
				const timeout = setTimeout(() => {
					console.log("⏰ Zap receipts timeout");
					reject(new Error("Request timeout"));
				}, 15000); // 15 second timeout

				const events: any[] = [];

				// Use the relays from the goal event, fallback to allRelays (including community relay) if empty
				// Always include community relay even if goal specifies other relays
				const relaysToUse = relaySet(relays, nostrConfig.communityRelay);

				pool.request(relaysToUse, filter).subscribe({
					next: (nostrEvent) => {
						// Filter by closed_at if present - only count zaps before closed_at
						if (closedAt && nostrEvent.created_at > closedAt) {
							return;
						}

						// Extract amount from bolt11 tag or description tag
						const amount = extractZapAmount(nostrEvent);
						if (amount > 0) {
							// Skip duplicates
							if (receiptIds.has(nostrEvent.id)) return;

							receiptIds.add(nostrEvent.id);
							events.push(nostrEvent);
							receipts.push({ amount });
						}
					},
					error: (error) => {
						console.error("💥 Error fetching zap receipts:", error);
						clearTimeout(timeout);
						reject(error);
					},
					complete: () => {
						clearTimeout(timeout);
						resolve(events);
					}
				});
			});

			await eventsPromise;
			const totalZapped = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
			return totalZapped;
		} catch (error) {
			console.warn(`⚠️ Failed to fetch zap receipts for ${goal.id}:`, error);
			return current; // Return current value on error
		}
	}

	// Initial load and auto-refresh
	onMount(async () => {
		// Initial fetch
		loading = true;
		const totalZapped = await fetchZapReceipts(zapraiser.goal);
		current = totalZapped;
		loading = false;

		// Auto-refresh zap receipts every 30 seconds
		const interval = setInterval(async () => {
			console.log(`🔄 Auto-refreshing zap receipts for ${zapraiser.goal.id}...`);
			const totalZapped = await fetchZapReceipts(zapraiser.goal);
			current = totalZapped;
		}, 30000); // 30 seconds

		return () => clearInterval(interval);
	});

	// Calculate derived values
	let goalAmount = $derived(getZapGoalAmount(zapraiser.goal) || 0);
	let percentage = $derived(goalAmount > 0 ? (current / goalAmount) * 100 : 0);
	let remaining = $derived(Math.max(0, goalAmount - current));
</script>

<div
	class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all"
	style="opacity: 1; transform: translateY(0); animation: fadeIn 0.5s ease-in-out {index * 0.1}s both; animation-fill-mode: both;"
>
	<div class="flex gap-6">
		<!-- Left Column: Metadata, Note Text, and Progress Bar -->
		<div class="grow">
			<!-- Author Info -->
			<div class="flex items-center mb-4">
				{#if zapraiser.author?.picture}
					<img
						src={zapraiser.author.picture}
						alt={zapraiser.author.name || "Author"}
						class="w-12 h-12 rounded-full mr-3"
					/>
				{/if}
				<div>
					<h3 class="font-semibold text-gray-900">
						{zapraiser.author?.name ||
							zapraiser.author?.display_name ||
							"Anonymous"}
					</h3>
					<p class="text-sm text-gray-500">
						{new Date(zapraiser.goal.created_at * 1000).toLocaleDateString()}
					</p>
				</div>
			</div>

			<!-- Zapraiser Content -->
			<div class="mb-4 text-left">
				<p class="text-gray-800 whitespace-pre-wrap">
					{zapraiser.goal.content}
				</p>
			</div>

			<!-- Progress Bar -->
			<div class="mb-4">
				<div class="w-full">
					<div class="flex justify-between mb-2">
						<span class="text-sm font-medium text-gray-700">Progress</span>
						<span class="text-sm text-gray-600">
							{current.toLocaleString()} / {goalAmount.toLocaleString()} sats
							({percentage.toFixed(1)}%)
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-3">
						<div
							class="bg-bitcoin-orange h-3 rounded-full transition-all duration-300"
							style="width: {percentage}%"
						>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Column: QR Code and Three Dot Menu -->
		<div class="flex items-center gap-2">
			<!-- QR Code -->
			{#if browser}
				{@const pointer = getEventPointerForEvent(
					zapraiser.goal,
					getZapGoalRelays(zapraiser.goal)
				)}
				{@const nevent = neventEncode(pointer)}
				{@const url = `https://njump.me/${nevent}`}
				{@const qrCodeUrlPromise = (async () => {
					try {
						const svg = await qrcode(url, {output: 'svg'})
						return await `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
					} catch (err) {
						console.error("Error generating QR code:", err);
						return "";
					}
				})()}
				{#await qrCodeUrlPromise then qrCodeUrl}
					<div class="flex flex-col items-center gap-1">
						<div class="text-xs text-gray-500">Scan to zap</div>
						{#if qrCodeUrl}
							<div class="p-2 bg-white border border-gray-200 rounded-lg">
								<img
									src={qrCodeUrl}
									alt="QR Code for zapping"
									class="w-32 h-32"
								/>
							</div>
						{/if}
					</div>
				{/await}
			{/if}

			<!-- Three Dot Menu -->
			<details class="dropdown dropdown-end">
				<summary class="btn btn-ghost btn-sm p-1 rounded-full">
					<MoreVertical class="w-5 h-5 text-gray-600" />
				</summary>
				<ul class="menu dropdown-content bg-white rounded-box z-10 w-48 p-2 shadow-lg">
					<li>
						<div class="px-4 py-2 text-sm text-gray-700">
							<div class="font-medium">Note ID</div>
							<div class="text-xs text-gray-500 truncate">
								{zapraiser.goal.id}
							</div>
						</div>
					</li>
					<li>
						<button
							onclick={() => {
								navigator.clipboard.writeText(zapraiser.goal.id);
							}}
							class="text-sm text-gray-700"
						>
							Copy Note ID
						</button>
					</li>
				</ul>
			</details>
		</div>
	</div>

	<!-- Stats -->
	<div class="mt-4 pt-4 border-t border-gray-100">
		<div class="flex justify-between items-center text-sm text-gray-600">
			<span>
				{current > 0
					? `${percentage.toFixed(1)}% funded`
					: "No zaps yet"}
			</span>
			<span>
				{remaining > 0
					? `${remaining.toLocaleString()} sats remaining`
					: "Goal reached! 🎉"}
			</span>
		</div>
	</div>
</div>
