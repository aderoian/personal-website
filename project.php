<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/projects.php';

if (PHP_SAPI !== 'cli' && str_ends_with(request_uri_path(), '/project.php') && isset($_GET['slug'])) {
    header('Location: ' . url_project((string) $_GET['slug']), true, 301);
    exit;
}

$slug = project_request_slug();
$project = project_by_slug($slug);

if ($project === null) {
    http_response_code(404);
    $pageTitle = 'Not found';
    $currentNav = '';
    require __DIR__ . '/includes/header.php';
    ?>
        <div class="page-header">
            <h1 class="page-header__title">Project not found</h1>
            <p class="page-header__lede">
                That project doesn’t exist or was removed.
                <a href="<?= e(url_projects()) ?>">Back to projects</a>
            </p>
        </div>
    <?php
    require __DIR__ . '/includes/footer.php';
    exit;
}

$pageTitle = (string) $project['title'];
$currentNav = 'projects';

require __DIR__ . '/includes/header.php';

$demoUrl = isset($project['demo_url']) && is_string($project['demo_url']) ? trim($project['demo_url']) : '';
$repoUrl = isset($project['repo_url']) && is_string($project['repo_url']) ? trim($project['repo_url']) : '';
$embedSrc = isset($project['demo_embed_src']) && is_string($project['demo_embed_src']) ? trim($project['demo_embed_src']) : '';
$tags = isset($project['tags']) && is_array($project['tags']) ? $project['tags'] : [];
?>
        <article class="project-detail">
            <header class="project-detail__header">
                <p class="project-detail__eyebrow"><a href="<?= e(url_projects()) ?>">Projects</a></p>
                <h1 class="project-detail__title"><?= e((string) $project['title']) ?></h1>
                <?php if (! empty($project['year']) && is_int($project['year'])): ?>
                    <p class="project-detail__meta"><?= e((string) $project['year']) ?></p>
                <?php endif; ?>
                <?php if (count($tags) > 0): ?>
                    <ul class="tag-list">
                        <?php foreach ($tags as $tag): ?>
                            <?php if (is_string($tag) && $tag !== ''): ?>
                                <li class="tag-list__item"><?= e($tag) ?></li>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
                <ul class="project-detail__actions">
                    <?php if ($demoUrl !== ''): ?>
                        <li><a class="button button--primary" href="<?= e($demoUrl) ?>" rel="noopener noreferrer" target="_blank">Live demo</a></li>
                    <?php endif; ?>
                    <?php if ($repoUrl !== ''): ?>
                        <li><a class="button" href="<?= e($repoUrl) ?>" rel="noopener noreferrer" target="_blank">Repository</a></li>
                    <?php endif; ?>
                </ul>
            </header>

            <figure class="project-detail__figure">
                <img
                    class="project-detail__image"
                    src="<?= e(url_asset((string) $project['image'])) ?>"
                    alt=""
                    width="960"
                    height="540"
                    loading="lazy"
                >
            </figure>

            <div class="project-detail__body prose">
                <?= render_markdown((string) $project['body']) ?>
            </div>

            <?php if ($embedSrc !== ''): ?>
                <section class="demo-panel" aria-labelledby="demo-heading">
                    <h2 id="demo-heading" class="demo-panel__title">Embedded demo</h2>
                    <p class="demo-panel__note">
                        External content shown in a restricted frame.
                        <?php if ($demoUrl !== ''): ?>
                            Prefer <a href="<?= e($demoUrl) ?>" rel="noopener noreferrer" target="_blank">opening the demo in a new tab</a>.
                        <?php endif; ?>
                    </p>
                    <div class="demo-panel__frame-wrap">
                        <iframe
                            class="demo-panel__frame"
                            src="<?= e($embedSrc) ?>"
                            title="<?= e('Demo: ' . (string) $project['title']) ?>"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        ></iframe>
                    </div>
                </section>
            <?php endif; ?>
        </article>
<?php
require __DIR__ . '/includes/footer.php';
