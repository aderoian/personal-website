<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

const ADMIN_SESSION_KEY = 'admin_ok';

function admin_password_hash_value(): ?string
{
    $env = getenv('ADMIN_PASSWORD_HASH');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    if (defined('ADMIN_PASSWORD_HASH') && is_string(ADMIN_PASSWORD_HASH) && ADMIN_PASSWORD_HASH !== '') {
        return ADMIN_PASSWORD_HASH;
    }
    return null;
}

function admin_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    $base = url_prefix();
    $cookiePath = $base === '' ? '/' : $base . '/';

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $cookiePath,
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

function admin_is_logged_in(): bool
{
    admin_session_start();
    return ! empty($_SESSION[ADMIN_SESSION_KEY]);
}

function admin_require_login(): void
{
    if (! admin_is_logged_in()) {
        header('Location: ' . admin_url(''), true, 302);
        exit;
    }
}

function admin_login(string $password): bool
{
    $hash = admin_password_hash_value();
    if ($hash === null) {
        return false;
    }
    if (! password_verify($password, $hash)) {
        return false;
    }
    admin_session_start();
    session_regenerate_id(true);
    $_SESSION[ADMIN_SESSION_KEY] = true;
    return true;
}

function admin_logout(): void
{
    admin_session_start();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function admin_csrf_token(): string
{
    admin_session_start();
    if (empty($_SESSION['csrf_token']) || ! is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function admin_csrf_verify(?string $token): bool
{
    admin_session_start();
    if ($token === null || $token === '') {
        return false;
    }
    $expected = $_SESSION['csrf_token'] ?? '';
    return is_string($expected) && hash_equals($expected, $token);
}

/**
 * Root-relative admin URL (respects BASE_PATH).
 */
function admin_url(string $path = ''): string
{
    $path = trim($path, '/');
    $p = url_prefix();
    $base = $p === '' ? '/admin' : $p . '/admin';
    return $path === '' ? $base : $base . '/' . $path;
}

function admin_set_flash(string $message, string $type = 'info'): void
{
    admin_session_start();
    $_SESSION['admin_flash'] = ['message' => $message, 'type' => $type];
}

/** @return array{message: string, type: string}|null */
function admin_take_flash(): ?array
{
    admin_session_start();
    $f = $_SESSION['admin_flash'] ?? null;
    unset($_SESSION['admin_flash']);
    if (! is_array($f) || ! isset($f['message'], $f['type'])) {
        return null;
    }
    return ['message' => (string) $f['message'], 'type' => (string) $f['type']];
}
