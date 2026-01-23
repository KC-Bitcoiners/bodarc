<script lang="ts">
	import { socialLinks } from '$lib/config';
	import { Github } from '@lucide/svelte';

	interface Props {
		class?: string;
		linkClass?: string;
	}

	let { class: className = '', linkClass: linkClassName = '' }: Props = $props();

	// Icon mapping - map icon names from config to Lucide icon components
	const iconMap: Record<string, typeof Github> = {
		GitHubIcon: Github
		// Add more icon mappings here as needed
	};
</script>

{#if socialLinks.length > 0}
	<div class="flex items-center space-x-4 {className}">
		{#each socialLinks as link}
			{@const IconComponent = iconMap[link.icon]}
			{#if IconComponent}
				<a
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-white transition-colors duration-200 {linkClassName}"
					aria-label={link.ariaLabel || `Visit our ${link.name} page`}
				>
					<IconComponent class="w-5 h-5" />
				</a>
			{:else}
				{@const _ = console.warn(`Icon "${link.icon}" not found in iconMap`)}
			{/if}
		{/each}
	</div>
{/if}
