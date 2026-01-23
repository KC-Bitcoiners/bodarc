<script lang="ts">
	import { user, isLoading, hasExtension, login, loginWithExtension, logout } from '$lib/stores/nostr';

	interface Props {
		onLoginSuccess?: () => void;
		class?: string;
	}

	let { onLoginSuccess, class: className = '' }: Props = $props();

	let privateKeyInput = $state('');
	let showKeyInput = $state(false);
	let isLoggingIn = $state(false);
	let error = $state<string | null>(null);

	const handleExtensionLogin = async () => {
		isLoggingIn = true;
		error = null;
		try {
			await loginWithExtension();
			onLoginSuccess?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to connect to extension. Please try again.';
		} finally {
			isLoggingIn = false;
		}
	};

	const handleQuickLogin = async () => {
		isLoggingIn = true;
		error = null;
		try {
			await login(); // Generate new key pair
			onLoginSuccess?.();
		} catch (err) {
			error = 'Failed to create account. Please try again.';
		} finally {
			isLoggingIn = false;
		}
	};

	const handleKeyLogin = async () => {
		if (!privateKeyInput.trim()) {
			error = 'Please enter a private key or nsec';
			return;
		}

		isLoggingIn = true;
		error = null;
		try {
			await login(privateKeyInput.trim());
			onLoginSuccess?.();
			privateKeyInput = '';
			showKeyInput = false;
		} catch (err) {
			error = 'Invalid private key format. Please check and try again.';
		} finally {
			isLoggingIn = false;
		}
	};

	const handleLogout = () => {
		privateKeyInput = '';
		showKeyInput = false;
		error = null;
		// The actual logout is handled by the store
	};
</script>

{#if $isLoading}
	<div class="p-4 {className}">
		<div class="animate-pulse">Loading...</div>
	</div>
{:else if $user}
	<div class="p-4 bg-bitcoin-orange text-white rounded-lg {className}">
		<div class="flex flex-col space-y-2">
			<div class="text-sm font-semibold">Logged in as:</div>
			<div class="font-mono text-xs break-all">{$user.npub}</div>
			<div class="text-xs opacity-75">Pubkey: {$user.pubkey.slice(0, 16)}...</div>
			<button
				onclick={() => {
					logout();
					handleLogout();
				}}
				class="mt-2 px-4 py-2 bg-white text-bitcoin-orange rounded font-semibold hover:bg-gray-100 transition-colors"
			>
				Logout
			</button>
		</div>
	</div>
{:else}
	<div class="p-4 bg-gray-50 rounded-lg {className}">
		<div class="space-y-4">
			<div class="text-center">
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Connect with Nostr</h3>
				<p class="text-sm text-gray-600">Sign in to access nostr features</p>
			</div>

			{#if error}
				<div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
					{error}
				</div>
			{/if}

			{#if !showKeyInput}
				<div class="space-y-3">
					{#if $hasExtension}
						<button
							onclick={handleExtensionLogin}
							disabled={isLoggingIn}
							class="w-full px-4 py-3 bg-bitcoin-orange text-white rounded-lg font-semibold hover:bg-bitcoin-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoggingIn ? 'Connecting...' : 'Connect with Nostr Extension'}
						</button>
					{/if}

					<button
						onclick={handleQuickLogin}
						disabled={isLoggingIn}
						class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoggingIn ? 'Creating Account...' : 'Create New Account'}
					</button>

					<button
						onclick={() => (showKeyInput = true)}
						class="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
					>
						Use Existing Key
					</button>
				</div>
			{:else}
				<div class="space-y-3">
					<div>
						<label
							for="privateKey"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							Private Key or nsec
						</label>
						<textarea
							id="privateKey"
							bind:value={privateKeyInput}
							placeholder="Enter your private key or nsec..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bitcoin-orange focus:border-transparent font-mono text-sm"
							rows="3"
						/>
					</div>

					<div class="flex space-x-3">
						<button
							onclick={handleKeyLogin}
							disabled={isLoggingIn}
							class="flex-1 px-4 py-2 bg-bitcoin-orange text-white rounded-lg font-semibold hover:bg-bitcoin-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoggingIn ? 'Signing In...' : 'Sign In'}
						</button>

						<button
							onclick={() => {
								showKeyInput = false;
								privateKeyInput = '';
								error = null;
							}}
							class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			{/if}

			<div class="text-xs text-gray-500 text-center">
				Your keys are stored locally in your browser
			</div>
		</div>
	</div>
{/if}
