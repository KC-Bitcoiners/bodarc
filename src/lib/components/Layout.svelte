<script lang="ts">
	import { page } from '$app/stores';
	import { config } from '$lib/config';
	import logo from '$lib/assets/logo.svg';
	import { Menu } from '@lucide/svelte';
	import UserProfile from './UserProfile.svelte';
	import NostrLogin from './NostrLogin.svelte';
	import SocialLinks from './SocialLinks.svelte';

	interface Props {
		class?: string;
		children: any;
	}

	let { class: className = '', children }: Props = $props();

	let mobileMenuOpen = $state(false);
	let showLoginModal = $state(false);

	const currentPath = $derived($page.url.pathname);

	const toggleMobileMenu = () => {
		mobileMenuOpen = !mobileMenuOpen;
	};
</script>

<div class="min-h-screen bg-white {className}">
	<!-- Header -->
	<header class="bg-white text-black sticky top-0 z-50 border-b border-gray-200">
		<nav class="container mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<!-- Logo -->
				<a
					href="/"
					class="flex items-center gap-3 text-xl font-black bitcoin-orange uppercase tracking-wider font-archivo-black"
				>
					<img
						src={logo}
						alt={config.site.organization.name}
						class="h-8 w-auto"
					/>
					{config.site.organization.name}
				</a>

				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center space-x-8">
					<a
						href="/"
						class="font-semibold transition-colors {currentPath === '/' ? 'bitcoin-orange' : 'hover:text-bitcoin-orange'}"
					>
						Home
					</a>
					<a
						href="/calendar"
						class="font-semibold transition-colors {currentPath === '/calendar' ? 'bitcoin-orange' : 'hover:text-bitcoin-orange'}"
					>
						Calendar
					</a>
					<a
						href="/shop"
						class="font-semibold transition-colors {currentPath === '/shop' ? 'bitcoin-orange' : 'hover:text-bitcoin-orange'}"
					>
						Shop
					</a>
					<a
						href={config.site.externalLinks.meetup.url}
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-bitcoin-orange font-semibold transition-colors"
					>
						Meetup.com
					</a>
					<!-- User Profile or Login -->
					<div class="flex items-center">
						<UserProfile />
						{#if !$user}
							<button
								onclick={() => (showLoginModal = true)}
								class="px-4 py-2 bg-bitcoin-orange text-white rounded-lg font-semibold hover:bg-bitcoin-orange-hover transition-colors"
							>
								Connect Nostr
							</button>
						{/if}
					</div>
				</div>

				<!-- Mobile menu button -->
				<button
					class="md:hidden p-2"
					onclick={toggleMobileMenu}
					aria-label="Toggle mobile menu"
				>
					<Menu />
				</button>
			</div>

			<!-- Mobile Navigation Menu -->
			{#if mobileMenuOpen}
				<div class="md:hidden mt-4 pb-4 border-t border-gray-200">
					<div class="flex flex-col pt-4 space-y-4" onclick={() => (mobileMenuOpen = false)}>
						<a
							href="/"
							class="font-semibold transition-colors {currentPath === '/' ? 'bitcoin-orange' : 'hover:text-bitcoin-orange'}"
						>
							Home
						</a>
						<a
							href="/calendar"
							class="font-semibold transition-colors {currentPath === '/calendar' ? 'bitcoin-orange' : 'hover:text-bitcoin-orange'}"
						>
							Calendar
						</a>
						<a
							href="/shop"
							class="font-semibold transition-colors {currentPath === '/shop' ? 'bitcoin-orange' : 'hover:text-bitcoin-orange'}"
						>
							Shop
						</a>
						<a
							href={config.site.externalLinks.meetup.url}
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-bitcoin-orange font-semibold transition-colors"
						>
							Meetup.com
						</a>
						<!-- Mobile User Profile or Login -->
						<div class="pt-4 border-t border-gray-200">
							{#if $user}
								<div class="px-2">
									<UserProfile />
								</div>
							{:else}
								<button
									onclick={() => (showLoginModal = true)}
									class="w-full px-4 py-2 bg-bitcoin-orange text-white rounded-lg font-semibold hover:bg-bitcoin-orange-hover transition-colors"
								>
									Connect Nostr
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</nav>
	</header>

	<!-- Login Modal -->
	{#if showLoginModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
		>
			<div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div class="p-6">
					<div class="flex justify-between items-center mb-4">
						<h2 class="text-xl font-bold text-gray-900">Connect to Nostr</h2>
						<button
							onclick={() => (showLoginModal = false)}
							class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
						>
							×
						</button>
					</div>
					<NostrLogin onLoginSuccess={() => (showLoginModal = false)} />
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<main>{@render children()}</main>

	<!-- Footer -->
	<footer class="bg-black text-gray-400 py-8">
		<div class="container mx-auto px-6">
			<div class="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
				<p>&copy; 2025 {config.site.organization.name} - All Rights Reserved.</p>
				<SocialLinks />
			</div>
		</div>
	</footer>
</div>
