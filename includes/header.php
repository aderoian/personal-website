<?php

declare(strict_types=1);

/** @var string $pageTitle */
$pageTitle = $pageTitle ?? SITE_NAME;
$fullTitle = $pageTitle === SITE_NAME ? SITE_NAME : $pageTitle . ' · ' . SITE_NAME;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($fullTitle) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9,400;0,9,500;0,9,600;0,9,700;1,9,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= e(url_asset('css/styles.css')) ?>">
</head>
<body>
    <header class="site-header">
        <div class="site-header__inner">
            <a class="site-logo" href="<?= e(url_home()) ?>"><?= e(SITE_NAME) ?></a>
            <?php require __DIR__ . '/nav.php'; ?>
        </div>
    </header>
    <main class="main">
