<script lang="ts">
	let { message = 'Nothing here yet.' }: { message?: string } = $props();
</script>

<p class="panel text-text-muted rounded-lg px-6 py-10 text-center">{message}</p>
