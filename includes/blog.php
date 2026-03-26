<?php

declare(strict_types=1);

/** @var list<array<string, mixed>>|null */
$GLOBALS['blog_posts_cache'] = null;

function clear_blog_posts_cache(): void
{
    $GLOBALS['blog_posts_cache'] = null;
}

/**
 * @return list<array<string, mixed>>
 */
function load_blog_posts(): array
{
    if ($GLOBALS['blog_posts_cache'] !== null) {
        return $GLOBALS['blog_posts_cache'];
    }

    $path = dirname(__DIR__) . '/data/blog.json';
    if (! is_readable($path)) {
        $GLOBALS['blog_posts_cache'] = [];
        return $GLOBALS['blog_posts_cache'];
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        $GLOBALS['blog_posts_cache'] = [];
        return $GLOBALS['blog_posts_cache'];
    }

    $decoded = json_decode($raw, true);
    if (! is_array($decoded)) {
        $GLOBALS['blog_posts_cache'] = [];
        return $GLOBALS['blog_posts_cache'];
    }

    $required = ['slug', 'title', 'summary', 'body', 'published', 'published_at', 'updated_at'];
    $list = [];
    foreach ($decoded as $row) {
        if (! is_array($row)) {
            continue;
        }
        $ok = true;
        foreach ($required as $key) {
            if (! array_key_exists($key, $row)) {
                $ok = false;
                break;
            }
            if (in_array($key, ['published'], true)) {
                if (! is_bool($row[$key])) {
                    $ok = false;
                    break;
                }
                continue;
            }
            if (! is_string($row[$key])) {
                $ok = false;
                break;
            }
        }
        if (! $ok) {
            continue;
        }
        $list[] = $row;
    }

    usort(
        $list,
        static fn (array $a, array $b): int => strcmp((string) $b['published_at'], (string) $a['published_at'])
            ?: strcmp((string) $a['slug'], (string) $b['slug'])
    );

    $GLOBALS['blog_posts_cache'] = $list;
    return $GLOBALS['blog_posts_cache'];
}

/** Slug from rewrite query string, PATH_INFO, or some Apache redirect env vars. */
function blog_post_request_slug(): string
{
    if (isset($_GET['slug']) && is_string($_GET['slug']) && $_GET['slug'] !== '') {
        return trim(rawurldecode($_GET['slug']));
    }
    if (! empty($_SERVER['PATH_INFO']) && is_string($_SERVER['PATH_INFO'])) {
        return trim(rawurldecode(trim($_SERVER['PATH_INFO'], '/')), '/');
    }
    return '';
}

/**
 * @return array<string, mixed>|null
 */
function blog_post_by_slug(string $slug): ?array
{
    $slug = trim($slug);
    if ($slug === '') {
        return null;
    }
    foreach (load_blog_posts() as $p) {
        if (($p['slug'] ?? '') === $slug) {
            return $p;
        }
    }
    return null;
}

/**
 * @return list<array<string, mixed>>
 */
function published_blog_posts(): array
{
    $out = [];
    foreach (load_blog_posts() as $p) {
        if (! is_array($p)) {
            continue;
        }
        if (! empty($p['published'])) {
            $out[] = $p;
        }
    }
    return $out;
}

function blog_date_label(string $iso): string
{
    $iso = trim($iso);
    if ($iso === '') {
        return '';
    }
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $iso);
    if ($dt === false) {
        return $iso;
    }
    return $dt->format('M j, Y');
}

