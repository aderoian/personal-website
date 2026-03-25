<?php

declare(strict_types=1);

/**
 * Makes /projects work with `php -S` (no .htaccess). Apache uses the root rewrite to projects.php instead.
 */
require_once dirname(__DIR__) . '/projects.php';
