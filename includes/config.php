<?php

declare(strict_types=1);

const SITE_NAME = 'Armen Deroian';
const SITE_TAGLINE = 'Developer';
const TOP_PROJECTS_COUNT = 3;
const PROFILE_IMAGE = 'assets/profile.png';
/** No trailing slash; e.g. '' for site root or '/mysite' if deployed in a subdirectory. */
const BASE_PATH = '';

if (is_file(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

require_once __DIR__ . '/util.php';
require_once __DIR__ . '/markdown.php';
require_once __DIR__ . '/urls.php';
