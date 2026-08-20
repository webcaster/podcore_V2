<?php
defined('ABSPATH') || exit;

final class PodCore_License_Admin {
    public static function init() {
        add_action('admin_menu', array(__CLASS__, 'menu'));
        add_action('admin_post_podcore_generate_license', array(__CLASS__, 'generate'));
    }

    public static function menu() { add_submenu_page('woocommerce', 'PodCore-Lizenzen', 'PodCore-Lizenzen', 'manage_woocommerce', 'podcore-licenses', array(__CLASS__, 'page')); }

    public static function page() {
        if (!current_user_can('manage_woocommerce')) return;
        global $wpdb;
        $licenses = $wpdb->get_results('SELECT * FROM ' . PodCore_License_Store::table(PodCore_License_Store::TABLE_LICENSES) . ' ORDER BY id DESC LIMIT 100');
        ?>
        <div class="wrap"><h1>PodCore-Lizenzen</h1>
        <p>Erzeuge hier Sonderlizenzen oder verwalte die öffentliche Signatur. WooCommerce-Produkte erzeugen Lizenzen automatisch beim Abschluss der Bestellung.</p>
        <h2>Code-Generator</h2><form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="background:#fff;padding:16px;max-width:720px">
        <?php wp_nonce_field('podcore_generate_license'); ?><input type="hidden" name="action" value="podcore_generate_license" />
        <p><label>Kundenname<br><input class="regular-text" name="customer_name"></label></p>
        <p><label>E-Mail<br><input class="regular-text" type="email" name="customer_email"></label></p>
        <p><label>Tarif<br><select name="plan"><option value="monthly">Monatsabo</option><option value="yearly">Jahresabo</option><option value="special">Sonderabo</option></select></label></p>
        <p><label>Laufzeit Sonderabo in Tagen (0 = unbefristet)<br><input type="number" min="0" name="duration_days" value="0"></label></p>
        <p><label>Max. Aktivierungen<br><input type="number" min="1" name="max_activations" value="1"></label></p>
        <p><button class="button button-primary">Lizenzcode erzeugen</button></p></form>
        <h2>Ausgestellte Lizenzen</h2><table class="widefat striped"><thead><tr><th>Code</th><th>Tarif</th><th>Kunde</th><th>Status</th><th>Ablauf</th><th>Ausgestellt</th></tr></thead><tbody>
        <?php foreach ($licenses as $license): ?><tr><td><code><?php echo esc_html($license->license_key); ?></code></td><td><?php echo esc_html($license->plan); ?></td><td><?php echo esc_html($license->customer_name . ' <' . $license->customer_email . '>'); ?></td><td><?php echo esc_html($license->status); ?></td><td><?php echo esc_html($license->expires_at ?: 'unbefristet'); ?></td><td><?php echo esc_html($license->issued_at); ?></td></tr><?php endforeach; ?>
        </tbody></table>
        <h2>Offline-Signaturschlüssel</h2><p><code style="word-break:break-all"><?php echo esc_html(PodCore_License_Store::public_key()); ?></code></p>
        </div><?php
    }

    public static function generate() {
        if (!current_user_can('manage_woocommerce') || !check_admin_referer('podcore_generate_license')) wp_die('Nicht autorisiert.');
        $license = PodCore_License_Store::create_license(array('plan' => sanitize_key($_POST['plan'] ?? 'special'), 'duration_days' => absint($_POST['duration_days'] ?? 0), 'max_activations' => max(1, absint($_POST['max_activations'] ?? 1)), 'customer_name' => sanitize_text_field(wp_unslash($_POST['customer_name'] ?? '')), 'customer_email' => sanitize_email(wp_unslash($_POST['customer_email'] ?? ''))));
        $url = add_query_arg(array('page' => 'podcore-licenses', 'generated' => $license ? rawurlencode($license->license_key) : '0'), admin_url('admin.php'));
        wp_safe_redirect($url); exit;
    }
}
