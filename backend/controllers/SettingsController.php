<?php
declare(strict_types=1);

namespace Paila\Controllers;

use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;
use PDO;

class SettingsController {
    /**
     * GET /api/v1/settings
     */
    public function get(): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->query('SELECT * FROM company_settings ORDER BY id ASC LIMIT 1');
        $settings = $stmt->fetch();
        echo json_encode(['data' => $settings ?: []]);
    }

    /**
     * PUT/POST /api/v1/settings
     */
    public function update(): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        $input = SecurityHeaders::getJsonInput();

        $pdo = Database::getConnection();

        // Check if a row exists in company_settings
        $checkStmt = $pdo->query('SELECT id FROM company_settings ORDER BY id ASC LIMIT 1');
        $existing = $checkStmt->fetch();

        // Support both camelCase and snake_case inputs
        $cname = SecurityHeaders::sanitizeString($input['companyName'] ?? $input['company_name'] ?? 'Paila Nepal Holidays Pvt. Ltd.');
        $tagline = SecurityHeaders::sanitizeString($input['tagline'] ?? '');
        $domain = SecurityHeaders::sanitizeString($input['domain'] ?? 'pailanepal.com');
        $address = SecurityHeaders::sanitizeString($input['address'] ?? '');
        $phone = SecurityHeaders::sanitizeString($input['phone'] ?? '');
        $ephone = SecurityHeaders::sanitizeString($input['emergencyPhone'] ?? $input['emergency_phone'] ?? '');
        $email = filter_var($input['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $pan = SecurityHeaders::sanitizeString($input['panNumber'] ?? $input['pan_number'] ?? '');
        $vat = SecurityHeaders::sanitizeString($input['vatNumber'] ?? $input['vat_number'] ?? '');
        $reg = SecurityHeaders::sanitizeString($input['registrationNumber'] ?? $input['registration_number'] ?? '');
        $curr = SecurityHeaders::sanitizeString($input['currency'] ?? 'NPR');
        $taxRate = (float)($input['taxRate'] ?? $input['tax_rate'] ?? 13.0);
        $bname = SecurityHeaders::sanitizeString($input['bankName'] ?? $input['bank_name'] ?? '');
        $baname = SecurityHeaders::sanitizeString($input['bankAccountName'] ?? $input['bank_account_name'] ?? '');
        $banum = SecurityHeaders::sanitizeString($input['bankAccountNumber'] ?? $input['bank_account_number'] ?? '');
        $bbranch = SecurityHeaders::sanitizeString($input['bankBranch'] ?? $input['bank_branch'] ?? '');
        $bswift = SecurityHeaders::sanitizeString($input['bankSwiftCode'] ?? $input['bank_swift_code'] ?? '');

        if ($existing) {
            $id = (int)$existing['id'];
            $stmt = $pdo->prepare('UPDATE company_settings SET
                company_name = :cname,
                tagline = :tagline,
                domain = :domain,
                address = :address,
                phone = :phone,
                emergency_phone = :ephone,
                email = :email,
                pan_number = :pan,
                vat_number = :vat,
                registration_number = :reg,
                currency = :curr,
                tax_rate = :tax_rate,
                bank_name = :bname,
                bank_account_name = :baname,
                bank_account_number = :banum,
                bank_branch = :bbranch,
                bank_swift_code = :bswift
            WHERE id = :id');
            $params = [
                ':cname' => $cname,
                ':tagline' => $tagline,
                ':domain' => $domain,
                ':address' => $address,
                ':phone' => $phone,
                ':ephone' => $ephone,
                ':email' => $email,
                ':pan' => $pan,
                ':vat' => $vat,
                ':reg' => $reg,
                ':curr' => $curr,
                ':tax_rate' => $taxRate,
                ':bname' => $bname,
                ':baname' => $baname,
                ':banum' => $banum,
                ':bbranch' => $bbranch,
                ':bswift' => $bswift,
                ':id' => $id
            ];
            $stmt->execute($params);
        } else {
            $stmt = $pdo->prepare('INSERT INTO company_settings (
                company_name, tagline, domain, address, phone, emergency_phone,
                email, pan_number, vat_number, registration_number, currency, tax_rate,
                bank_name, bank_account_name, bank_account_number, bank_branch, bank_swift_code
            ) VALUES (
                :cname, :tagline, :domain, :address, :phone, :ephone,
                :email, :pan, :vat, :reg, :curr, :tax_rate,
                :bname, :baname, :banum, :bbranch, :bswift
            )');
            $stmt->execute([
                ':cname' => $cname,
                ':tagline' => $tagline,
                ':domain' => $domain,
                ':address' => $address,
                ':phone' => $phone,
                ':ephone' => $ephone,
                ':email' => $email,
                ':pan' => $pan,
                ':vat' => $vat,
                ':reg' => $reg,
                ':curr' => $curr,
                ':tax_rate' => $taxRate,
                ':bname' => $bname,
                ':baname' => $baname,
                ':banum' => $banum,
                ':bbranch' => $bbranch,
                ':bswift' => $bswift
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'Settings saved successfully']);
    }
}
