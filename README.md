# Paila Nepal Holidays TravelCMS — Shared cPanel Deployment Guide

This document is an exhaustive, production-grade guide for deploying the **Paila Nepal Holidays TravelCMS** (React 19 SPA frontend + Object-Oriented PHP 8.2+ REST API + MySQL 8.0+ / MariaDB ACID database) onto a **standard shared cPanel hosting environment**.

This guide assumes **zero developer tools on the server** (no SSH access, no root terminal, no server-side Node.js or npm). All builds are performed on your local development machine, and deployment is accomplished securely via the **cPanel Web File Manager** (or SFTP) and **phpMyAdmin**.

---

## Architecture Overview & Security Perimeter

On shared hosting, the web server's document root (typically `/home/{username}/public_html`) is publicly accessible to any HTTP request. Placing raw application source code, `.env` files, or database credentials directly into `public_html` poses severe security risks.

To achieve enterprise-grade security on shared infrastructure, we enforce **strict directory separation**:

```
/home/{username}/                                  <-- Isolated home directory (NOT web accessible)
├── paila_api/                                     <-- SECURED BACKEND CORE
│   ├── .env                                       <-- Confidential DB credentials & JWT secret (chmod 0600)
│   ├── config/
│   │   └── Database.php                           <-- PDO connection pool & transaction manager
│   ├── controllers/
│   │   ├── BookingController.php
│   │   ├── PackageController.php
│   │   ├── SettingsController.php
│   │   ├── UserController.php
│   │   └── VendorController.php
│   └── middleware/
│       ├── AuthMiddleware.php
│       └── SecurityHeaders.php
│
└── public_html/                                   <-- WEB ACCESSIBLE DOCUMENT ROOT
    ├── .htaccess                                  <-- SPA HTML5 routing & HTTPS enforcement
    ├── index.html                                 <-- Built React SPA entry point
    ├── favicon.ico
    ├── assets/                                    <-- Built JS, CSS, and media bundles
    │   ├── index-*.js
    │   └── index-*.css
    └── api/                                       <-- PUBLIC API BRIDGE
        ├── .htaccess                              <-- API rewrite to index.php
        └── index.php                              <-- Micro-router bridging into /home/{username}/paila_api/
```

### Key Security Benefits
1. **Zero Credential Exposure**: The database credentials in `/home/{username}/paila_api/.env` and `config/Database.php` cannot be downloaded over the web even if the PHP engine temporarily fails or is misconfigured.
2. **Path Traversal & Direct File Access Defense**: Only `public_html/api/index.php` is exposed as the API gateway. Direct execution of arbitrary PHP scripts is prevented.
3. **OWASP Hardening**: All HTTP responses include Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and Strict-Transport-Security (HSTS).

---

## Prerequisites & Requirements

### Local Environment
- **Node.js**: v18.0.0 or higher
- **npm** (or bun / yarn)
- Local Git repository copy of `paila_travelcms`

### cPanel Shared Host Specifications
- **PHP Version**: 8.2 or 8.3 (select via cPanel **MultiPHP Manager** or **Select PHP Version**)
- **Required PHP Extensions**:
  - `pdo_mysql` (or `nd_pdo_mysql`)
  - `mbstring`
  - `json`
  - `openssl`
  - `curl`
- **Apache Modules** (enabled by default on virtually all cPanel hosts):
  - `mod_rewrite`
  - `mod_headers`
- **Database**: MySQL 8.0+ or MariaDB 10.5+ with phpMyAdmin access
- **SSL Certificate**: Active Let's Encrypt / AutoSSL certificate installed on your domain

---

## Phase 1: Production Build & Packaging (`dist` Generation)

### 1.1 How to Generate the `dist` Folder

You generate the production-ready **`dist/`** folder using standard npm commands:

```bash
# 1. Install all dependencies from package.json
npm install

# Note: If npm shows an ERESOLVE peer dependency error with older lockfiles, run:
# npm install --legacy-peer-deps

# 2. Check for syntax or type issues
npm run lint

# 3. Compile TypeScript & bundle production assets into the /dist folder
npm run build
```

#### Where to Run `npm install` & `npm run build`:
- **Local Machine (Standard & Recommended)**: Run these commands in your local computer's terminal. Vite will compile all React TSX components, Tailwind styles, and icons into optimized, minified static files located in `dist/`. You then upload the contents of this `dist` folder to your cPanel.
- **cPanel Terminal (If Supported by Host)**: Most standard shared hosting accounts do *not* have Node.js / npm installed in the server terminal or have terminal access disabled. However, if your hosting plan includes **Terminal Access with Node.js/npm** or the **"Setup Node.js App"** feature in cPanel, you can upload the full source code and run `npm install && npm run build` directly on the server to generate `dist/`.

#### What is Generated in the `dist/` Folder:
```
dist/
├── index.html          <-- Compiled single-page application entry point
├── favicon.ico         <-- App favicon
└── assets/
    ├── index-*.js      <-- Minified, code-split JavaScript bundle
    └── index-*.css     <-- Compiled Tailwind CSS stylesheet
```

> **Important**: When deploying to cPanel `public_html`, upload the **contents inside `dist/`** (i.e. `index.html`, `assets/`, etc.), **NOT** the parent folder named `dist`.

### 1.2 Verify Client Environment Configuration
Open your local terminal in the project root and ensure any required build-time variables are configured. For this application, all API requests default to the same-origin relative path `/api` (or `/api/v1`), meaning no external hardcoded URLs are required.

### 1.3 Prepare the Upload Packages
Create two clean ZIP archives to upload through cPanel:

#### Package A: Frontend Bundle (`frontend_build.zip`)
Compress the contents of the `dist/` folder:
- On Linux/macOS:
  ```bash
  cd dist && zip -r ../frontend_build.zip ./* && cd ..
  ```
- On Windows (PowerShell):
  ```powershell
  Compress-Archive -Path dist\* -DestinationPath frontend_build.zip -Force
  ```

#### Package B: Backend Core (`backend_core.zip`)
Compress the backend business logic (excluding the `backend/public/` folder, which will be placed in `public_html/api/`):
- On Linux/macOS:
  ```bash
  zip -r backend_core.zip backend/config backend/controllers backend/middleware
  ```
- On Windows (PowerShell):
  ```powershell
  Compress-Archive -Path backend\config, backend\controllers, backend\middleware -DestinationPath backend_core.zip -Force
  ```

---

## Phase 2: Database Provisioning & Migration

### 2.1 Create MySQL Database & User in cPanel
1. Log in to your cPanel dashboard.
2. Under the **Databases** section, click **MySQL® Database Wizard** (or **MySQL® Databases**).
3. **Step 1 - Create Database**:
   - Name: `paila_travelcms`
   - *Note: cPanel will prepend your account username, e.g., `cpaneluser_paila_travelcms`.*
4. **Step 2 - Create Database User**:
   - Username: `paila_dbuser` (full name will be `cpaneluser_paila_dbuser`)
   - Generate a strong password (minimum 20 characters with symbols, e.g., `P@ila#2026_SecureDb!Key`). Save this password securely.
5. **Step 3 - Add User to Database**:
   - Check **ALL PRIVILEGES** (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, etc.).
   - Click **Make Changes**.

### 2.2 Import the Production Schema (`paila_travelcms_production.sql`)
1. In cPanel, navigate to **phpMyAdmin** under the Databases section.
2. In the left sidebar, click your newly created database (e.g., `cpaneluser_paila_travelcms`).
3. Click the **Import** tab on the top navigation bar.
4. Under **File to import**, click **Choose File** and select `paila_travelcms_production.sql` from your local project repository.
5. Ensure:
   - **Character set of the file**: `utf-8`
   - **SQL compatibility mode**: `NONE`
6. Scroll down and click **Import** (or **Go**).
7. phpMyAdmin will execute the script, creating:
   - Core tables: `users`, `packages`, `itinerary_days`, `bookings`, `booking_status_history`, `vendors`, `operation_allocations`, `vendor_payments`, `company_settings`, `alerts`, `activity_logs`.
   - Seed data with default Administrator, Tour Leader, Sales Officer, packages, and vendors.

---

## Phase 3: Server Directory Setup & File Uploads

### 3.1 Deploy Backend Core (Outside `public_html`)
1. In cPanel, open **File Manager**.
2. Click **Settings** (top right) and ensure **Show Hidden Files (dotfiles)** is checked.
3. Make sure you are in your account root (`/home/{username}/`).
4. Click **+ Folder** and create a directory named `paila_api`.
5. Enter the `paila_api` folder:
   - Click **Upload** and upload `backend_core.zip`.
   - Select `backend_core.zip` and click **Extract**. Extract files directly into `/home/{username}/paila_api/`.
   - Delete `backend_core.zip` after extraction.
   - Verify that `config/`, `controllers/`, and `middleware/` are now inside `/home/{username}/paila_api/`.

### 3.2 Create the Secure Backend Environment File (`.env`)
1. Inside `/home/{username}/paila_api/`, click **+ File** and name it `.env`.
2. Right-click `.env` and select **Edit**.
3. Paste the following configuration, replacing values with your actual cPanel database credentials:

```ini
# =====================================================================
# Paila Nepal Holidays TravelCMS - Backend Environment
# Stored securely outside public_html: /home/{username}/paila_api/.env
# =====================================================================

APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database Connection (ACID MySQL/MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpaneluser_paila_travelcms
DB_USERNAME=cpaneluser_paila_dbuser
DB_PASSWORD=YourSecurePasswordGeneratedInStep2
DB_CHARSET=utf8mb4

# Authentication & Security Secrets
JWT_SECRET=generate_a_random_64_character_hex_secret_here_for_token_signing
JWT_EXPIRATION=86400

# Nepal Time Zone (+05:45)
TIMEZONE=Asia/Kathmandu
```
4. Save changes.
5. In File Manager, right-click `.env`, select **Change Permissions**, and set it to **0600** (Read/Write for User only, no access for Group or World).

---

## Phase 4: Deploy Frontend & Public API Gateway

### 4.1 Deploy Frontend SPA Assets to `public_html`
1. Navigate to `/home/{username}/public_html/` in cPanel File Manager.
2. If there is a default placeholder `index.html` or `default.html`, delete or backup it.
3. Click **Upload** and upload `frontend_build.zip`.
4. Select `frontend_build.zip` and click **Extract** into `/home/{username}/public_html/`.
5. Delete `frontend_build.zip`.
6. Ensure that `index.html`, `assets/`, and `favicon.ico` reside directly in `public_html`.

### 4.2 Deploy the Public API Gateway
1. Inside `public_html`, click **+ Folder** and create a directory named `api`.
2. Enter `/home/{username}/public_html/api/`.
3. Create a new file named `index.php`.
4. Right-click `index.php` and click **Edit**. Paste the following secure bridge router:

```php
<?php
declare(strict_types=1);

/**
 * Paila Nepal Holidays TravelCMS - Smart API Gateway Bridge
 * Location: public_html/api/index.php
 * 
 * Auto-locates the backend core either outside public_html (recommended for security)
 * or inside the hosting directory structure.
 */

// Candidate directories where backend core (controllers, config, middleware) might reside
$candidatePaths = [
    // 1. Outside webroot in /home/{user}/paila_api (Recommended)
    dirname(__DIR__, 2) . '/paila_api',
    dirname(__DIR__, 2) . '/paila_api/backend',
    
    // 2. Based on document root parent
    (isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) : '') . '/paila_api',
    (isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) : '') . '/paila_api/backend',
    
    // 3. Current user home directory detection
    preg_replace('#^(/(?:home\d?|var/www)/[^/]+).*$#', '$1', __DIR__) . '/paila_api',
    preg_replace('#^(/(?:home\d?|var/www)/[^/]+).*$#', '$1', __DIR__) . '/paila_api/backend',

    // 4. Same directory level as public_html or inside public_html
    dirname(__DIR__) . '/paila_api',
    dirname(__DIR__) . '/backend',
    dirname(__DIR__) . '/paila_api/backend',
    
    // 5. Direct parent / adjacent (fallback)
    __DIR__ . '/backend',
    __DIR__ . '/../backend',
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
            'paths_checked' => $checkedPaths,
            'fix_action' => 'Upload or move the backend files so that config/Database.php exists in one of the checked paths above, such as: ' . (dirname(__DIR__, 2) . '/paila_api/config/Database.php')
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Load Environment variables from .env if available
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

// Require Core Backend Modules
require_once $baseBackendPath . '/config/Database.php';
require_once $baseBackendPath . '/middleware/SecurityHeaders.php';
require_once $baseBackendPath . '/middleware/AuthMiddleware.php';
require_once $baseBackendPath . '/controllers/BookingController.php';
require_once $baseBackendPath . '/controllers/VendorController.php';
require_once $baseBackendPath . '/controllers/PackageController.php';
require_once $baseBackendPath . '/controllers/UserController.php';
require_once $baseBackendPath . '/controllers/SettingsController.php';

use Paila\Middleware\SecurityHeaders;
use Paila\Controllers\BookingController;
use Paila\Controllers\VendorController;
use Paila\Controllers\PackageController;
use Paila\Controllers\UserController;
use Paila\Controllers\SettingsController;

// Enforce OWASP security headers
SecurityHeaders::apply();

header('Content-Type: application/json; charset=utf-8');

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle CORS Pre-Flight early
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Normalize URI prefix (strip /api or /api/v1)
$path = preg_replace('#^/api(/v1)?#', '', $requestUri);
$path = '/' . trim($path, '/');

try {
    // Route Dispatches
    if ($path === '/auth/login' && $method === 'POST') {
        (new UserController())->login();
    } elseif ($path === '/users' && $method === 'GET') {
        (new UserController())->index();
    } elseif ($path === '/bookings' && $method === 'GET') {
        (new BookingController())->index();
    } elseif (preg_match('#^/bookings/(\d+)$#', $path, $m) && $method === 'GET') {
        (new BookingController())->show((int)$m[1]);
    } elseif ($path === '/bookings' && $method === 'POST') {
        (new BookingController())->store();
    } elseif (preg_match('#^/bookings/(\d+)/status$#', $path, $m) && in_array($method, ['PATCH', 'POST'], true)) {
        (new BookingController())->updateStatus((int)$m[1]);
    } elseif ($path === '/vendors' && $method === 'GET') {
        (new VendorController())->index();
    } elseif ($path === '/allocations' && $method === 'GET') {
        (new VendorController())->getAllocations();
    } elseif ($path === '/vendor-payments' && $method === 'POST') {
        (new VendorController())->recordPayment();
    } elseif ($path === '/packages' && $method === 'GET') {
        (new PackageController())->index();
    } elseif ($path === '/packages' && $method === 'POST') {
        (new PackageController())->store();
    } elseif ($path === '/settings' && $method === 'GET') {
        (new SettingsController())->get();
    } elseif ($path === '/settings' && in_array($method, ['PUT', 'POST'], true)) {
        (new SettingsController())->update();
    } else {
        http_response_code(404);
        echo json_encode([
            'error' => 'Endpoint Not Found',
            'requested_path' => $path,
            'method' => $method
        ]);
    }
} catch (\Throwable $e) {
    error_log("API Error [{$method} {$path}]: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => (getenv('APP_DEBUG') === 'true') ? $e->getMessage() : 'An unexpected server error occurred.'
    ]);
}
```

5. In `/home/{username}/public_html/api/`, create a new file named `.htaccess` with the following rules:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /api/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L,QSA]
</IfModule>

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

---

## Phase 5: Root `.htaccess` Configuration (HTML5 History Mode & HTTPS)

To allow React Router (SPA) to function properly on page refreshes and direct URL navigation (e.g., navigating directly to `/bookings`, `/vendors`, `/portal`, or `/settings`), configure the primary `.htaccess` in `/home/{username}/public_html/`.

1. In cPanel File Manager, edit `/home/{username}/public_html/.htaccess`.
2. Paste the following configuration:

```apache
# =====================================================================
# Paila Nepal Holidays TravelCMS - Web Server Configuration
# Location: /home/{username}/public_html/.htaccess
# =====================================================================

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 1. Force HTTPS for all traffic
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # 2. Never rewrite /api requests to React SPA
    RewriteRule ^api/ - [L]

    # 3. Serve actual files or directories if they exist
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # 4. Fallback everything else to React index.html for SPA client-side routing
    RewriteRule ^ index.html [L]
</IfModule>

# Prevent directory indexing
Options -Indexes

# Security Headers for Frontend Delivery
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Browser Caching Optimizations for Static Bundles
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 0 seconds"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Gzip / Brotli Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json image/svg+xml
</IfModule>
```

---

## Phase 6: Post-Deployment Verification Checklist

Follow this systematic checklist to ensure 100% operational readiness:

### 1. Database Connectivity & API Health
Test the API gateway by opening your browser or running curl:
```bash
curl -i https://yourdomain.com/api/settings
```
- **Expected Result**: HTTP `200 OK` with JSON company settings data (`"companyName": "Paila Nepal Holidays Pvt. Ltd."`).
- **If HTTP 500 occurs**: Inspect `/home/{username}/paila_api/.env` and verify database username, password, and database name. Check cPanel **Errors** log.

### 2. Authentication Test
Test authentication with default seed credentials:
- **Email**: `admin@pailanepal.com`
- **Password**: `admin123`
- **Action**: Log in through `https://yourdomain.com/login`.
- **Expected Result**: Successfully redirects to the Master Dashboard, populating live counts for Bookings, Outstanding AP, and Active Tours.

### 3. SPA Route Navigation (Deep Link Test)
1. Directly navigate in your browser address bar to:
   `https://yourdomain.com/bookings`
2. Press **F5 (Reload)**.
   - **Pass**: The page loads cleanly into the Bookings management view.
   - **Fail (404 Not Found)**: The root `/home/{username}/public_html/.htaccess` rewrite rule is missing or `mod_rewrite` is disabled.

### 4. Direct `.env` Access Protection Test
Attempt to access the environment file directly in your browser:
```
https://yourdomain.com/api/.env
https://yourdomain.com/.env
```
- **Expected Result**: HTTP `403 Forbidden` or `404 Not Found`. Neither the file nor its contents should ever be served.

### 5. Tour Leader Field Portal Test
1. Log in with Tour Leader credentials:
   - **Email**: `guide@pailanepal.com`
   - **Password**: `leader123`
2. Navigate to `/portal`.
3. Verify that assigned active tours, vendor contact cards, and day itineraries render from the database.

---

## Troubleshooting & Common cPanel Pitfalls

| Issue / Symptom | Probable Cause | Corrective Resolution |
| :--- | :--- | :--- |
| **API returns `500 Internal Server Error`** | Incorrect DB credentials or missing `pdo_mysql` extension. | 1. Check `/home/{user}/paila_api/.env`.<br>2. In cPanel, go to **Select PHP Version** -> **Extensions** -> verify `pdo_mysql` and `mbstring` are enabled.<br>3. Check cPanel **Errors** log. |
| **Refreshing any subpage returns `404 Not Found`** | Missing or incorrect root `.htaccess` file. | Verify that `/home/{user}/public_html/.htaccess` contains the fallback rule `RewriteRule ^ index.html [L]`. Ensure **Show Hidden Files** is checked in cPanel File Manager. |
| **Changes to `.env` not taking effect** | FastCGI or OPcache caching PHP environment values. | In cPanel **MultiPHP Manager**, switch PHP version momentarily or restart PHP processes to clear OPcache. |
| **Database error: `Access denied for user`** | cPanel prepends the hosting account username to the DB and DB user. | Ensure your `.env` specifies the full prefix (e.g., `DB_DATABASE=cpaneluser_paila_travelcms`, not just `paila_travelcms`). |
| **Mixed Content Warning or SSL Error** | Domain accessed over HTTP instead of HTTPS. | Verify that Let's Encrypt / AutoSSL is active in cPanel under **SSL/TLS Status**, and verify the HTTPS rewrite rule in `.htaccess`. |

---

## Maintenance & Backup Procedures

### Automated Database Backups via cPanel Cron
You can automate nightly SQL backups without shell access:
1. In cPanel, navigate to **Cron Jobs**.
2. Add a new cron job running once daily at midnight (`0 0 * * *`).
3. Command:
   ```bash
   mysqldump -u cpaneluser_paila_dbuser -p'YourPassword' cpaneluser_paila_travelcms | gzip > /home/cpaneluser/db_backups/backup_$(date +\%Y\%m\%d).sql.gz
   ```
4. Ensure the `/home/cpaneluser/db_backups/` directory exists outside `public_html`.

### Manual Backup from Within TravelCMS
Administrators can also navigate to **Settings -> System Backups** inside the TravelCMS UI to download:
- **Instant JSON Snapshot**: Complete portable snapshot of all collections and configurations.
- **Direct SQL Dump**: Fresh `paila_travelcms_backup_*.sql` dump file ready for phpMyAdmin restoration.
