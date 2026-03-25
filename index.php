<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/projects.php';

if (PHP_SAPI !== 'cli' && str_ends_with(request_uri_path(), '/index.php')) {
    header('Location: ' . url_home(), true, 301);
    exit;
}

$pageTitle = 'Home';
$currentNav = 'home';
$featured = featured_projects(TOP_PROJECTS_COUNT);

require __DIR__ . '/includes/header.php';
?>
        <section class="hero">
            <div class="hero__intro">
                <p class="hero__eyebrow"><?= e(SITE_TAGLINE) ?></p>
                <h1 class="hero__title">Hi, I’m <?= e(SITE_NAME) ?></h1>
            </div>
            <div class="hero__avatar-wrap">
                <img
                    class="hero__avatar"
                    src="<?= e(url_asset(PROFILE_IMAGE)) ?>"
                    alt="<?= e(SITE_NAME) ?>"
                    width="256"
                    height="256"
                    loading="eager"
                    decoding="async"
                >
            </div>
            <div class="hero__body">
                <p class="hero__lead">
                I’m a systems-focused developer who enjoys building efficient, 
                reliable software—from network servers and game engines to developer tooling. 
                My work emphasizes clean architecture, predictable behavior under load, and practical performance.
                </p>
                <p class="hero__text">
                    This site is a snapshot of what I’ve been building recently. To see those projects, explore featured work below or browse the
                    <a href="<?= e(url_projects()) ?>">full project list</a>.
                </p>
            </div>
        </section>

        <section class="section" aria-labelledby="featured-heading">
            <div class="section__head">
                <h2 id="featured-heading" class="section__title">Featured projects</h2>
                <a class="section__link" href="<?= e(url_projects()) ?>">View all</a>
            </div>
            <?php if (count($featured) === 0): ?>
                <p class="empty-state">No projects to show yet—check back soon.</p>
            <?php else: ?>
                <ul class="card-grid">
                    <?php foreach ($featured as $p): ?>
                        <li>
                            <article class="card">
                                <a class="card__image-link" href="<?= e(url_project((string) $p['slug'])) ?>">
                                    <img
                                        class="card__image"
                                        src="<?= e(url_asset((string) $p['image'])) ?>"
                                        alt=""
                                        width="640"
                                        height="360"
                                        loading="lazy"
                                    >
                                </a>
                                <div class="card__body">
                                    <h3 class="card__title">
                                        <a href="<?= e(url_project((string) $p['slug'])) ?>">
                                            <?= e((string) $p['title']) ?>
                                        </a>
                                    </h3>
                                    <p class="card__desc"><?= e((string) $p['short_description']) ?></p>
                                    <a class="card__cta" href="<?= e(url_project((string) $p['slug'])) ?>">
                                        Details
                                    </a>
                                </div>
                            </article>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </section>
<?php
require __DIR__ . '/includes/footer.php';
