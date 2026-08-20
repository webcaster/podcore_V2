<?php
defined('ABSPATH') || exit;

final class PodCore_WooCommerce {
    public static function init() {
        add_action('woocommerce_product_options_general_product_data', array(__CLASS__, 'product_fields'));
        add_action('woocommerce_process_product_meta', array(__CLASS__, 'save_product_fields'));
        add_action('woocommerce_order_status_completed', array(__CLASS__, 'order_completed'));
        add_action('woocommerce_subscription_payment_complete', array(__CLASS__, 'subscription_payment_complete'));
        add_action('woocommerce_subscription_status_updated', array(__CLASS__, 'subscription_status_updated'), 10, 3);
    }

    public static function product_fields() {
        echo '<div class="options_group">';
        woocommerce_wp_select(array('id' => '_podcore_plan', 'label' => 'PodCore-Tarif', 'description' => 'Legt fest, welche Lizenz beim Kauf erzeugt wird.', 'desc_tip' => true, 'options' => array('' => 'Automatisch erkennen', 'monthly' => 'Monatsabo (30 Tage)', 'yearly' => 'Jahresabo (365 Tage)', 'special' => 'Sonderabo (konfigurierbar)')));
        woocommerce_wp_text_input(array('id' => '_podcore_special_days', 'label' => 'Sonderabo-Laufzeit (Tage)', 'type' => 'number', 'custom_attributes' => array('min' => '0'), 'description' => '0 bedeutet unbefristet.', 'desc_tip' => true));
        woocommerce_wp_text_input(array('id' => '_podcore_max_activations', 'label' => 'Max. Aktivierungen', 'type' => 'number', 'custom_attributes' => array('min' => '1'), 'value' => get_post_meta(get_the_ID(), '_podcore_max_activations', true) ?: 1));
        echo '</div>';
    }

    public static function save_product_fields($product_id) {
        if (!current_user_can('edit_post', $product_id)) return;
        foreach (array('_podcore_plan', '_podcore_special_days', '_podcore_max_activations') as $field) {
            if (isset($_POST[$field])) update_post_meta($product_id, $field, sanitize_text_field(wp_unslash($_POST[$field])));
        }
    }

    private static function order_license($order) {
        if (!$order || !is_a($order, 'WC_Order')) return;
        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            if (!$product_id || $order->get_meta('_podcore_license_key')) continue;
            $plan = PodCore_License_Store::plan_from_product($product_id);
            $license = PodCore_License_Store::create_license(array('product_id' => $product_id, 'plan' => $plan, 'customer_email' => $order->get_billing_email(), 'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()), 'max_activations' => max(1, absint(get_post_meta($product_id, '_podcore_max_activations', true) ?: 1)), 'metadata' => array('order_id' => $order->get_id(), 'product_id' => $product_id)));
            if (!$license) continue;
            $order->update_meta_data('_podcore_license_key', $license->license_key);
            $order->update_meta_data('_podcore_license_plan', $plan);
            $order->save();
            $document = PodCore_License_Store::signed_document($license);
            $order->add_order_note('PodCore-Lizenz erzeugt: ' . $license->license_key . ' (' . $plan . '). Signiertes Lizenzdokument ist im PodCore-Lizenzportal abrufbar.');
            do_action('podcore_license_issued', $license, $document, $order);
        }
    }

    public static function order_completed($order_id) { self::order_license(wc_get_order($order_id)); }
    public static function subscription_payment_complete($subscription) {
        if (!is_object($subscription) || !method_exists($subscription, 'get_parent_id')) return;
        $parent = wc_get_order($subscription->get_parent_id());
        $key = $parent ? $parent->get_meta('_podcore_license_key') : '';
        if ($key) {
            $license = PodCore_License_Store::find_by_key($key);
            if ($license) PodCore_License_Store::renew_license($license, $subscription->get_items() ? reset($subscription->get_items())->get_product_id() : 0);
        }
    }

    public static function subscription_status_updated($subscription, $new_status, $old_status) {
        if (!is_object($subscription) || !method_exists($subscription, 'get_parent_id')) return;
        $parent = wc_get_order($subscription->get_parent_id());
        $key = $parent ? $parent->get_meta('_podcore_license_key') : '';
        if (!$key) return;
        $license = PodCore_License_Store::find_by_key($key);
        if (!$license) return;
        global $wpdb;
        if (in_array($new_status, array('cancelled', 'expired'), true)) {
            $wpdb->update(PodCore_License_Store::table(PodCore_License_Store::TABLE_LICENSES), array('status' => 'revoked', 'updated_at' => current_time('mysql', true)), array('id' => $license->id));
        } elseif ($new_status === 'active' && in_array($old_status, array('on-hold', 'pending-cancel', 'pending'), true)) {
            $wpdb->update(PodCore_License_Store::table(PodCore_License_Store::TABLE_LICENSES), array('status' => 'active', 'updated_at' => current_time('mysql', true)), array('id' => $license->id));
        } elseif ($new_status === 'on-hold') {
            $wpdb->update(PodCore_License_Store::table(PodCore_License_Store::TABLE_LICENSES), array('status' => 'on-hold', 'updated_at' => current_time('mysql', true)), array('id' => $license->id));
        }
    }
}
