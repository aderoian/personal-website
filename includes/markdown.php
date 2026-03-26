<?php

declare(strict_types=1);

require_once __DIR__ . '/Parsedown.php';

function render_markdown(string $markdown): string
{
    $markdown = trim($markdown);
    if ($markdown === '') {
        return '';
    }

    $p = new Parsedown();
    // Parsedown's "safe mode" is not enabled, so inline HTML is allowed.
    return $p->text($markdown);
}

