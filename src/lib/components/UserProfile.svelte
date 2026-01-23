<script lang="ts">
	import { user, logout } from '$lib/stores/nostr';

	let showProfile = $state(false);

	$effect(() => {
		// Reset showProfile when user logs out
		if (!$user) {
			showProfile = false;
		}
	});

	const truncateNpub = (npub: string) => {
		return `${npub.slice(0, 12)}...${npub.slice(-12)}`;
	};

	const displayName = $derived(
		$user?.metadata?.display_name ||
			$user?.metadata?.name ||
			($user ? truncateNpub($user.npub) : '')
	);

	const handleLogout = () => {
		logout();
		showProfile = false;
	};
</script>

{#if $user}
	<div class="relative">
		<button
			onclick={() => (showProfile = !showProfile)}
			class="flex items-center space-x-2 px-3 py-2 rounded-lg bg-bitcoin-orange text-white hover:bg-bitcoin-orange-hover transition-colors"
		>
			{#if $user.metadata?.picture}
				<img
					src={$user.metadata.picture}
					alt={displayName}
					class="w-6 h-6 rounded-full object-cover"
					onerror={(e) => {
						// Fallback to default avatar if image fails to load
						const target = e.target as HTMLImageElement;
						target.style.display = 'none';
						target.nextElementSibling?.classList.remove('hidden');
					}}
				/>
			{/if}
			<div class="w-6 h-6 bg-white rounded-full flex items-center justify-center {($user.metadata?.picture ? 'hidden' : '')}">
				<div class="w-4 h-4 bg-bitcoin-orange rounded-full"></div>
			</div>
			<span class="text-sm font-medium hidden md:block max-w-32 truncate">{displayName}</span>
		</button>

		{#if showProfile}
			<!-- Backdrop -->
			<div class="fixed inset-0 z-40" onclick={() => (showProfile = false)} />

			<!-- Profile dropdown -->
			<div
				class="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
			>
				<div class="p-4">
					<div class="flex items-center justify-between mb-4">
						<h3 class="font-semibold text-gray-900">Nostr Profile</h3>
						<button
							onclick={() => (showProfile = false)}
							class="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>

					<div class="space-y-3">
						<!-- Profile picture and name -->
						<div class="flex items-center space-x-3 pb-3 border-b border-gray-200">
							{#if $user.metadata?.picture}
								<img
									src={$user.metadata.picture}
									alt={displayName}
									class="w-12 h-12 rounded-full object-cover"
									onerror={(e) => {
										const target = e.target as HTMLImageElement;
										target.style.display = 'none';
										target.nextElementSibling?.classList.remove('hidden');
									}}
								/>
							{/if}
							<div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center {($user.metadata?.picture ? 'hidden' : '')}">
								<div class="w-8 h-8 bg-bitcoin-orange rounded-full"></div>
							</div>
							<div>
								<div class="font-semibold text-gray-900">{displayName}</div>
								{#if $user.metadata?.about}
									<div class="text-sm text-gray-600 mt-1 line-clamp-2">
										{$user.metadata.about}
									</div>
								{/if}
							</div>
						</div>

						<div>
							<div class="text-xs font-medium text-gray-500 uppercase tracking-wider">
								Public Key
							</div>
							<div class="font-mono text-sm text-gray-900 break-all mt-1">{$user.npub}</div>
						</div>

						<div>
							<div class="text-xs font-medium text-gray-500 uppercase tracking-wider">Hex</div>
							<div class="font-mono text-xs text-gray-600 break-all mt-1">{$user.pubkey}</div>
						</div>

						<div class="pt-3 border-t border-gray-200">
							<button
								onclick={handleLogout}
								class="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
