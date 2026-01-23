<script lang="ts">
	interface Props {
		title: string;
		videoUrl: string;
		videoTitle?: string;
		backgroundColor?: 'white' | 'gray';
	}

	let { title, videoUrl, videoTitle = 'Video', backgroundColor = 'gray' }: Props = $props();

	const bgClass = backgroundColor === 'white' ? 'bg-white' : 'bg-gray-100';
</script>

<section class={bgClass + ' py-16'}>
	<div class="container mx-auto px-6">
		<div class="max-w-6xl mx-auto text-center mb-10">
			<h2 class="text-4xl font-bold bitcoin-orange mb-8 font-archivo-black">{title}</h2>
		</div>

		<div class="max-w-4xl mx-auto">
			<div class="relative w-full" style="padding-bottom: 56.25%">
				<iframe
					class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
					src={videoUrl}
					frameborder="0"
					allow="fullscreen"
					allowfullscreen
					title={videoTitle}
				/>
			</div>
		</div>
	</div>
</section>
