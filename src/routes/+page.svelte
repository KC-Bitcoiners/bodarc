<script lang="ts">
	import logo from "$lib/assets/logo.svg";
	import { config } from "$lib/config";
</script>

<svelte:head>
	<title>{config.pages.home.meta.title}</title>
	<meta name="description" content={config.pages.home.meta.description} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.ico" />
</svelte:head>

<!-- Main Content Section - White Background -->
<section class="bg-white text-black py-16">
	<div class="container mx-auto px-6 max-w-6xl">
		<!-- Title -->
		<h1 class="text-4xl md:text-6xl font-black bitcoin-orange mb-16 text-center font-archivo-black">
			{config.pages.home.hero.title}
		</h1>

		<div class="container mx-auto px-6 max-w-6xl">
			<!-- Two Column Layout -->
			<div class="grid md:grid-cols-2 gap-16 items-start">
				<!-- Left Column - Bitcoin Logo -->
				<div class="flex justify-center">
					<img src={logo} width={350} height={350} alt="Group Logo" />
				</div>

				<!-- Right Column - Content -->
				<div class="space-y-6 text-lg">
					<p class="leading-relaxed">{config.pages.home.hero.description}</p>

					<p class="leading-relaxed">{config.pages.home.hero.topics.intro}</p>

					<ul class="list-disc list-inside space-y-1 ml-4 leading-relaxed">
						{#each config.pages.home.hero.topics.list as topic}
							<li>{topic}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Call to Action Section - Orange Background -->
<section class="bg-bitcoin-orange text-white py-16">
	<div class="container mx-auto px-6 text-center">
		<h2 class="text-3xl font-bold mb-8 font-archivo-black">Ready to Join Community?</h2>
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			{#each config.pages.home.callToAction.buttons as button}
				<a
					href={button.url}
					target="_blank"
					rel="noopener noreferrer"
					class="px-8 py-3 rounded-lg font-semibold transition-colors {button.style === 'primary'
						? 'bg-white bitcoin-orange hover:bg-gray-100'
						: 'bg-transparent border-2 border-white text-white hover:bg-white hover:bitcoin-orange hover:text-gray-700'}"
				>
					{button.text}
				</a>
			{/each}
		</div>
	</div>
</section>
