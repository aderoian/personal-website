<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/config.php';

if (PHP_SAPI !== 'cli' && str_ends_with(request_uri_path(), '/contact.php')) {
    header('Location: ' . url_contact(), true, 301);
    exit;
}

$pageTitle = 'Contact';
$currentNav = 'contact';

$email = trim(CONTACT_EMAIL);
$github = trim(CONTACT_GITHUB_URL);
$linkedin = trim(CONTACT_LINKEDIN_URL);
$hasLinks = $email !== '' || $github !== '' || $linkedin !== '';

$formTo = trim(CONTACT_FORM_TO_EMAIL);
$formEnabled = $formTo !== '' && filter_var($formTo, FILTER_VALIDATE_EMAIL) !== false;

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (! isset($_SESSION['csrf_contact']) || ! is_string($_SESSION['csrf_contact']) || $_SESSION['csrf_contact'] === '') {
    $_SESSION['csrf_contact'] = bin2hex(random_bytes(16));
}

$flash = $_SESSION['flash_contact'] ?? null;
unset($_SESSION['flash_contact']);

$sent = (isset($_GET['sent']) && $_GET['sent'] === '1');
$error = null;

$oldName = '';
$oldFrom = '';
$oldMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (! $formEnabled) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not Found';
        exit;
    }

    $postedToken = isset($_POST['csrf']) && is_string($_POST['csrf']) ? $_POST['csrf'] : '';
    if (! hash_equals($_SESSION['csrf_contact'], $postedToken)) {
        $error = 'Your session expired. Please try again.';
    } else {
        $honeypot = isset($_POST['website']) && is_string($_POST['website']) ? trim($_POST['website']) : '';
        if ($honeypot !== '') {
            $_SESSION['flash_contact'] = ['ok' => true];
            header('Location: ' . url_contact() . '?sent=1', true, 303);
            exit;
        }

        $now = time();
        $last = isset($_SESSION['contact_last_submit']) && is_int($_SESSION['contact_last_submit']) ? $_SESSION['contact_last_submit'] : 0;
        if ($last > 0 && ($now - $last) < 30) {
            $error = 'Please wait a moment before sending another message.';
        } else {
            $name = isset($_POST['name']) && is_string($_POST['name']) ? trim($_POST['name']) : '';
            $from = isset($_POST['email']) && is_string($_POST['email']) ? trim($_POST['email']) : '';
            $message = isset($_POST['message']) && is_string($_POST['message']) ? trim($_POST['message']) : '';

            $oldName = $name;
            $oldFrom = $from;
            $oldMessage = $message;

            if ($name === '' || strlen($name) > 120) {
                $error = 'Please enter your name.';
            } elseif ($from === '' || strlen($from) > 254 || filter_var($from, FILTER_VALIDATE_EMAIL) === false) {
                $error = 'Please enter a valid email address.';
            } elseif ($message === '' || strlen($message) > 8000) {
                $error = 'Please enter a message.';
            } else {
                $subjectPrefix = trim(CONTACT_FORM_SUBJECT_PREFIX);
                if ($subjectPrefix === '') {
                    $subjectPrefix = '[Website]';
                }
                $subject = $subjectPrefix . ' Contact from ' . $name;

                $body = "Name: {$name}\n";
                $body .= "Email: {$from}\n";
                $body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n";
                $body .= "User-Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? '') . "\n";
                $body .= "\n---\n\n";
                $body .= $message . "\n";

                $headers = [];
                $headers[] = 'MIME-Version: 1.0';
                $headers[] = 'Content-Type: text/plain; charset=UTF-8';
                $headers[] = 'Reply-To: ' . $from;

                $ok = @mail($formTo, $subject, $body, implode("\r\n", $headers));
                if ($ok) {
                    $_SESSION['contact_last_submit'] = $now;
                    $_SESSION['flash_contact'] = ['ok' => true];
                    header('Location: ' . url_contact() . '?sent=1', true, 303);
                    exit;
                }
                $error = 'Message could not be sent (server mail is not configured).';
            }
        }
    }
}

require __DIR__ . '/includes/header.php';
?>
        <header class="page-header">
            <h1 class="page-header__title">Contact</h1>
            <p class="page-header__lede">
                Questions about a project, collaboration, or something else? I’d be glad to hear from you.
            </p>
        </header>

        <div class="prose">
            <p>
                The fastest way to reach me is through the links below. If you’re writing about a specific project,
                mentioning its name in your message helps me respond with useful context.
            </p>
        </div>

        <?php if ($hasLinks): ?>
            <section class="contact-panel" aria-labelledby="contact-links-heading">
                <h2 id="contact-links-heading" class="contact-panel__title">Where to find me</h2>
                <ul class="contact-links">
                    <?php if ($email !== ''): ?>
                        <li class="contact-links__item">
                            <span class="contact-links__label">Email</span>
                            <a class="contact-links__value contact-links__value--with-icon" href="<?= e('mailto:' . $email) ?>">
                                <span class="icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 6h16v12H4z"></path>
                                        <path d="m4 7 8 6 8-6"></path>
                                    </svg>
                                </span>
                                <span><?= e($email) ?></span>
                            </a>
                        </li>
                    <?php endif; ?>
                    <?php if ($github !== ''): ?>
                        <li class="contact-links__item">
                            <span class="contact-links__label">GitHub</span>
                            <a class="contact-links__value contact-links__value--with-icon" href="<?= e($github) ?>" rel="noopener noreferrer" target="_blank">
                                <span class="icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                                        <path d="M12 .5C5.73.5.75 5.68.75 12.1c0 5.14 3.27 9.5 7.8 11.04.57.11.78-.25.78-.56v-2.02c-3.17.7-3.84-1.58-3.84-1.58-.52-1.37-1.27-1.73-1.27-1.73-1.04-.73.08-.72.08-.72 1.15.08 1.76 1.22 1.76 1.22 1.02 1.79 2.68 1.27 3.33.97.1-.76.4-1.27.72-1.56-2.53-.3-5.19-1.3-5.19-5.8 0-1.28.44-2.33 1.16-3.15-.12-.3-.5-1.52.11-3.17 0 0 .95-.31 3.11 1.2.9-.26 1.87-.39 2.83-.4.96.01 1.93.14 2.83.4 2.16-1.51 3.11-1.2 3.11-1.2.61 1.65.23 2.87.11 3.17.72.82 1.16 1.87 1.16 3.15 0 4.51-2.66 5.5-5.2 5.79.41.36.77 1.07.77 2.17v3.22c0 .31.2.67.79.56 4.52-1.55 7.78-5.9 7.78-11.04C23.25 5.68 18.27.5 12 .5z"></path>
                                    </svg>
                                </span>
                                <span><?= e($github) ?></span>
                            </a>
                        </li>
                    <?php endif; ?>
                    <?php if ($linkedin !== ''): ?>
                        <li class="contact-links__item">
                            <span class="contact-links__label">LinkedIn</span>
                            <a class="contact-links__value contact-links__value--with-icon" href="<?= e($linkedin) ?>" rel="noopener noreferrer" target="_blank">
                                <span class="icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                                        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.5 1c1.36 0 2.48 1.12 2.48 2.5zM.5 23.5h4V7.98h-4V23.5zM8 7.98h3.83v2.12h.05c.53-1 1.83-2.12 3.77-2.12 4.03 0 4.78 2.65 4.78 6.09v9.43h-4v-8.36c0-1.99-.03-4.55-2.77-4.55-2.77 0-3.19 2.16-3.19 4.4v8.5H8V7.98z"></path>
                                    </svg>
                                </span>
                                <span><?= e($linkedin) ?></span>
                            </a>
                        </li>
                    <?php endif; ?>
                </ul>
            </section>
        <?php else: ?>
            <p class="empty-state">No public contact links are configured yet.</p>
        <?php endif; ?>

        <section class="contact-panel" aria-labelledby="contact-form-heading">
            <h2 id="contact-form-heading" class="contact-panel__title">Contact me</h2>

            <?php if ($sent || (is_array($flash) && ($flash['ok'] ?? false) === true)): ?>
                <p class="form-note form-note--success">Thanks — your message was sent.</p>
            <?php elseif (is_string($error) && $error !== ''): ?>
                <p class="form-note form-note--error"><?= e($error) ?></p>
            <?php endif; ?>

            <?php if (! $formEnabled): ?>
                <p class="form-note">Email delivery isn’t configured yet.</p>
            <?php else: ?>
                <form class="contact-form" method="post" action="<?= e(url_contact()) ?>" novalidate>
                    <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf_contact']) ?>">

                    <div class="field">
                        <label class="field__label" for="contact-name">Name</label>
                        <input class="field__input" id="contact-name" name="name" type="text" autocomplete="name" required maxlength="120" value="<?= e($oldName) ?>">
                    </div>

                    <div class="field">
                        <label class="field__label" for="contact-email">Email</label>
                        <input class="field__input" id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" value="<?= e($oldFrom) ?>">
                    </div>

                    <div class="field">
                        <label class="field__label" for="contact-message">Message</label>
                        <textarea class="field__input field__input--textarea" id="contact-message" name="message" rows="6" required maxlength="8000"><?= e($oldMessage) ?></textarea>
                    </div>

                    <div class="field field--hp" aria-hidden="true">
                        <label class="field__label" for="contact-website">Website</label>
                        <input class="field__input" id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off">
                    </div>

                    <button class="button button--primary" type="submit">Send message</button>
                </form>
            <?php endif; ?>
        </section>
<?php
require __DIR__ . '/includes/footer.php';
