<?php

declare(strict_types=1);

require_once __DIR__ . '/blog.php';

function blog_posts_json_path(): string
{
    return dirname(__DIR__) . '/data/blog.json';
}

/**
 * @param list<array<string, mixed>> $posts
 * @return array{ok: true}|array{ok: false, error: string}
 */
function save_blog_posts(array $posts): array
{
    $normalized = [];
    $slugs = [];
    foreach ($posts as $i => $row) {
        if (! is_array($row)) {
            return ['ok' => false, 'error' => 'Invalid post row at index ' . $i . '.'];
        }
        $one = normalize_blog_post_for_storage($row);
        if ($one === null) {
            return ['ok' => false, 'error' => 'Invalid post data at index ' . $i . '.'];
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
        static fn (array $a, array $b): int => strcmp((string) $b['published_at'], (string) $a['published_at'])
            ?: strcmp((string) $a['slug'], (string) $b['slug'])
    );

    try {
        $json = json_encode(
            $normalized,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    } catch (JsonException) {
        return ['ok' => false, 'error' => 'Could not encode posts as JSON.'];
    }

    $path = blog_posts_json_path();
    $dir = dirname($path);
    if (! is_dir($dir) || ! is_writable($dir)) {
        return ['ok' => false, 'error' => 'Data directory is not writable.'];
    }

    $tmp = $dir . '/.blog.' . bin2hex(random_bytes(8)) . '.tmp';
    if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        @unlink($tmp);
        return ['ok' => false, 'error' => 'Could not write blog file.'];
    }

    if (! rename($tmp, $path)) {
        @unlink($tmp);
        return ['ok' => false, 'error' => 'Could not replace blog file.'];
    }

    clear_blog_posts_cache();
    return ['ok' => true];
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>|null
 */
function normalize_blog_post_for_storage(array $row): ?array
{
    $slug = isset($row['slug']) && is_string($row['slug']) ? trim($row['slug']) : '';
    if ($slug === '' || ! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        return null;
    }

    $title = isset($row['title']) && is_string($row['title']) ? trim($row['title']) : '';
    if ($title === '') {
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

    $published = $row['published'] ?? null;
    if (! is_bool($published)) {
        return null;
    }

    $publishedAt = isset($row['published_at']) && is_string($row['published_at']) ? trim($row['published_at']) : '';
    if ($publishedAt === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $publishedAt)) {
        return null;
    }

    $updatedAt = isset($row['updated_at']) && is_string($row['updated_at']) ? trim($row['updated_at']) : '';
    if ($updatedAt === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $updatedAt)) {
        return null;
    }

    $out = [
        'slug' => $slug,
        'title' => $title,
        'summary' => $summary,
        'body' => $body,
        'published' => $published,
        'published_at' => $publishedAt,
        'updated_at' => $updatedAt,
    ];

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

    return $out;
}

/**
 * @param list<array<string, mixed>> $list
 * @return list<array<string, mixed>>
 */
function blog_posts_list_remove_slug(array $list, string $slug): array
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

