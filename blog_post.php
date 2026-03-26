<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/blog.php';

if (PHP_SAPI !== 'cli' && str_ends_with(request_uri_path(), '/blog_post.php') && isset($_GET['slug'])) {
    header('Location: ' . url_blog_post((string) $_GET['slug']), true, 301);
    exit;
}

$slug = blog_post_request_slug();
$post = blog_post_by_slug($slug);

if ($post === null || empty($post['published'])) {
    http_response_code(404);
    $pageTitle = 'Not found';
    $currentNav = 'blog';
    require __DIR__ . '/includes/header.php';
    ?>
        <div class="page-header">
            <h1 class="page-header__title">Post not found</h1>
            <p class="page-header__lede">
                That post doesn’t exist or was removed.
                <a href="<?= e(url_blog()) ?>">Back to blog</a>
            </p>
        </div>
    <?php
    require __DIR__ . '/includes/footer.php';
    exit;
}

$pageTitle = (string) ($post['title'] ?? 'Blog post');
$currentNav = 'blog';

require __DIR__ . '/includes/header.php';

$tags = isset($post['tags']) && is_array($post['tags']) ? $post['tags'] : [];
?>
        <article class="project-detail">
            <header class="project-detail__header">
                <p class="project-detail__eyebrow"><a href="<?= e(url_blog()) ?>">Blog</a></p>
                <h1 class="project-detail__title"><?= e((string) ($post['title'] ?? '')) ?></h1>
                <p class="project-detail__meta"><?= e(blog_date_label((string) ($post['published_at'] ?? ''))) ?></p>
                <?php if (count($tags) > 0): ?>
                    <ul class="tag-list">
                        <?php foreach ($tags as $tag): ?>
                            <?php if (is_string($tag) && $tag !== ''): ?>
                                <li class="tag-list__item"><?= e($tag) ?></li>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </header>

            <div class="project-detail__body prose">
                <?= render_markdown((string) ($post['body'] ?? '')) ?>
            </div>
        </article>
<?php
require __DIR__ . '/includes/footer.php';

