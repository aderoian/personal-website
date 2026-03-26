<?php

declare(strict_types=1);

const SITE_NAME = 'Armen Deroian';
const SITE_TAGLINE = 'Developer';
const TOP_PROJECTS_COUNT = 3;
const PROFILE_IMAGE = 'assets/profile.png';
/** No trailing slash; e.g. '' for site root or '/mysite' if deployed in a subdirectory. */
const BASE_PATH = '';

/** Public contact (/contact). Leave empty to hide a row. */
const CONTACT_EMAIL = 'armendero330@gmail.com';
const CONTACT_GITHUB_URL = 'https://github.com/aderoian';
const CONTACT_LINKEDIN_URL = 'https://www.linkedin.com/in/armenderoian/';

/**
 * Contact form (POST on /contact).
 * Keep CONTACT_FORM_TO_EMAIL in config.local.php if you want it private.
 */
if (is_file(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

if (! defined('CONTACT_FORM_TO_EMAIL')) {
    define('CONTACT_FORM_TO_EMAIL', '');
}
/** Used in the email subject line. */
if (! defined('CONTACT_FORM_SUBJECT_PREFIX')) {
    define('CONTACT_FORM_SUBJECT_PREFIX', '[Website]');
}
if (! defined('CONTACT_FORM_FROM_EMAIL')) {
    define('CONTACT_FORM_FROM_EMAIL', '');
}
if (! defined('CONTACT_SMTP_HOST')) {
    define('CONTACT_SMTP_HOST', '');
}
if (! defined('CONTACT_SMTP_PORT')) {
    define('CONTACT_SMTP_PORT', 587);
}
if (! defined('CONTACT_SMTP_USERNAME')) {
    define('CONTACT_SMTP_USERNAME', '');
}
if (! defined('CONTACT_SMTP_PASSWORD')) {
    define('CONTACT_SMTP_PASSWORD', '');
}
if (! defined('CONTACT_SMTP_ENCRYPTION')) {
    define('CONTACT_SMTP_ENCRYPTION', 'tls');
}

require_once __DIR__ . '/util.php';
require_once __DIR__ . '/markdown.php';
require_once __DIR__ . '/urls.php';
