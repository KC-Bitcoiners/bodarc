<script lang="ts">
	import './layout.css';
	import logo from '$lib/assets/logo.svg';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// Import fonts
	import "@fontsource/archivo-black";
	import "@fontsource/archivo-black/400.css";

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={logo} /></svelte:head>
<Nav />
{@render children()}
<Footer />
