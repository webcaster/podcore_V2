<?php
/**
 * Plugin Name: PodCore Licensing for WooCommerce
 * Plugin URI: https://podcore.de
 * Description: Eigene PodCore-Lizenz-API mit WooCommerce-Abos, Code-Generator und offline verifizierbaren Lizenzdokumenten.
 * Version: 1.0.0
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Author: PodCore
 * License: GPL-2.0-or-later
 * Text Domain: podcore-licensing
 */

defined('ABSPATH') || exit;

define('PODCORE_LICENSING_VERSION', '1.0.0');
define('PODCORE_LICENSING_FILE', __FILE__);
define('PODCORE_LICENSING_DIR', plugin_dir_path(__FILE__));
define('PODCORE_LICENSING_URL', plugin_dir_url(__FILE__));

require_once PODCORE_LICENSING_DIR . 'includes/class-license-store.php';
require_once PODCORE_LICENSING_DIR . 'includes/class-rest-api.php';
require_once PODCORE_LICENSING_DIR . 'includes/class-woocommerce.php';
require_once PODCORE_LICENSING_DIR . 'includes/class-admin.php';

register_activation_hook(__FILE__, array('PodCore_License_Store', 'activate'));
register_deactivation_hook(__FILE__, array('PodCore_License_Store', 'deactivate_plugin'));

add_action('plugins_loaded', static function () {
    PodCore_License_Store::init();
    PodCore_Rest_API::init();
    PodCore_WooCommerce::init();
    PodCore_License_Admin::init();
});
