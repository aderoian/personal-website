<?php

declare(strict_types=1);

/** @var string $pageTitle */
/** @var bool $withEditor */
/** @var array<string, mixed>|null $post */
/** @var string $oldSlug */

$isNew = $post === null;
$p = $post ?? [];
$slugVal = (string) ($p['slug'] ?? '');
$titleVal = (string) ($p['title'] ?? '');
$summaryVal = (string) ($p['summary'] ?? '');
$bodyVal = (string) ($p['body'] ?? '');
$publishedVal = ! empty($p['published']);
$publishedAtVal = (string) ($p['published_at'] ?? date('Y-m-d'));
$updatedAtVal = (string) ($p['updated_at'] ?? '');
$tags = isset($p['tags']) && is_array($p['tags']) ? $p['tags'] : [];
$tagStr = implode(', ', array_filter(array_map(static fn ($t) => is_string($t) ? $t : '', $tags)));

require __DIR__ . '/layout_header.php';
$flash = admin_take_flash();
?>
    <?php if ($flash !== null): ?>
        <p class="admin-flash admin-flash--<?= e($flash['type'] === 'success' ? 'success' : ($flash['type'] === 'error' ? 'error' : 'info')) ?>"><?= e($flash['message']) ?></p>
    <?php endif; ?>

    <div class="admin-toolbar">
        <h1 class="admin-page-title" style="margin:0"><?= e($isNew ? 'New post' : 'Edit post') ?></h1>
        <a class="admin-btn admin-btn--ghost" href="<?= e(admin_url('blog')) ?>">All posts</a>
    </div>

    <form class="admin-project-form" method="post" action="<?= e(admin_url('post/save')) ?>">
        <input type="hidden" name="csrf_token" value="<?= e(admin_csrf_token()) ?>">
        <input type="hidden" name="old_slug" value="<?= e($oldSlug) ?>">

        <div class="admin-project-form__grid admin-project-form__grid--2">
            <label>
                Slug <span class="admin-muted">(lowercase, hyphens)</span>
                <input type="text" name="slug" required value="<?= e($slugVal) ?>" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="e.g. my-post-title">
            </label>
            <label style="display:flex; align-items:center; gap:.5rem; margin-top:1.25rem">
                <input type="checkbox" name="published" value="1" <?= $publishedVal ? 'checked' : '' ?>>
                Published
            </label>
        </div>

        <label>
            Title
            <input type="text" name="title" required value="<?= e($titleVal) ?>">
        </label>

        <label>
            Summary <span class="admin-muted">(blog list)</span>
            <textarea name="summary" rows="3" required><?= e($summaryVal) ?></textarea>
        </label>

        <div class="admin-project-form__grid admin-project-form__grid--2">
            <label>
                Publish date <span class="admin-muted">(YYYY-MM-DD)</span>
                <input type="date" name="published_at" required value="<?= e($publishedAtVal) ?>">
            </label>
            <label>
                Tags <span class="admin-muted">(comma-separated)</span>
                <input type="text" name="tags" value="<?= e($tagStr) ?>" placeholder="PHP, Web">
            </label>
        </div>

        <label>
            Body <span class="admin-muted">(Markdown, inline HTML allowed)</span>
        </label>
        <div class="admin-cm-wrap">
            <textarea id="post-body" name="body" rows="18"><?= e($bodyVal) ?></textarea>
        </div>

        <?php if (! $isNew && $updatedAtVal !== ''): ?>
            <p class="admin-muted">Last updated: <code><?= e($updatedAtVal) ?></code></p>
        <?php endif; ?>

        <div class="admin-form__actions">
            <button type="submit" class="admin-btn admin-btn--primary">Save post</button>
            <a class="admin-btn admin-btn--ghost" href="<?= e($isNew ? admin_url('blog') : url_blog_post($slugVal)) ?>"><?= $isNew ? 'Cancel' : 'View on site' ?></a>
        </div>
    </form>

    <?php if (! $isNew && $oldSlug !== ''): ?>
        <div class="admin-danger-zone">
            <p class="admin-muted">Delete this post permanently (cannot be undone).</p>
            <form method="post" action="<?= e(admin_url('post/delete')) ?>" onsubmit="return confirm('Delete this post?');">
                <input type="hidden" name="csrf_token" value="<?= e(admin_csrf_token()) ?>">
                <input type="hidden" name="slug" value="<?= e($oldSlug) ?>">
                <button type="submit" class="admin-btn admin-btn--danger">Delete post</button>
            </form>
        </div>
    <?php endif; ?>
<?php
require __DIR__ . '/layout_footer.php';

