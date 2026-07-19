<script lang="ts">
	import { formatBlogDate } from '$lib/schemas/blog-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section class="mb-10">
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-text text-xl font-semibold">Projects</h2>
			<p class="text-text-muted text-sm">{data.projects.length} total</p>
		</div>
		<a href="/admin/projects/new" class="btn-primary">New project</a>
	</div>

	{#if data.projects.length === 0}
		<p class="text-text-muted panel p-4 text-sm">No projects yet.</p>
	{:else}
		<ul class="divide-border panel divide-y overflow-hidden">
			{#each data.projects as project (project.slug)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<a href="/admin/projects/{project.slug}" class="text-text font-medium hover:underline">
							{project.title}
						</a>
						<p class="text-text-muted font-mono text-xs">{project.slug}</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="chip {project.published ? '' : 'opacity-60'}">
							{project.published ? 'Published' : 'Draft'}
						</span>
						<form method="POST" action="/admin/projects/{project.slug}?/togglePublish">
							<button type="submit" class="btn px-3 py-1 text-xs">
								{project.published ? 'Unpublish' : 'Publish'}
							</button>
						</form>
						<a href="/admin/projects/{project.slug}" class="btn px-3 py-1 text-xs">Edit</a>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-text text-xl font-semibold">Blog posts</h2>
			<p class="text-text-muted text-sm">{data.posts.length} total</p>
		</div>
		<a href="/admin/blog/new" class="btn-primary">New post</a>
	</div>

	{#if data.posts.length === 0}
		<p class="text-text-muted panel p-4 text-sm">No blog posts yet.</p>
	{:else}
		<ul class="divide-border panel divide-y overflow-hidden">
			{#each data.posts as post (post.slug)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<a href="/admin/blog/{post.slug}" class="text-text font-medium hover:underline">
							{post.title}
						</a>
						<p class="text-text-muted font-mono text-xs">
							{post.slug} · {formatBlogDate(post.published_at)}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="chip {post.published ? '' : 'opacity-60'}">
							{post.published ? 'Published' : 'Draft'}
						</span>
						<form method="POST" action="/admin/blog/{post.slug}?/togglePublish">
							<button type="submit" class="btn px-3 py-1 text-xs">
								{post.published ? 'Unpublish' : 'Publish'}
							</button>
						</form>
						<a href="/admin/blog/{post.slug}" class="btn px-3 py-1 text-xs">Edit</a>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
