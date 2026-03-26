<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/blog.php';

if (PHP_SAPI !== 'cli' && str_ends_with(request_uri_path(), '/blog.php')) {
    header('Location: ' . url_blog(), true, 301);
    exit;
}

$pageTitle = 'Blog';
$currentNav = 'blog';
$posts = published_blog_posts();

require __DIR__ . '/includes/header.php';
?>
        <header class="page-header">
            <h1 class="page-header__title">Blog</h1>
            <p class="page-header__lede">
                Writing about projects, engineering notes, and things I’m learning.
            </p>
        </header>

        <?php if (count($posts) === 0): ?>
            <p class="empty-state">No posts yet.</p>
        <?php else: ?>
            <ul class="card-grid">
                <?php foreach ($posts as $p): ?>
                    <li>
                        <article class="card">
                            <div class="card__body">
                                <p class="card__meta"><?= e(blog_date_label((string) ($p['published_at'] ?? ''))) ?></p>
                                <h2 class="card__title">
                                    <a href="<?= e(url_blog_post((string) ($p['slug'] ?? ''))) ?>">
                                        <?= e((string) ($p['title'] ?? '')) ?>
                                    </a>
                                </h2>
                                <p class="card__summary"><?= e((string) ($p['summary'] ?? '')) ?></p>
                                <a class="card__cta" href="<?= e(url_blog_post((string) ($p['slug'] ?? ''))) ?>">Read post</a>
                            </div>
                        </article>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
<?php
require __DIR__ . '/includes/footer.php';

