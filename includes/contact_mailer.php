<?php

declare(strict_types=1);

require_once __DIR__ . '/phpmailer/src/Exception.php';
require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * @param array{name: string, from: string, message: string, to: string, subject_prefix: string, remote_addr: string, user_agent: string} $payload
 * @return array{ok: bool, error: string}
 */
function send_contact_message(array $payload): array
{
    $subjectPrefix = trim($payload['subject_prefix']);
    if ($subjectPrefix === '') {
        $subjectPrefix = '[Website]';
    }

    $to = trim($payload['to']);
    $from = trim($payload['from']);
    $name = trim($payload['name']);
    $message = trim($payload['message']);
    $remoteAddr = trim($payload['remote_addr']);
    $userAgent = trim($payload['user_agent']);

    $body = "Name: {$name}\n";
    $body .= "Email: {$from}\n";
    $body .= "IP: {$remoteAddr}\n";
    $body .= "User-Agent: {$userAgent}\n";
    $body .= "\n---\n\n";
    $body .= $message . "\n";

    $mailer = new PHPMailer(true);
    try {
        $smtpHost = trim((string) CONTACT_SMTP_HOST);
        if ($smtpHost !== '') {
            $mailer->isSMTP();
            $mailer->Host = $smtpHost;
            $mailer->Port = (int) CONTACT_SMTP_PORT;
            $mailer->SMTPAuth = true;
            $mailer->Username = trim((string) CONTACT_SMTP_USERNAME);
            $mailer->Password = trim((string) CONTACT_SMTP_PASSWORD);

            $enc = strtolower(trim((string) CONTACT_SMTP_ENCRYPTION));
            if ($enc === 'ssl') {
                $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($enc === 'tls') {
                $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mailer->SMTPSecure = '';
            }
        } else {
            $mailer->isMail();
        }
        $mailer->CharSet = 'UTF-8';

        $configuredFrom = trim((string) CONTACT_FORM_FROM_EMAIL);
        if ($configuredFrom !== '' && filter_var($configuredFrom, FILTER_VALIDATE_EMAIL) !== false) {
            $fromAddress = $configuredFrom;
        } else {
            $toDomain = strrchr($to, '@');
            if ($toDomain !== false) {
                $toDomain = ltrim($toDomain, '@');
            }
            $fromAddress = is_string($toDomain) && $toDomain !== '' ? 'no-reply@' . $toDomain : 'no-reply@localhost.localdomain';
        }

        $mailer->setFrom($fromAddress, SITE_NAME);
        $mailer->addAddress($to, SITE_NAME);
        $mailer->addReplyTo($from, $name);

        $mailer->Subject = $subjectPrefix . ' Contact from ' . $name;
        $mailer->Body = $body;
        $mailer->AltBody = $body;

        $ok = $mailer->send();
        return ['ok' => $ok, 'error' => ''];
    } catch (Exception $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}
