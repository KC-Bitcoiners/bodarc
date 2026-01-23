<script lang="ts">
	import SocialLinks from './SocialLinks.svelte';
	import { config } from '$lib/config';
</script>

<footer class="bg-black text-gray-400 py-8">
	<div class="container mx-auto px-6">
		<div class="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
			<p>&copy; 2025 {config.site.organization.name} - All Rights Reserved.</p>
			<SocialLinks />
		</div>
	</div>
</footer>
