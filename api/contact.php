<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method Not Allowed');
}

$fullName = agc_str($_POST['full_name'] ?? '') ?? 'Unknown';
$email = agc_str($_POST['email'] ?? '');
$phone = agc_str($_POST['phone'] ?? '');
$message = agc_str($_POST['message'] ?? '');
$parts = array_filter(
    [
        $email ? 'Email: ' . $email : null,
        $phone ? 'Phone: ' . $phone : null,
        $message ? "Message:\n" . $message : null,
    ],
    static function ($x) {
        return $x !== null;
    }
);
$composed = $parts !== [] ? implode("\n", $parts) : '(no message)';

try {
    $stmt = $pdo->prepare(
        'INSERT INTO contact_leads (caller_name, care_recipient_name, city_neighborhood, referral_source, message)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$fullName, 'Home page contact', null, null, $composed]);
} catch (Throwable $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<p>We could not save your message. Please try again or call us.</p>';
    exit;
}

header('Location: /thank-you.html?from=contact', true, 303);
exit;
