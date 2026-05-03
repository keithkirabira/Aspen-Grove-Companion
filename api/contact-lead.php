<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method Not Allowed');
}

$caller = agc_str($_POST['caller_name'] ?? '') ?? 'Unknown';
$recipient = agc_str($_POST['care_recipient_name'] ?? '') ?? 'Unknown';
$city = agc_str($_POST['city_neighborhood'] ?? null);
$referral = agc_str($_POST['referral_source'] ?? null);
$msg = agc_str($_POST['message'] ?? null);

try {
    $stmt = $pdo->prepare(
        'INSERT INTO contact_leads (caller_name, care_recipient_name, city_neighborhood, referral_source, message)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$caller, $recipient, $city, $referral, $msg]);
} catch (Throwable $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<p>We could not save your message. Please try again or call us.</p>';
    exit;
}

header('Location: /thank-you.html?from=contact', true, 303);
exit;
