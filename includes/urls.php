<?php

declare(strict_types=1);

function url_prefix(): string
{
    $p = rtrim(BASE_PATH, '/');
    return $p === '' ? '' : $p;
}

function url_home(): string
{
    $p = url_prefix();
    return $p === '' ? '/' : $p . '/';
}

function url_projects(): string
{
    $p = url_prefix();
    return $p === '' ? '/projects' : $p . '/projects';
}

function url_project(string $slug): string
{
    $p = url_prefix();
    $s = rawurlencode($slug);
    return $p === '' ? '/project/' . $s : $p . '/project/' . $s;
}

/** Root-absolute path to a static asset (images, etc.) under the site. */
function url_asset(string $relativePath): string
{
    $relativePath = ltrim($relativePath, '/');
    $p = url_prefix();
    return $p === '' ? '/' . $relativePath : $p . '/' . $relativePath;
}

/** Request path relative to BASE_PATH (leading slash). Used by the dev router. */
function request_path(): string
{
    $raw = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($raw, PHP_URL_PATH);
    if (! is_string($path) || $path === '') {
        return '/';
    }
    $base = url_prefix();
    if ($base !== '' && str_starts_with($path, $base)) {
        $path = substr($path, strlen($base)) ?: '/';
    }
    if ($path === '' || $path[0] !== '/') {
        $path = '/' . ltrim($path, '/');
    }
    return $path === '' ? '/' : $path;
}

function request_uri_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    return is_string($path) && $path !== '' ? $path : '/';
}
