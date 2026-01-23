<script lang="ts">
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import type { Zapraiser } from "../+page.client.client";
	import ZapraiserCard from "./ZapraiserCard.svelte";

	let { zapraisers } = $props<{ zapraisers: Zapraiser[] }>();

	onMount(() => {
		// Add global animation style
		if (browser) {
			const style = document.createElement("style");
			style.textContent = `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
			document.head.appendChild(style);
		}
	});
</script>

<section class="mb-16">
	<h2 class="text-3xl font-bold mb-8 font-archivo-black bitcoin-orange text-center">
		Active Zapraisers
	</h2>

	{#if zapraisers.length > 0}
		<div class="space-y-8">
			{#each zapraisers as zapraiser, index}
				<ZapraiserCard {zapraiser} {index} />
			{/each}
		</div>
	{:else}
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
			<p class="text-gray-600 text-lg mb-4">No active zapraisers found</p>
			<p class="text-gray-500">
				Check back later for new fundraising campaigns from our community members.
			</p>
		</div>
	{/if}
</section>
