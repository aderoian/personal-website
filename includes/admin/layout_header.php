<?php

declare(strict_types=1);

/** @var string $pageTitle */
$pageTitle = $pageTitle ?? 'Admin';
$fullTitle = $pageTitle === SITE_NAME ? $pageTitle : $pageTitle . ' · Admin · ' . SITE_NAME;
$withEditor = $withEditor ?? false;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($fullTitle) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9,400;0,9,500;0,9,600;0,9,700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= e(url_asset('css/styles.css')) ?>">
    <link rel="stylesheet" href="<?= e(url_asset('css/admin.css')) ?>">
    <?php if ($withEditor): ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
    <?php endif; ?>
</head>
<body class="admin-body">
    <header class="admin-header">
        <div class="admin-header__inner">
            <a class="admin-header__brand" href="<?= e(admin_url('')) ?>">Site admin</a>
            <?php if (admin_is_logged_in()): ?>
            <nav class="admin-nav" aria-label="Admin">
                <a class="admin-nav__link" href="<?= e(admin_url('projects')) ?>">Projects</a>
                <a class="admin-nav__link" href="<?= e(admin_url('blog')) ?>">Blog</a>
                <a class="admin-nav__link" href="<?= e(url_home()) ?>">View site</a>
                <form class="admin-nav__logout" method="post" action="<?= e(admin_url('logout')) ?>">
                    <input type="hidden" name="csrf_token" value="<?= e(admin_csrf_token()) ?>">
                    <button type="submit" class="admin-nav__logout-btn">Log out</button>
                </form>
            </nav>
            <?php endif; ?>
        </div>
    </header>
    <main class="admin-main">
