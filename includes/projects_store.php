<?php

declare(strict_types=1);

require_once __DIR__ . '/projects.php';

function projects_json_path(): string
{
    return dirname(__DIR__) . '/data/projects.json';
}

/**
 * @param list<array<string, mixed>> $projects
 * @return array{ok: true}|array{ok: false, error: string}
 */
function save_projects(array $projects): array
{
    $normalized = [];
    $slugs = [];
    foreach ($projects as $i => $row) {
        if (! is_array($row)) {
            return ['ok' => false, 'error' => 'Invalid project row at index ' . $i . '.'];
        }
        $one = normalize_project_for_storage($row);
        if ($one === null) {
            return ['ok' => false, 'error' => 'Invalid project data at index ' . $i . '.'];
        }
        $slug = (string) $one['slug'];
        if (isset($slugs[$slug])) {
            return ['ok' => false, 'error' => 'Duplicate slug: ' . $slug];
        }
        $slugs[$slug] = true;
        $normalized[] = $one;
    }

    usort(
        $normalized,
        static fn (array $a, array $b): int => ($a['featured_order'] <=> $b['featured_order'])
            ?: strcmp((string) $a['slug'], (string) $b['slug'])
    );

    try {
        $json = json_encode(
            $normalized,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    } catch (JsonException) {
        return ['ok' => false, 'error' => 'Could not encode projects as JSON.'];
    }

    $path = projects_json_path();
    $dir = dirname($path);
    if (! is_dir($dir) || ! is_writable($dir)) {
        return ['ok' => false, 'error' => 'Data directory is not writable.'];
    }

    $tmp = $dir . '/.projects.' . bin2hex(random_bytes(8)) . '.tmp';
    if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        @unlink($tmp);
        return ['ok' => false, 'error' => 'Could not write projects file.'];
    }

    if (! rename($tmp, $path)) {
        @unlink($tmp);
        return ['ok' => false, 'error' => 'Could not replace projects file.'];
    }

    clear_projects_cache();
    return ['ok' => true];
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>|null
 */
function normalize_project_for_storage(array $row): ?array
{
    $slug = isset($row['slug']) && is_string($row['slug']) ? trim($row['slug']) : '';
    if ($slug === '' || ! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        return null;
    }

    $title = isset($row['title']) && is_string($row['title']) ? trim($row['title']) : '';
    if ($title === '') {
        return null;
    }

    $short = isset($row['short_description']) && is_string($row['short_description'])
        ? trim($row['short_description']) : '';
    if ($short === '') {
        return null;
    }

    $summary = isset($row['summary']) && is_string($row['summary']) ? trim($row['summary']) : '';
    if ($summary === '') {
        return null;
    }

    if (! isset($row['body']) || ! is_string($row['body'])) {
        return null;
    }
    $body = $row['body'];

    $image = isset($row['image']) && is_string($row['image']) ? trim($row['image']) : '';
    if ($image === '' || ! is_valid_project_image_path($image)) {
        return null;
    }

    $featured = $row['featured_order'] ?? null;
    if (! is_int($featured)) {
        return null;
    }

    $out = [
        'slug' => $slug,
        'title' => $title,
        'short_description' => $short,
        'summary' => $summary,
        'body' => $body,
        'image' => $image,
        'featured_order' => $featured,
    ];

    if (isset($row['year']) && is_int($row['year'])) {
        $out['year'] = $row['year'];
    }

    if (isset($row['tags']) && is_array($row['tags'])) {
        $tags = [];
        foreach ($row['tags'] as $t) {
            if (is_string($t)) {
                $t = trim($t);
                if ($t !== '') {
                    $tags[] = $t;
                }
            }
        }
        if (count($tags) > 0) {
            $out['tags'] = $tags;
        }
    }

    foreach (['repo_url', 'demo_url', 'demo_embed_src'] as $urlKey) {
        if (! isset($row[$urlKey])) {
            continue;
        }
        $u = $row[$urlKey];
        if (! is_string($u)) {
            continue;
        }
        $u = trim($u);
        if ($u === '') {
            continue;
        }
        if (filter_var($u, FILTER_VALIDATE_URL) === false) {
            return null;
        }
        $out[$urlKey] = $u;
    }

    return $out;
}

function is_valid_project_image_path(string $path): bool
{
    if (str_contains($path, '..') || str_contains($path, "\0")) {
        return false;
    }
    $path = ltrim($path, '/');
    if (! str_starts_with($path, 'assets/')) {
        return false;
    }
    return (bool) preg_match('#^assets/[a-zA-Z0-9._/-]+$#', $path);
}

/**
 * @param list<array<string, mixed>> $list
 * @return list<array<string, mixed>>
 */
function projects_list_remove_slug(array $list, string $slug): array
{
    $slug = trim($slug);
    $out = [];
    foreach ($list as $p) {
        if (! is_array($p) || (($p['slug'] ?? '') !== $slug)) {
            $out[] = $p;
        }
    }
    return array_values($out);
}
