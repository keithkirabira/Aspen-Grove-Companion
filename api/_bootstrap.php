<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

$configFile = __DIR__ . '/config.local.php';
if (!is_readable($configFile)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Database not configured. Copy api/config.sample.php to api/config.local.php and edit credentials.';
    exit;
}

/** @var array{dsn:string,user:string,pass:string} $cfg */
$cfg = require $configFile;

try {
    $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Could not connect to the database.';
    exit;
}

function agc_str(?string $v): ?string
{
    if ($v === null) {
        return null;
    }
    $s = trim($v);
    return $s === '' ? null : $s;
}
