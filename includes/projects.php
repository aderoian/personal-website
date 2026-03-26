<?php

declare(strict_types=1);

/**
 * @return list<array<string, mixed>>
 */
function load_projects(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $path = dirname(__DIR__) . '/data/projects.json';
    if (! is_readable($path)) {
        $cache = [];
        return $cache;
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        $cache = [];
        return $cache;
    }

    $decoded = json_decode($raw, true);
    if (! is_array($decoded)) {
        $cache = [];
        return $cache;
    }

    $required = ['slug', 'title', 'short_description', 'summary', 'body', 'image', 'featured_order'];
    $list = [];
    foreach ($decoded as $row) {
        if (! is_array($row)) {
            continue;
        }
        $ok = true;
        foreach ($required as $key) {
            if (! isset($row[$key]) || (! is_string($row[$key]) && $key !== 'featured_order')) {
                $ok = false;
                break;
            }
            if ($key === 'featured_order' && ! is_int($row[$key])) {
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
        static fn (array $a, array $b): int => ($a['featured_order'] <=> $b['featured_order'])
            ?: strcmp($a['slug'], $b['slug'])
    );

    $cache = $list;
    return $cache;
}

/** Slug from rewrite query string, PATH_INFO, or some Apache redirect env vars. */
function project_request_slug(): string
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
 * @return array<string, array<string, mixed>>|null
 */
function project_by_slug(string $slug): ?array
{
    $slug = trim($slug);
    if ($slug === '') {
        return null;
    }
    foreach (load_projects() as $p) {
        if (($p['slug'] ?? '') === $slug) {
            return $p;
        }
    }
    return null;
}

/**
 * @return list<array<string, mixed>>
 */
function featured_projects(int $n): array
{
    if ($n <= 0) {
        return [];
    }
    return array_slice(load_projects(), 0, $n);
}

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
