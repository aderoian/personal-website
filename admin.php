<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/projects.php';
require_once __DIR__ . '/includes/projects_store.php';
require_once __DIR__ . '/includes/blog.php';
require_once __DIR__ . '/includes/blog_store.php';
require_once __DIR__ . '/includes/admin_auth.php';

header('X-Robots-Tag: noindex, nofollow');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = request_path();
if (! str_starts_with($path, '/admin')) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

$rest = trim(substr($path, strlen('/admin')), '/');

/**
 * @return array<string, string>
 */
function admin_post_strings(): array
{
    $out = [];
    foreach ($_POST as $k => $v) {
        if (is_string($k) && is_string($v)) {
            $out[$k] = $v;
        }
    }
    return $out;
}

function admin_post_project_from_request(): array
{
    $p = admin_post_strings();
    $slug = trim($p['slug'] ?? '');
    $title = trim($p['title'] ?? '');
    $short = trim($p['short_description'] ?? '');
    $summary = trim($p['summary'] ?? '');
    $body = $p['body'] ?? '';
    if (! is_string($body)) {
        $body = '';
    }
    $image = trim($p['image'] ?? '');
    $featured = isset($p['featured_order']) ? (int) $p['featured_order'] : 0;

    $row = [
        'slug' => $slug,
        'title' => $title,
        'short_description' => $short,
        'summary' => $summary,
        'body' => $body,
        'image' => $image,
        'featured_order' => $featured,
    ];

    $yearRaw = trim($p['year'] ?? '');
    if ($yearRaw !== '' && ctype_digit($yearRaw)) {
        $row['year'] = (int) $yearRaw;
    }

    $tagsRaw = trim($p['tags'] ?? '');
    if ($tagsRaw !== '') {
        $parts = array_map('trim', explode(',', $tagsRaw));
        $tags = [];
        foreach ($parts as $t) {
            if ($t !== '') {
                $tags[] = $t;
            }
        }
        if (count($tags) > 0) {
            $row['tags'] = $tags;
        }
    }

    foreach (['repo_url', 'demo_url', 'demo_embed_src'] as $k) {
        $u = trim($p[$k] ?? '');
        if ($u !== '') {
            $row[$k] = $u;
        }
    }

    return $row;
}

function admin_post_blog_post_from_request(): array
{
    $p = admin_post_strings();
    $slug = trim($p['slug'] ?? '');
    $title = trim($p['title'] ?? '');
    $summary = trim($p['summary'] ?? '');
    $body = $p['body'] ?? '';
    if (! is_string($body)) {
        $body = '';
    }
    $publishedAt = trim($p['published_at'] ?? '');
    $published = ! empty($_POST['published']);

    $row = [
        'slug' => $slug,
        'title' => $title,
        'summary' => $summary,
        'body' => $body,
        'published' => $published,
        'published_at' => $publishedAt,
        'updated_at' => gmdate('Y-m-d\\TH:i:s\\Z'),
    ];

    $tagsRaw = trim($p['tags'] ?? '');
    if ($tagsRaw !== '') {
        $parts = array_map('trim', explode(',', $tagsRaw));
        $tags = [];
        foreach ($parts as $t) {
            if ($t !== '') {
                $tags[] = $t;
            }
        }
        if (count($tags) > 0) {
            $row['tags'] = $tags;
        }
    }

    return $row;
}

// ——— POST ———
if ($method === 'POST') {
    if ($rest === 'login') {
        admin_session_start();
        $token = $_POST['csrf_token'] ?? null;
        $token = is_string($token) ? $token : null;
        if (! admin_csrf_verify($token)) {
            admin_set_flash('Invalid session. Try again.', 'error');
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        $password = $_POST['password'] ?? '';
        $password = is_string($password) ? $password : '';
        if (admin_password_hash_value() === null) {
            admin_set_flash('Admin is not configured. Set ADMIN_PASSWORD_HASH or ADMIN_PASSWORD_HASH in config.local.php.', 'error');
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        if (admin_login($password)) {
            header('Location: ' . admin_url('projects'), true, 302);
            exit;
        }
        admin_set_flash('Invalid password.', 'error');
        header('Location: ' . admin_url(''), true, 302);
        exit;
    }

    if ($rest === 'logout') {
        admin_session_start();
        $token = $_POST['csrf_token'] ?? null;
        $token = is_string($token) ? $token : null;
        if (! admin_csrf_verify($token)) {
            admin_set_flash('Invalid session.', 'error');
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        admin_logout();
        header('Location: ' . admin_url(''), true, 302);
        exit;
    }

    if ($rest === 'project/save') {
        admin_session_start();
        if (! admin_is_logged_in()) {
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        $token = $_POST['csrf_token'] ?? null;
        $token = is_string($token) ? $token : null;
        if (! admin_csrf_verify($token)) {
            admin_set_flash('Invalid session.', 'error');
            header('Location: ' . admin_url('projects'), true, 302);
            exit;
        }

        $oldSlug = trim((string) ($_POST['old_slug'] ?? ''));
        $row = admin_post_project_from_request();
        $normalized = normalize_project_for_storage($row);
        if ($normalized === null) {
            admin_set_flash('Could not save: check all required fields, slug format, image path if set (assets/…), and URLs.', 'error');
            $slug = $row['slug'] ?? '';
            $slug = is_string($slug) ? $slug : '';
            if ($oldSlug !== '') {
                header('Location: ' . admin_url('project/' . rawurlencode($oldSlug)), true, 302);
            } elseif ($slug !== '') {
                header('Location: ' . admin_url('project/new'), true, 302);
            } else {
                header('Location: ' . admin_url('project/new'), true, 302);
            }
            exit;
        }

        $all = load_projects();
        $newSlug = (string) $normalized['slug'];

        if ($oldSlug === '') {
            foreach ($all as $p) {
                if (($p['slug'] ?? '') === $newSlug) {
                    admin_set_flash('A project with that slug already exists.', 'error');
                    header('Location: ' . admin_url('project/new'), true, 302);
                    exit;
                }
            }
            $all[] = $normalized;
        } else {
            $idx = null;
            foreach ($all as $i => $p) {
                if (($p['slug'] ?? '') === $oldSlug) {
                    $idx = $i;
                    break;
                }
            }
            if ($idx === null) {
                admin_set_flash('Project not found.', 'error');
                header('Location: ' . admin_url('projects'), true, 302);
                exit;
            }
            if ($newSlug !== $oldSlug) {
                foreach ($all as $j => $p) {
                    if ($j !== $idx && ($p['slug'] ?? '') === $newSlug) {
                        admin_set_flash('Another project already uses that slug.', 'error');
                        header('Location: ' . admin_url('project/' . rawurlencode($oldSlug)), true, 302);
                        exit;
                    }
                }
            }
            $all[$idx] = $normalized;
        }

        $result = save_projects($all);
        if (! $result['ok']) {
            admin_set_flash($result['error'], 'error');
            if ($oldSlug !== '') {
                header('Location: ' . admin_url('project/' . rawurlencode($oldSlug)), true, 302);
            } else {
                header('Location: ' . admin_url('project/new'), true, 302);
            }
            exit;
        }

        admin_set_flash('Project saved.', 'success');
        header('Location: ' . admin_url('project/' . rawurlencode($newSlug)), true, 302);
        exit;
    }

    if ($rest === 'project/delete') {
        admin_session_start();
        if (! admin_is_logged_in()) {
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        $token = $_POST['csrf_token'] ?? null;
        $token = is_string($token) ? $token : null;
        if (! admin_csrf_verify($token)) {
            admin_set_flash('Invalid session.', 'error');
            header('Location: ' . admin_url('projects'), true, 302);
            exit;
        }
        $delSlug = trim((string) ($_POST['slug'] ?? ''));
        if ($delSlug === '') {
            admin_set_flash('Missing project slug.', 'error');
            header('Location: ' . admin_url('projects'), true, 302);
            exit;
        }
        $all = projects_list_remove_slug(load_projects(), $delSlug);
        $result = save_projects($all);
        if (! $result['ok']) {
            admin_set_flash($result['error'], 'error');
            header('Location: ' . admin_url('projects'), true, 302);
            exit;
        }
        admin_set_flash('Project deleted.', 'success');
        header('Location: ' . admin_url('projects'), true, 302);
        exit;
    }

    if ($rest === 'post/save') {
        admin_session_start();
        if (! admin_is_logged_in()) {
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        $token = $_POST['csrf_token'] ?? null;
        $token = is_string($token) ? $token : null;
        if (! admin_csrf_verify($token)) {
            admin_set_flash('Invalid session.', 'error');
            header('Location: ' . admin_url('blog'), true, 302);
            exit;
        }

        $oldSlug = trim((string) ($_POST['old_slug'] ?? ''));
        $row = admin_post_blog_post_from_request();

        $existing = null;
        if ($oldSlug !== '') {
            $existing = blog_post_by_slug($oldSlug);
        }
        if ($existing !== null && is_array($existing)) {
            $row['updated_at'] = gmdate('Y-m-d\\TH:i:s\\Z');
        }

        $normalized = normalize_blog_post_for_storage($row);
        if ($normalized === null) {
            admin_set_flash('Could not save: check required fields, slug format, and publish date.', 'error');
            if ($oldSlug !== '') {
                header('Location: ' . admin_url('post/' . rawurlencode($oldSlug)), true, 302);
            } else {
                header('Location: ' . admin_url('post/new'), true, 302);
            }
            exit;
        }

        $all = load_blog_posts();
        $newSlug = (string) $normalized['slug'];

        if ($oldSlug === '') {
            foreach ($all as $p) {
                if (($p['slug'] ?? '') === $newSlug) {
                    admin_set_flash('A post with that slug already exists.', 'error');
                    header('Location: ' . admin_url('post/new'), true, 302);
                    exit;
                }
            }
            $all[] = $normalized;
        } else {
            $idx = null;
            foreach ($all as $i => $p) {
                if (($p['slug'] ?? '') === $oldSlug) {
                    $idx = $i;
                    break;
                }
            }
            if ($idx === null) {
                admin_set_flash('Post not found.', 'error');
                header('Location: ' . admin_url('blog'), true, 302);
                exit;
            }
            if ($newSlug !== $oldSlug) {
                foreach ($all as $j => $p) {
                    if ($j !== $idx && ($p['slug'] ?? '') === $newSlug) {
                        admin_set_flash('Another post already uses that slug.', 'error');
                        header('Location: ' . admin_url('post/' . rawurlencode($oldSlug)), true, 302);
                        exit;
                    }
                }
            }
            $all[$idx] = $normalized;
        }

        $result = save_blog_posts($all);
        if (! $result['ok']) {
            admin_set_flash($result['error'], 'error');
            if ($oldSlug !== '') {
                header('Location: ' . admin_url('post/' . rawurlencode($oldSlug)), true, 302);
            } else {
                header('Location: ' . admin_url('post/new'), true, 302);
            }
            exit;
        }

        admin_set_flash('Post saved.', 'success');
        header('Location: ' . admin_url('post/' . rawurlencode($newSlug)), true, 302);
        exit;
    }

    if ($rest === 'post/delete') {
        admin_session_start();
        if (! admin_is_logged_in()) {
            header('Location: ' . admin_url(''), true, 302);
            exit;
        }
        $token = $_POST['csrf_token'] ?? null;
        $token = is_string($token) ? $token : null;
        if (! admin_csrf_verify($token)) {
            admin_set_flash('Invalid session.', 'error');
            header('Location: ' . admin_url('blog'), true, 302);
            exit;
        }
        $delSlug = trim((string) ($_POST['slug'] ?? ''));
        if ($delSlug === '') {
            admin_set_flash('Missing post slug.', 'error');
            header('Location: ' . admin_url('blog'), true, 302);
            exit;
        }
        $all = blog_posts_list_remove_slug(load_blog_posts(), $delSlug);
        $result = save_blog_posts($all);
        if (! $result['ok']) {
            admin_set_flash($result['error'], 'error');
            header('Location: ' . admin_url('blog'), true, 302);
            exit;
        }
        admin_set_flash('Post deleted.', 'success');
        header('Location: ' . admin_url('blog'), true, 302);
        exit;
    }

    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

// ——— GET ———
if ($method !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method Not Allowed';
    exit;
}

if ($rest === '') {
    admin_session_start();
    if (admin_is_logged_in()) {
        header('Location: ' . admin_url('projects'), true, 302);
        exit;
    }
    $pageTitle = 'Log in';
    $withEditor = false;
    require __DIR__ . '/includes/admin/layout_header.php';
    $flash = admin_take_flash();
    ?>
        <div class="admin-panel">
            <h1 class="admin-panel__title">Log in</h1>
            <p class="admin-panel__hint">Enter the site admin password.</p>
            <?php if ($flash !== null): ?>
                <p class="admin-flash admin-flash--<?= e($flash['type'] === 'error' ? 'error' : 'info') ?>"><?= e($flash['message']) ?></p>
            <?php endif; ?>
            <form class="admin-form" method="post" action="<?= e(admin_url('login')) ?>">
                <input type="hidden" name="csrf_token" value="<?= e(admin_csrf_token()) ?>">
                <label>
                    Password
                    <input type="password" name="password" required autocomplete="current-password">
                </label>
                <div class="admin-form__actions">
                    <button type="submit" class="admin-btn admin-btn--primary">Log in</button>
                </div>
            </form>
        </div>
    <?php
    require __DIR__ . '/includes/admin/layout_footer.php';
    exit;
}

if ($rest === 'projects') {
    admin_require_login();
    $pageTitle = 'Projects';
    $withEditor = false;
    require __DIR__ . '/includes/admin/layout_header.php';
    $flash = admin_take_flash();
    $all = load_projects();
    ?>
        <?php if ($flash !== null): ?>
            <p class="admin-flash admin-flash--<?= e($flash['type'] === 'success' ? 'success' : ($flash['type'] === 'error' ? 'error' : 'info')) ?>"><?= e($flash['message']) ?></p>
        <?php endif; ?>
        <div class="admin-toolbar">
            <h1 class="admin-page-title" style="margin:0">Projects</h1>
            <a class="admin-btn admin-btn--primary" href="<?= e(admin_url('project/new')) ?>">New project</a>
        </div>
        <?php if (count($all) === 0): ?>
            <p class="admin-muted">No projects yet.</p>
        <?php else: ?>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Slug</th>
                            <th>Order</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($all as $p): ?>
                            <tr>
                                <td><?= e((string) ($p['title'] ?? '')) ?></td>
                                <td><code><?= e((string) ($p['slug'] ?? '')) ?></code></td>
                                <td><?= e((string) ($p['featured_order'] ?? '')) ?></td>
                                <td><a href="<?= e(admin_url('project/' . rawurlencode((string) ($p['slug'] ?? '')))) ?>">Edit</a></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    <?php
    require __DIR__ . '/includes/admin/layout_footer.php';
    exit;
}

if ($rest === 'blog') {
    admin_require_login();
    $pageTitle = 'Blog';
    $withEditor = false;
    require __DIR__ . '/includes/admin/layout_header.php';
    $flash = admin_take_flash();
    $all = load_blog_posts();
    ?>
        <?php if ($flash !== null): ?>
            <p class="admin-flash admin-flash--<?= e($flash['type'] === 'success' ? 'success' : ($flash['type'] === 'error' ? 'error' : 'info')) ?>"><?= e($flash['message']) ?></p>
        <?php endif; ?>
        <div class="admin-toolbar">
            <h1 class="admin-page-title" style="margin:0">Blog</h1>
            <a class="admin-btn admin-btn--primary" href="<?= e(admin_url('post/new')) ?>">New post</a>
        </div>
        <?php if (count($all) === 0): ?>
            <p class="admin-muted">No posts yet.</p>
        <?php else: ?>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Slug</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($all as $p): ?>
                            <tr>
                                <td><?= e((string) ($p['title'] ?? '')) ?></td>
                                <td><code><?= e((string) ($p['slug'] ?? '')) ?></code></td>
                                <td><?= e(! empty($p['published']) ? 'Published' : 'Draft') ?></td>
                                <td><?= e((string) ($p['published_at'] ?? '')) ?></td>
                                <td><a href="<?= e(admin_url('post/' . rawurlencode((string) ($p['slug'] ?? '')))) ?>">Edit</a></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    <?php
    require __DIR__ . '/includes/admin/layout_footer.php';
    exit;
}

if ($rest === 'project/new') {
    admin_require_login();
    $pageTitle = 'New project';
    $withEditor = true;
    $project = null;
    $oldSlug = '';
    require __DIR__ . '/includes/admin/project_form.php';
    exit;
}

if ($rest === 'post/new') {
    admin_require_login();
    $pageTitle = 'New post';
    $withEditor = true;
    $post = null;
    $oldSlug = '';
    require __DIR__ . '/includes/admin/blog_post_form.php';
    exit;
}

if (preg_match('#^project/(.+)$#', $rest, $m)) {
    admin_require_login();
    $slugKey = rawurldecode($m[1]);
    if ($slugKey === 'new' || $slugKey === 'save' || $slugKey === 'delete') {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not Found';
        exit;
    }
    $project = project_by_slug($slugKey);
    if ($project === null) {
        http_response_code(404);
        $pageTitle = 'Not found';
        $withEditor = false;
        require __DIR__ . '/includes/admin/layout_header.php';
        ?>
            <p class="admin-flash admin-flash--error">Project not found.</p>
            <p><a href="<?= e(admin_url('projects')) ?>">Back to projects</a></p>
        <?php
        require __DIR__ . '/includes/admin/layout_footer.php';
        exit;
    }
    $pageTitle = 'Edit: ' . (string) $project['title'];
    $withEditor = true;
    $oldSlug = (string) $project['slug'];
    require __DIR__ . '/includes/admin/project_form.php';
    exit;
}

if (preg_match('#^post/(.+)$#', $rest, $m)) {
    admin_require_login();
    $slugKey = rawurldecode($m[1]);
    if ($slugKey === 'new' || $slugKey === 'save' || $slugKey === 'delete') {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not Found';
        exit;
    }
    $post = blog_post_by_slug($slugKey);
    if ($post === null) {
        http_response_code(404);
        $pageTitle = 'Not found';
        $withEditor = false;
        require __DIR__ . '/includes/admin/layout_header.php';
        ?>
            <p class="admin-flash admin-flash--error">Post not found.</p>
            <p><a href="<?= e(admin_url('blog')) ?>">Back to blog</a></p>
        <?php
        require __DIR__ . '/includes/admin/layout_footer.php';
        exit;
    }
    $pageTitle = 'Edit: ' . (string) ($post['title'] ?? 'Post');
    $withEditor = true;
    $oldSlug = (string) ($post['slug'] ?? '');
    require __DIR__ . '/includes/admin/blog_post_form.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not Found';
exit;
