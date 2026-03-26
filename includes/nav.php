<?php

declare(strict_types=1);

/** @var string $currentNav */
$currentNav = $currentNav ?? '';

function nav_link(string $href, string $label, string $id, string $currentNav): string
{
    $class = $id === $currentNav ? 'nav__link nav__link--active' : 'nav__link';
    return sprintf(
        '<a class="%s" href="%s">%s</a>',
        e($class),
        e($href),
        e($label)
    );
}
?>
<nav class="nav" aria-label="Primary">
    <button type="button" class="nav__toggle" aria-expanded="false" aria-controls="nav-menu" id="nav-toggle">
        <span class="nav__toggle-bar" aria-hidden="true"></span>
        <span class="nav__toggle-bar" aria-hidden="true"></span>
        <span class="nav__toggle-bar" aria-hidden="true"></span>
        <span class="visually-hidden">Menu</span>
    </button>
    <div class="nav__menu" id="nav-menu">
        <?= nav_link(url_home(), 'Home', 'home', $currentNav) ?>
        <?= nav_link(url_projects(), 'Projects', 'projects', $currentNav) ?>
        <?= nav_link(url_blog(), 'Blog', 'blog', $currentNav) ?>
        <?= nav_link(url_contact(), 'Contact', 'contact', $currentNav) ?>
    </div>
</nav>
