<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Button from '$lib/components/Button.svelte';
</script>

<SeoHead
	meta={{
		title: 'Gildenkrieg',
		description:
			'Gildenkrieg: a strategic MMO experience taking place across the universe built around guild warfare, empire building, territory control, and emergent team tactics.',
		path: '/gildenkrieg'
	}}
/>

<PageHeader
	title="Gildenkrieg"
	lede="A strategic MMO experience taking place across the universe built around guild warfare, empire building, territory control, and emergent team tactics."
/>

<section class="motion-stagger mb-10 grid gap-6 md:grid-cols-3">
	<article class="panel card-lift p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Universal scale</h2>
		<p class="text-text-muted text-sm">
			A vast, procedurally generated persistent universe that continuously evolves and is seamlessly shared by
			every player, creating a single, interconnected world shaped by exploration, conflict, discovery, and
			player-driven events.
		</p>
	</article>
	<article class="panel card-lift p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Empire building</h2>
		<p class="text-text-muted text-sm">
			Players command every layer of their empire, from constructing advanced civilizations and automating
			industrial production to mobilizing powerful military forces and forming guilds that shape the political
			and economic landscape of the universe.
		</p>
	</article>
	<article class="panel card-lift p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Tactical combat</h2>
		<p class="text-text-muted text-sm">
			Dynamic, team-driven combat where roles, positioning, communication, and timing determine victory. Take
			direct control from a first-person perspective or command entire fleets through an RTS-style strategic
			interface; coordinating formations, objectives, and large-scale engagements across the battlefield.
		</p>
	</article>
	<article class="panel card-lift p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Universe exploration</h2>
		<p class="text-text-muted text-sm">
			Explore an immense, uncharted universe filled with procedurally generated planets, hidden resources,
			ancient discoveries, and emerging frontiers. Chart new star systems, establish strategic outposts, and uncover opportunities that can reshape the future of your empire.
		</p>
	</article>
	<article class="panel card-lift p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Rogue enterprise</h2>
		<p class="text-text-muted text-sm">
			Forge your own path beyond the reach of guilds and empires. Operate as an independent trader, mercenary,
			smuggler, bounty hunter, or pirate within a fully player-driven economy where supply, demand, risk, and
			conflict determine the value of every resource, shipment, and opportunity.
		</p>
	</article>
	<article class="panel card-lift p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Live operations</h2>
		<p class="text-text-muted text-sm">
			A continuously evolving online universe powered by scalable backend services, real-time telemetry,
			automated deployment pipelines, and persistent world infrastructure. New content, balance updates, events,
			and system improvements can be delivered seamlessly while keeping the universe active, stable, and
			responsive around the clock.
		</p>
	</article>
</section>

<section class="panel-glow panel-glow-pulse motion-fade-up motion-delay-2 p-6 md:p-8">
	<h2 class="text-text mb-3 text-xl font-semibold">Status</h2>
	<p class="text-text-muted mb-6 max-w-2xl">
		Gildenkrieg is currently in active development. This section will be updated with alpha/beta
		details, media, and links to repositories or community channels as they become available.
	</p>
	<div class="flex flex-wrap gap-3">
		<Button href="/contact" variant="primary">Get in touch</Button>
		<Button href="/projects">View other projects</Button>
	</div>
</section>
