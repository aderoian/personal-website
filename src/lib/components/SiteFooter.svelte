<script lang="ts">
	import { navItems, site } from '$lib/config';

	const year = new Date().getFullYear();
</script>

<footer class="border-border bg-bg-elevated/50 relative z-10 mt-auto border-t">
	<div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
		<div>
			<p class="text-text mb-2 font-semibold">{site.name}</p>
			<p class="text-text-muted text-sm">{site.tagline} · Systems & software engineering</p>
		</div>

		<nav aria-label="Footer">
			<p class="text-accent mb-3 font-mono text-xs tracking-wider uppercase">Navigate</p>
			<ul class="space-y-2 text-sm">
				{#each navItems as item (item.id)}
					<li>
						<a href={item.href} class="text-text-muted hover:text-accent no-underline">
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div>
			<p class="text-accent mb-3 font-mono text-xs tracking-wider uppercase">Connect</p>
			<ul class="space-y-2 text-sm">
				<li>
					<a
						href="mailto:{site.contact.email}"
						class="text-text-muted hover:text-accent no-underline"
					>
						{site.contact.email}
					</a>
				</li>
				<li>
					<a
						href={site.contact.github}
						class="text-text-muted hover:text-accent no-underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub
					</a>
				</li>
				<li>
					<a
						href={site.contact.linkedin}
						class="text-text-muted hover:text-accent no-underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						LinkedIn
					</a>
				</li>
			</ul>
		</div>
	</div>

	<div class="border-border/60 text-text-muted border-t px-4 py-4 text-center text-xs md:px-6">
		<p>© {year} {site.name}. All rights reserved.</p>
	</div>
</footer>
