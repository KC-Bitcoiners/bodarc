<script lang="ts">
	import { browser } from "$app/environment";
	import type { Zapraiser } from "./+page";
	import ErrorState from "./components/ErrorState.svelte";
	import InfoSection from "./components/InfoSection.svelte";
	import LoadingState from "./components/LoadingState.svelte";
	import ZapraiserList from "./components/ZapraiserList.svelte";

	let { data } = $props();

	let zapraisers = $state<Zapraiser[]>(data.zapraisers || []);
	let loading = $state(!browser || (data.zapraisers?.length === 0 && !data.error));
	let error = $state<string | null>(data.error || null);

	// Sync data prop changes to local state
	$effect(() => {
		if (data.zapraisers && data.zapraisers.length > 0) {
			zapraisers = data.zapraisers;
			loading = false;
		} else if (data.error) {
			error = data.error;
			loading = false;
		} else if (data.zapraisers && data.zapraisers.length === 0) {
			// Empty array means no zapraisers found, not loading
			loading = false;
		}
	});
</script>

{#if loading}
	<LoadingState />
{:else if error}
	<ErrorState {error} />
{:else}
	<div class="container mx-auto px-4 py-12">
		<ZapraiserList {zapraisers} />
		<InfoSection />
	</div>
{/if}
