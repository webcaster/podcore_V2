<?php
defined('ABSPATH') || exit;

final class PodCore_Rest_API {
    const NAMESPACE = 'dlm/v1';

    public static function init() { add_action('rest_api_init', array(__CLASS__, 'register_routes')); }

    public static function register_routes() {
        register_rest_route(self::NAMESPACE, '/licenses/activate/(?P<key>[A-Za-z0-9_-]+)', array('methods' => WP_REST_Server::READABLE, 'callback' => array(__CLASS__, 'activate'), 'permission_callback' => array(__CLASS__, 'authenticate')));
        register_rest_route(self::NAMESPACE, '/licenses/validate/(?P<token>[a-f0-9]{64})', array('methods' => WP_REST_Server::READABLE, 'callback' => array(__CLASS__, 'validate'), 'permission_callback' => array(__CLASS__, 'authenticate')));
        register_rest_route(self::NAMESPACE, '/licenses/deactivate/(?P<token>[a-f0-9]{64})', array('methods' => WP_REST_Server::READABLE, 'callback' => array(__CLASS__, 'deactivate'), 'permission_callback' => array(__CLASS__, 'authenticate')));
        register_rest_route(self::NAMESPACE, '/licenses/issue', array('methods' => WP_REST_Server::CREATABLE, 'callback' => array(__CLASS__, 'issue'), 'permission_callback' => function () { return current_user_can('manage_woocommerce'); }));
        register_rest_route(self::NAMESPACE, '/licenses/document/(?P<key>[A-Za-z0-9_-]+)', array('methods' => WP_REST_Server::READABLE, 'callback' => array(__CLASS__, 'document'), 'permission_callback' => array(__CLASS__, 'authenticate')));
        register_rest_route(self::NAMESPACE, '/public-key', array('methods' => WP_REST_Server::READABLE, 'callback' => function () { return rest_ensure_response(array('success' => true, 'public_key' => PodCore_License_Store::public_key(), 'algorithm' => 'Ed25519')); }, 'permission_callback' => '__return_true'));
    }

    public static function authenticate($request) {
        $key = sanitize_text_field($request->get_param('consumer_key'));
        $secret = sanitize_text_field($request->get_param('consumer_secret'));
        if (!$key || !$secret) return new WP_Error('missing_credentials', 'Consumer Key und Consumer Secret sind erforderlich.', array('status' => 401));
        if (class_exists('WC_REST_Authentication')) {
            // WooCommerce prüft bei GET-Anfragen selbst die Query-Parameter consumer_key/consumer_secret.
            $authenticated_user = WC_REST_Authentication::instance()->authenticate(false);
            if ($authenticated_user || get_current_user_id()) return true;
        }
        if (function_exists('wc_api_hash') && self::validate_wc_credentials($key, $secret)) return true;
        return new WP_Error('invalid_credentials', 'Ungültige WooCommerce-API-Zugangsdaten.', array('status' => 401));
    }

    private static function validate_wc_credentials($key, $secret) {
        global $wpdb;
        $table = $wpdb->prefix . 'woocommerce_api_keys';
        if (!$wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table))) return false;
        $row = $wpdb->get_row($wpdb->prepare("SELECT consumer_secret, permissions FROM {$table} WHERE consumer_key = %s", wc_api_hash($key)));
        if (!$row) return false;
        $stored = (string) $row->consumer_secret;
        $hash = function_exists('wp_hash_password') ? wp_hash_password($secret) : '';
        return wp_check_password($secret, $stored) || hash_equals($stored, wc_api_hash($secret)) || ($hash && wp_check_password($secret, $hash));
    }

    private static function response($activation, $message = '') {
        $payload = PodCore_License_Store::license_payload($activation, $activation);
        $document = PodCore_License_Store::signed_document($activation, $activation);
        return array('success' => true, 'message' => $message, 'data' => array(
            'token' => $activation->activation_token,
            'license_id' => (int) $activation->license_id,
            'expires_at' => $activation->expires_at ? gmdate('c', strtotime($activation->expires_at)) : null,
            'product_name' => $activation->plan === 'monthly' ? 'PodCore Monatsabo' : ($activation->plan === 'yearly' ? 'PodCore Jahresabo' : 'PodCore Sonderabo'),
            'license' => array('id' => (int) $activation->license_id, 'name' => 'PodCore ' . ucfirst($activation->plan), 'expires_at' => $activation->expires_at ? gmdate('c', strtotime($activation->expires_at)) : null, 'status' => $activation->status, 'plan' => $activation->plan),
            'document' => $document,
            'payload' => $payload,
        ));
    }

    public static function activate($request) {
        $license = PodCore_License_Store::find_by_key($request['key']);
        if (!$license || !PodCore_License_Store::is_usable($license)) return new WP_Error('license_invalid', 'Lizenz nicht gefunden, abgelaufen oder deaktiviert.', array('status' => 403));
        $activation = PodCore_License_Store::activate_license($license, $request->get_param('label') ?: 'PodCore Installation', $request->get_param('software') ?: 'podcore');
        if (is_wp_error($activation)) return $activation;
        return rest_ensure_response(self::response($activation, 'Lizenz aktiviert.'));
    }

    public static function validate($request) {
        $activation = PodCore_License_Store::find_by_token($request['token']);
        if (!$activation || $activation->deactivated_at || !PodCore_License_Store::is_usable($activation)) return new WP_Error('license_invalid', 'Aktivierung ist nicht mehr gültig.', array('status' => 403));
        global $wpdb;
        $wpdb->update(PodCore_License_Store::table(PodCore_License_Store::TABLE_ACTIVATIONS), array('last_validated_at' => current_time('mysql', true)), array('id' => $activation->id));
        return rest_ensure_response(self::response(PodCore_License_Store::find_by_token($request['token']), 'Lizenz validiert.'));
    }

    public static function deactivate($request) {
        $activation = PodCore_License_Store::find_by_token($request['token']);
        if (!$activation) return new WP_Error('activation_not_found', 'Aktivierung nicht gefunden.', array('status' => 404));
        return rest_ensure_response(self::response(PodCore_License_Store::deactivate($activation), 'Aktivierung deaktiviert.'));
    }

    public static function issue($request) {
        $args = $request->get_json_params();
        $license = PodCore_License_Store::create_license($args);
        if (!$license) return new WP_Error('issue_failed', 'Lizenz konnte nicht erzeugt werden.', array('status' => 500));
        return rest_ensure_response(array('success' => true, 'license' => PodCore_License_Store::license_payload($license), 'document' => PodCore_License_Store::signed_document($license)));
    }

    public static function document($request) {
        $license = PodCore_License_Store::find_by_key($request['key']);
        if (!$license) return new WP_Error('license_not_found', 'Lizenz nicht gefunden.', array('status' => 404));
        return rest_ensure_response(array('success' => true, 'document' => PodCore_License_Store::signed_document($license)));
    }
}
