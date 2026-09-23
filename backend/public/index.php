<?php
declare(strict_types=1);

/**
 * Paila Nepal Holidays TravelCMS - API Gateway
 * Compatible with direct execution or via public_html/api/index.php
 */

$candidatePaths = [
    // 1. Direct parent if inside backend/public
    dirname(__DIR__),
    // 2. Outside webroot in /home/{user}/paila_api
    dirname(__DIR__, 2) . '/paila_api',
    dirname(__DIR__, 2) . '/paila_api/backend',
    // 3. Document root parent
    (isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) : '') . '/paila_api',
    (isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) : '') . '/paila_api/backend',
    // 4. In webroot or adjacent
    dirname(__DIR__) . '/paila_api',
    dirname(__DIR__) . '/backend',
    __DIR__ . '/backend',
    __DIR__ . '/..'
];

$baseBackendPath = null;
$checkedPaths = [];

foreach ($candidatePaths as $path) {
    if (empty($path)) continue;
    $cleanPath = rtrim(str_replace('\\', '/', $path), '/');
    $testFile = $cleanPath . '/config/Database.php';
    $checkedPaths[] = $cleanPath;
    if (file_exists($testFile)) {
        $baseBackendPath = $cleanPath;
        break;
    }
}

if ($baseBackendPath === null) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'API Core Unavailable',
        'message' => 'Backend files could not be located. Ensure backend files (including config/Database.php) are uploaded.',
        'diagnostics' => [
            'current_file' => __DIR__ . '/index.php',
            'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
            'paths_checked' => $checkedPaths
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Load .env if present
$envFile = $baseBackendPath . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }
            [$name, $value] = explode('=', $trimmed, 2) + ['', ''];
            $name = trim($name);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if ($name !== '' && getenv($name) === false) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}

require_once $baseBackendPath . '/config/Database.php';
require_once $baseBackendPath . '/middleware/SecurityHeaders.php';
require_once $baseBackendPath . '/middleware/AuthMiddleware.php';
require_once $baseBackendPath . '/controllers/BookingController.php';
require_once $baseBackendPath . '/controllers/VendorController.php';
require_once $baseBackendPath . '/controllers/PackageController.php';
require_once $baseBackendPath . '/controllers/UserController.php';
require_once $baseBackendPath . '/controllers/SettingsController.php';
require_once $baseBackendPath . '/controllers/AlertController.php';
require_once $baseBackendPath . '/controllers/ActivityController.php';
require_once $baseBackendPath . '/controllers/TourLeaderController.php';

use Paila\Middleware\SecurityHeaders;
use Paila\Controllers\BookingController;
use Paila\Controllers\VendorController;
use Paila\Controllers\PackageController;
use Paila\Controllers\UserController;
use Paila\Controllers\SettingsController;
use Paila\Controllers\AlertController;
use Paila\Controllers\ActivityController;
use Paila\Controllers\TourLeaderController;

// Apply OWASP Security Headers
SecurityHeaders::apply();

header('Content-Type: application/json; charset=utf-8');

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Extract relative API path regardless of cPanel subdirectory or rewrite structure
// Examples handled: /api/bookings, /paila_api/public/index.php/bookings, /paila_api/public/api/bookings, ?route=bookings
$path = $_SERVER['PATH_INFO'] ?? $_GET['route'] ?? null;
if (!$path) {
    $path = preg_replace('#^.*?(?:/api(?:/v1)?|/index\.php)#', '', $requestUri);
}
$path = '/' . trim((string)$path, '/');

try {
    // Route Dispatches
    if ($path === '/auth/login' && $method === 'POST') {
        (new UserController())->login();
    } elseif ($path === '/users' && $method === 'GET') {
        (new UserController())->index();
    } elseif ($path === '/users' && $method === 'POST') {
        (new UserController())->store();
    } elseif (preg_match('#^/users/(\d+)/password$#', $path, $m) && $method === 'POST') {
        (new UserController())->setPassword((int)$m[1]);
    } elseif (preg_match('#^/users/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'PATCH', 'POST'], true)) {
        (new UserController())->update((int)$m[1]);
    } elseif (preg_match('#^/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
        (new UserController())->delete((int)$m[1]);
    } elseif ($path === '/bookings' && $method === 'GET') {
        (new BookingController())->index();
    } elseif (preg_match('#^/bookings/(\d+)$#', $path, $m) && $method === 'GET') {
        (new BookingController())->show((int)$m[1]);
    } elseif ($path === '/bookings' && $method === 'POST') {
        (new BookingController())->store();
    } elseif (preg_match('#^/bookings/(\d+)/status$#', $path, $m) && in_array($method, ['PATCH', 'POST'], true)) {
        (new BookingController())->updateStatus((int)$m[1]);
    } elseif (preg_match('#^/bookings/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'PATCH', 'POST'], true)) {
        (new BookingController())->update((int)$m[1]);
    } elseif (preg_match('#^/bookings/(\d+)$#', $path, $m) && $method === 'DELETE') {
        (new BookingController())->delete((int)$m[1]);
    } elseif ($path === '/vendors' && $method === 'GET') {
        (new VendorController())->index();
    } elseif ($path === '/vendors' && $method === 'POST') {
        (new VendorController())->store();
    } elseif (preg_match('#^/vendors/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'PATCH', 'POST'], true)) {
        (new VendorController())->update((int)$m[1]);
    } elseif (preg_match('#^/vendors/(\d+)$#', $path, $m) && $method === 'DELETE') {
        (new VendorController())->delete((int)$m[1]);
    } elseif ($path === '/allocations' && $method === 'GET') {
        (new VendorController())->getAllocations();
    } elseif ($path === '/allocations' && $method === 'POST') {
        (new VendorController())->storeAllocation();
    } elseif (preg_match('#^/allocations/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'PATCH', 'POST'], true)) {
        (new VendorController())->updateAllocation((int)$m[1]);
    } elseif (preg_match('#^/allocations/(\d+)$#', $path, $m) && $method === 'DELETE') {
        (new VendorController())->deleteAllocation((int)$m[1]);
    } elseif ($path === '/vendor-payments' && $method === 'GET') {
        (new VendorController())->getPayments();
    } elseif ($path === '/vendor-payments' && $method === 'POST') {
        (new VendorController())->recordPayment();
    } elseif ($path === '/packages' && $method === 'GET') {
        (new PackageController())->index();
    } elseif ($path === '/packages' && $method === 'POST') {
        (new PackageController())->store();
    } elseif (preg_match('#^/packages/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'PATCH', 'POST'], true)) {
        (new PackageController())->update((int)$m[1]);
    } elseif (preg_match('#^/packages/(\d+)$#', $path, $m) && $method === 'DELETE') {
        (new PackageController())->delete((int)$m[1]);
    } elseif ($path === '/settings' && $method === 'GET') {
        (new SettingsController())->get();
    } elseif ($path === '/settings' && in_array($method, ['PUT', 'POST'], true)) {
        (new SettingsController())->update();
    } elseif ($path === '/alerts' && $method === 'GET') {
        (new AlertController())->index();
    } elseif ($path === '/alerts' && $method === 'POST') {
        (new AlertController())->store();
    } elseif (preg_match('#^/alerts/(\d+)/acknowledge$#', $path, $m) && in_array($method, ['POST', 'PATCH'], true)) {
        (new AlertController())->acknowledge((int)$m[1]);
    } elseif (preg_match('#^/alerts/(\d+)/resolve$#', $path, $m) && in_array($method, ['POST', 'PATCH'], true)) {
        (new AlertController())->resolve((int)$m[1]);
    } elseif ($path === '/activities' && $method === 'GET') {
        (new ActivityController())->index();
    } elseif ($path === '/activities' && $method === 'POST') {
        (new ActivityController())->store();
    } elseif ($path === '/tour-leader/active-tour' && $method === 'GET') {
        (new TourLeaderController())->getActiveTour();
    } elseif ($path === '/tour-leader/swap-vendor' && $method === 'POST') {
        (new TourLeaderController())->swapVendor();
    } elseif ($path === '/tour-leader/log-expense' && $method === 'POST') {
        (new TourLeaderController())->logExpense();
    } elseif ($path === '/tour-leader/update-status' && $method === 'POST') {
        (new TourLeaderController())->updateStatus();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found', 'path' => $path]);
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage()
    ]);
}
