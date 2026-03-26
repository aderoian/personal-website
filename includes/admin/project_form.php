<?php

declare(strict_types=1);

/** @var string $pageTitle */
/** @var bool $withEditor */
/** @var array<string, mixed>|null $project */
/** @var string $oldSlug */

$isNew = $project === null;
$p = $project ?? [];
$slugVal = (string) ($p['slug'] ?? '');
$titleVal = (string) ($p['title'] ?? '');
$shortVal = (string) ($p['short_description'] ?? '');
$summaryVal = (string) ($p['summary'] ?? '');
$bodyVal = (string) ($p['body'] ?? '');
$imageVal = (string) ($p['image'] ?? '');
$orderVal = isset($p['featured_order']) && is_int($p['featured_order']) ? (string) $p['featured_order'] : '0';
$yearVal = ! empty($p['year']) && is_int($p['year']) ? (string) $p['year'] : '';
$tags = isset($p['tags']) && is_array($p['tags']) ? $p['tags'] : [];
$tagStr = implode(', ', array_filter(array_map(static fn ($t) => is_string($t) ? $t : '', $tags)));
$repoVal = isset($p['repo_url']) && is_string($p['repo_url']) ? $p['repo_url'] : '';
$demoVal = isset($p['demo_url']) && is_string($p['demo_url']) ? $p['demo_url'] : '';
$embedVal = isset($p['demo_embed_src']) && is_string($p['demo_embed_src']) ? $p['demo_embed_src'] : '';

require __DIR__ . '/layout_header.php';
$flash = admin_take_flash();
?>
    <?php if ($flash !== null): ?>
        <p class="admin-flash admin-flash--<?= e($flash['type'] === 'success' ? 'success' : ($flash['type'] === 'error' ? 'error' : 'info')) ?>"><?= e($flash['message']) ?></p>
    <?php endif; ?>

    <div class="admin-toolbar">
        <h1 class="admin-page-title" style="margin:0"><?= e($isNew ? 'New project' : 'Edit project') ?></h1>
        <a class="admin-btn admin-btn--ghost" href="<?= e(admin_url('projects')) ?>">All projects</a>
    </div>

    <form class="admin-project-form" method="post" action="<?= e(admin_url('project/save')) ?>">
        <input type="hidden" name="csrf_token" value="<?= e(admin_csrf_token()) ?>">
        <input type="hidden" name="old_slug" value="<?= e($oldSlug) ?>">

        <div class="admin-project-form__grid admin-project-form__grid--2">
            <label>
                Slug <span class="admin-muted">(lowercase, hyphens)</span>
                <input type="text" name="slug" required value="<?= e($slugVal) ?>" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="e.g. my-project-name">
            </label>
            <label>
                Featured order
                <input type="number" name="featured_order" required value="<?= e($orderVal) ?>">
            </label>
        </div>

        <label>
            Title
            <input type="text" name="title" required value="<?= e($titleVal) ?>">
        </label>

        <label>
            Short description <span class="admin-muted">(card / home)</span>
            <textarea name="short_description" rows="2" required><?= e($shortVal) ?></textarea>
        </label>

        <label>
            Summary <span class="admin-muted">(projects list)</span>
            <textarea name="summary" rows="3" required><?= e($summaryVal) ?></textarea>
        </label>

        <label>
            Body <span class="admin-muted">(Markdown, inline HTML allowed)</span>
        </label>
        <div class="admin-cm-wrap">
            <textarea id="project-body" name="body" rows="16"><?= e($bodyVal) ?></textarea>
        </div>

        <label>
            Image path <span class="admin-muted">(e.g. assets/projects/name.svg)</span>
            <input type="text" name="image" required value="<?= e($imageVal) ?>" placeholder="assets/projects/…">
        </label>

        <div class="admin-project-form__grid admin-project-form__grid--2">
            <label>
                Year <span class="admin-muted">(optional)</span>
                <input type="number" name="year" value="<?= e($yearVal) ?>" min="1900" max="2100" placeholder="">
            </label>
            <label>
                Tags <span class="admin-muted">(comma-separated)</span>
                <input type="text" name="tags" value="<?= e($tagStr) ?>" placeholder="C++, Web">
            </label>
        </div>

        <label>
            Repository URL <span class="admin-muted">(optional)</span>
            <input type="url" name="repo_url" value="<?= e($repoVal) ?>" placeholder="https://github.com/…">
        </label>

        <div class="admin-project-form__grid admin-project-form__grid--2">
            <label>
                Demo URL <span class="admin-muted">(optional)</span>
                <input type="url" name="demo_url" value="<?= e($demoVal) ?>">
            </label>
            <label>
                Embed src <span class="admin-muted">(optional iframe URL)</span>
                <input type="url" name="demo_embed_src" value="<?= e($embedVal) ?>">
            </label>
        </div>

        <div class="admin-form__actions">
            <button type="submit" class="admin-btn admin-btn--primary">Save project</button>
            <a class="admin-btn admin-btn--ghost" href="<?= e($isNew ? admin_url('projects') : url_project($slugVal)) ?>"><?= $isNew ? 'Cancel' : 'View on site' ?></a>
        </div>
    </form>

    <?php if (! $isNew && $oldSlug !== ''): ?>
        <div class="admin-danger-zone">
            <p class="admin-muted">Delete this project permanently (cannot be undone).</p>
            <form method="post" action="<?= e(admin_url('project/delete')) ?>" onsubmit="return confirm('Delete this project?');">
                <input type="hidden" name="csrf_token" value="<?= e(admin_csrf_token()) ?>">
                <input type="hidden" name="slug" value="<?= e($oldSlug) ?>">
                <button type="submit" class="admin-btn admin-btn--danger">Delete project</button>
            </form>
        </div>
    <?php endif; ?>
<?php
require __DIR__ . '/layout_footer.php';
