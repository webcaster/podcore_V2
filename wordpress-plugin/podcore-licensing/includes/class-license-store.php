<?php
defined('ABSPATH') || exit;

final class PodCore_License_Store {
    const DB_VERSION = '1.0.0';
    const TABLE_LICENSES = 'podcore_licenses';
    const TABLE_ACTIVATIONS = 'podcore_license_activations';

    public static function init() {
        add_action('admin_init', array(__CLASS__, 'maybe_upgrade'));
    }

    public static function table($name) {
        global $wpdb;
        return $wpdb->prefix . $name;
    }

    public static function activate() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charset = $wpdb->get_charset_collate();
        $licenses = self::table(self::TABLE_LICENSES);
        $activations = self::table(self::TABLE_ACTIVATIONS);
        dbDelta("CREATE TABLE {$licenses} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            license_key varchar(64) NOT NULL,
            product_id bigint(20) unsigned NOT NULL DEFAULT 0,
            plan varchar(20) NOT NULL DEFAULT 'special',
            customer_email varchar(190) NOT NULL DEFAULT '',
            customer_name varchar(190) NOT NULL DEFAULT '',
            status varchar(20) NOT NULL DEFAULT 'active',
            issued_at datetime NOT NULL,
            expires_at datetime NULL,
            max_activations int unsigned NOT NULL DEFAULT 1,
            metadata longtext NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY (id), UNIQUE KEY license_key (license_key), KEY status (status), KEY customer_email (customer_email)
        ) {$charset};");
        dbDelta("CREATE TABLE {$activations} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            license_id bigint(20) unsigned NOT NULL,
            activation_token char(64) NOT NULL,
            label varchar(190) NOT NULL DEFAULT '',
            software varchar(100) NOT NULL DEFAULT 'podcore',
            site_hash char(64) NOT NULL DEFAULT '',
            activated_at datetime NOT NULL,
            last_validated_at datetime NULL,
            deactivated_at datetime NULL,
            PRIMARY KEY (id), UNIQUE KEY activation_token (activation_token), KEY license_id (license_id), KEY site_hash (site_hash)
        ) {$charset};");
        update_option('podcore_licensing_db_version', self::DB_VERSION, false);
        self::ensure_signing_keys();
    }

    public static function deactivate_plugin() {}
    public static function maybe_upgrade() {
        if (get_option('podcore_licensing_db_version') !== self::DB_VERSION) self::activate();
    }

    public static function ensure_signing_keys() {
        if (get_option('podcore_licensing_public_key') && get_option('podcore_licensing_private_key')) return;
        if (!function_exists('sodium_crypto_sign_keypair')) return;
        $pair = sodium_crypto_sign_keypair();
        update_option('podcore_licensing_private_key', base64_encode(sodium_crypto_sign_secretkey($pair)), true);
        update_option('podcore_licensing_public_key', base64_encode(sodium_crypto_sign_publickey($pair)), false);
    }

    public static function public_key() { return (string) get_option('podcore_licensing_public_key', ''); }

    public static function generate_key() {
        return 'PC-' . strtoupper(substr(bin2hex(random_bytes(10)), 0, 20));
    }

    public static function generate_activation_token() { return bin2hex(random_bytes(32)); }

    public static function plan_from_product($product_id) {
        $value = strtolower((string) get_post_meta($product_id, '_podcore_plan', true));
        if (in_array($value, array('monthly', 'yearly', 'special'), true)) return $value;
        $name = strtolower((string) get_the_title($product_id));
        if (preg_match('/monat|monthly/', $name)) return 'monthly';
        if (preg_match('/jahr|jaehr|yearly|annual/', $name)) return 'yearly';
        return 'special';
    }

    public static function duration_days($plan, $product_id = 0) {
        if ($plan === 'monthly') return 30;
        if ($plan === 'yearly') return 365;
        $days = absint($product_id ? get_post_meta($product_id, '_podcore_special_days', true) : 0);
        return $days > 0 ? $days : 0;
    }

    public static function sign_payload($payload) {
        $private = base64_decode((string) get_option('podcore_licensing_private_key', ''), true);
        if (!$private || !function_exists('sodium_crypto_sign_detached')) return '';
        $canonical = wp_json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        return base64_encode(sodium_crypto_sign_detached($canonical, $private));
    }

    public static function license_payload($license, $activation = null) {
        return array(
            'format' => 'podcore-license-v1',
            'license_key' => (string) $license->license_key,
            'license_id' => (int) $license->id,
            'plan' => (string) $license->plan,
            'status' => (string) $license->status,
            'issued_at' => gmdate('c', strtotime($license->issued_at)),
            'expires_at' => $license->expires_at ? gmdate('c', strtotime($license->expires_at)) : null,
            'customer_email' => (string) $license->customer_email,
            'customer_name' => (string) $license->customer_name,
            'max_activations' => (int) $license->max_activations,
            'activation_token' => $activation ? (string) $activation->activation_token : null,
            'activated_at' => $activation ? gmdate('c', strtotime($activation->activated_at)) : null,
            'public_key' => self::public_key(),
        );
    }

    public static function signed_document($license, $activation = null) {
        $payload = self::license_payload($license, $activation);
        return array('payload' => $payload, 'signature' => self::sign_payload($payload), 'algorithm' => 'Ed25519');
    }

    public static function find_by_key($key) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . self::table(self::TABLE_LICENSES) . ' WHERE license_key = %s', strtoupper(sanitize_text_field($key))));
    }

    public static function find_by_token($token) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare('SELECT a.*, l.* FROM ' . self::table(self::TABLE_ACTIVATIONS) . ' a JOIN ' . self::table(self::TABLE_LICENSES) . ' l ON l.id = a.license_id WHERE a.activation_token = %s', sanitize_text_field($token)));
    }

    public static function is_usable($license) {
        if (!$license || $license->status !== 'active') return false;
        return !$license->expires_at || strtotime($license->expires_at) >= current_time('timestamp', true);
    }

    public static function create_license($args = array()) {
        global $wpdb;
        $now = current_time('mysql', true);
        $days = isset($args['duration_days']) ? absint($args['duration_days']) : self::duration_days($args['plan'] ?? 'special', $args['product_id'] ?? 0);
        $expires = $days > 0 ? gmdate('Y-m-d H:i:s', time() + $days * DAY_IN_SECONDS) : null;
        $key = self::generate_key();
        $wpdb->insert(self::table(self::TABLE_LICENSES), array(
            'license_key' => $key, 'product_id' => absint($args['product_id'] ?? 0), 'plan' => sanitize_key($args['plan'] ?? 'special'),
            'customer_email' => sanitize_email($args['customer_email'] ?? ''), 'customer_name' => sanitize_text_field($args['customer_name'] ?? ''),
            'status' => 'active', 'issued_at' => $now, 'expires_at' => $expires, 'max_activations' => max(1, absint($args['max_activations'] ?? 1)),
            'metadata' => wp_json_encode($args['metadata'] ?? array()), 'created_at' => $now, 'updated_at' => $now,
        ));
        return self::find_by_key($key);
    }

    public static function activate_license($license, $label, $software) {
        global $wpdb;
        $active = $wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM ' . self::table(self::TABLE_ACTIVATIONS) . ' WHERE license_id = %d AND deactivated_at IS NULL', $license->id));
        if ((int) $active >= (int) $license->max_activations) return new WP_Error('activation_limit', 'Das Aktivierungslimit dieser Lizenz ist erreicht.', array('status' => 409));
        $token = self::generate_activation_token();
        $wpdb->insert(self::table(self::TABLE_ACTIVATIONS), array('license_id' => $license->id, 'activation_token' => $token, 'label' => sanitize_text_field($label), 'software' => sanitize_key($software ?: 'podcore'), 'site_hash' => hash('sha256', home_url()), 'activated_at' => current_time('mysql', true)));
        return self::find_by_token($token);
    }

    public static function deactivate($activation) {
        global $wpdb;
        $wpdb->update(self::table(self::TABLE_ACTIVATIONS), array('deactivated_at' => current_time('mysql', true)), array('id' => $activation->id));
        return self::find_by_token($activation->activation_token);
    }

    public static function renew_license($license, $product_id = 0) {
        global $wpdb;
        $days = self::duration_days($license->plan, $product_id ?: $license->product_id);
        if ($days <= 0) return $license;
        $base = ($license->expires_at && strtotime($license->expires_at) > time()) ? strtotime($license->expires_at) : time();
        $wpdb->update(self::table(self::TABLE_LICENSES), array('expires_at' => gmdate('Y-m-d H:i:s', $base + $days * DAY_IN_SECONDS), 'status' => 'active', 'updated_at' => current_time('mysql', true)), array('id' => $license->id));
        return self::find_by_key($license->license_key);
    }
}
