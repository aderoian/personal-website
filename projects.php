<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/projects.php';

if (PHP_SAPI !== 'cli' && str_ends_with(request_uri_path(), '/projects.php')) {
    header('Location: ' . url_projects(), true, 301);
    exit;
}

$pageTitle = 'Projects';
$currentNav = 'projects';
$all = load_projects();

require __DIR__ . '/includes/header.php';
?>
        <header class="page-header">
            <h1 class="page-header__title">Projects</h1>
            <p class="page-header__lede">
                Below is a full list of projects I am currently working on or have worked on in the past.
                Most of them are open source and available on GitHub. Click on a project to learn more about it.
                If you are interested in a project, feel free to reach out to me.
            </p>
        </header>

        <?php if (count($all) === 0): ?>
            <p class="empty-state">No projects yet.</p>
        <?php else: ?>
            <ul class="card-grid card-grid--projects">
                <?php foreach ($all as $p): ?>
                    <?php $cardImage = project_effective_image_path($p); ?>
                    <li>
                        <article class="card card--project">
                            <?php if ($cardImage !== ''): ?>
                                <a class="card__image-link" href="<?= e(url_project((string) $p['slug'])) ?>">
                                    <img
                                        class="card__image"
                                        src="<?= e(url_asset($cardImage)) ?>"
                                        alt=""
                                        width="640"
                                        height="360"
                                        loading="lazy"
                                    >
                                </a>
                            <?php endif; ?>
                            <div class="card__body">
                                <h2 class="card__title">
                                    <a href="<?= e(url_project((string) $p['slug'])) ?>">
                                        <?= e((string) $p['title']) ?>
                                    </a>
                                </h2>
                                <?php if (! empty($p['year']) && is_int($p['year'])): ?>
                                    <p class="card__meta"><?= e((string) $p['year']) ?></p>
                                <?php endif; ?>
                                <p class="card__summary"><?= e((string) $p['summary']) ?></p>
                                <a class="card__cta" href="<?= e(url_project((string) $p['slug'])) ?>">
                                    Full project
                                </a>
                            </div>
                        </article>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
<?php
require __DIR__ . '/includes/footer.php';
