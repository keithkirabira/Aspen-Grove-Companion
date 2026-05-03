<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method Not Allowed');
}

function resolve_service_type_id(PDO $pdo, string $slug): int
{
    if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
        $slug = 'companionship';
    }
    $stmt = $pdo->prepare('SELECT id FROM service_types WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if ($row) {
        return (int) $row['id'];
    }
    $stmt->execute(['companionship']);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('service_types is empty; run database/seed.mysql.sql');
    }
    return (int) $row['id'];
}

$raw = strtolower((string) ($_POST['service'] ?? 'companionship'));
$slug = preg_match('/^[a-z0-9-]+$/', $raw) ? $raw : 'companionship';

try {
    $serviceTypeId = resolve_service_type_id($pdo, $slug);
} catch (Throwable $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<p>We could not save your request. Please try again or call us.</p>';
    exit;
}

$introRaw = agc_str($_POST['intro_date'] ?? null);
$introDate = null;
if ($introRaw !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $introRaw)) {
    $introDate = $introRaw;
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO care_requests (
            service_type_id, first_name, last_name, email, phone, country_region, address_line,
            city, postal_code, message, urgency, intro_date, intro_time, location_pref, expanded_evening
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $serviceTypeId,
        agc_str($_POST['first_name'] ?? '') ?? '',
        agc_str($_POST['last_name'] ?? '') ?? '',
        agc_str($_POST['email'] ?? '') ?? '',
        agc_str($_POST['phone'] ?? null),
        agc_str($_POST['country_region'] ?? null),
        agc_str($_POST['address_line'] ?? null),
        agc_str($_POST['city'] ?? null),
        agc_str($_POST['postal_code'] ?? null),
        agc_str($_POST['message'] ?? null),
        agc_str($_POST['urgency'] ?? null),
        $introDate,
        agc_str($_POST['intro_time'] ?? null),
        agc_str($_POST['location_pref'] ?? null),
        0,
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<p>We could not save your request. Please try again or call us.</p>';
    exit;
}

$locPref = agc_str($_POST['location_pref'] ?? null);
$locQs = $locPref && $locPref !== 'all' ? $locPref : null;

$params = ['service' => $slug];
if (!empty($_POST['intro_date'])) {
    $params['date'] = (string) $_POST['intro_date'];
}
if (!empty($_POST['intro_time'])) {
    $params['time'] = (string) $_POST['intro_time'];
}
if ($locQs !== null) {
    $params['location'] = $locQs;
}
$qs = http_build_query($params);

$target = '/thank-you.html' . ($qs !== '' ? '?' . $qs : '');
header('Location: ' . $target, true, 303);
exit;
