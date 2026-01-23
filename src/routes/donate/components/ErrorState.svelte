<script lang="ts">
	let { error } = $props<{ error: string }>();
</script>

<div class="container mx-auto px-4 py-12">
	<div class="text-center">
		<h1 class="text-4xl font-bold mb-8 font-archivo-black">Donate</h1>
		<div class="bg-red-50 border border-red-200 rounded-lg p-6">
			<p class="text-red-600">Unable to load zapraisers at this time.</p>
			<p class="text-sm text-red-500 mt-2">{error}</p>
		</div>
	</div>
</div>
