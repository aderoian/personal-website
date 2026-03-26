<?php

declare(strict_types=1);

/**
 * Dev server: php -S localhost:8000 router.php
 * Serves clean URLs (/ , /projects , /blog , /contact , /project/{slug}) like Apache with .htaccess.
 */
require_once __DIR__ . '/includes/config.php';

$path = request_path();
if (str_contains($path, '..')) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    return true;
}

$path = rtrim($path, '/') ?: '/';

if ($path === '/') {
    require __DIR__ . '/index.php';
    return true;
}

if ($path === '/projects') {
    require __DIR__ . '/projects.php';
    return true;
}

if ($path === '/blog') {
    require __DIR__ . '/blog.php';
    return true;
}

if ($path === '/contact') {
    require __DIR__ . '/contact.php';
    return true;
}

if (str_starts_with($path, '/admin')) {
    require __DIR__ . '/admin.php';
    return true;
}

if (preg_match('#^/blog/([^/]+)$#', $path, $m)) {
    $_GET['slug'] = rawurldecode($m[1]);
    require __DIR__ . '/blog_post.php';
    return true;
}

if (preg_match('#^/project/([^/]+)$#', $path, $m)) {
    $_GET['slug'] = rawurldecode($m[1]);
    require __DIR__ . '/project.php';
    return true;
}

$static = __DIR__ . $path;
if (is_file($static)) {
    return false;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not Found';
return true;
