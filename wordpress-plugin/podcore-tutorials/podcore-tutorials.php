<?php
/**
 * Plugin Name: PodCore Tutorial Hub
 * Plugin URI: https://github.com/webcaster/podcore_V2
 * Description: Zeigt PodCore-Tutorials mit Schritten, Screenshots und Annotationen auf einer WordPress-Seite an und bietet kompatible JSON-Downloads.
 * Version: 2.16.4
 * Author: PodCore / Max
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * PodCore_Tutorial_Plugin Klasse
 * Verhindert Namenskollisionen durch Kapselung aller Funktionen.
 */
class PodCore_Tutorial_Plugin {

    private static $instance = null;
    private $version = '2.16.4';
    private $namespace = 'app-tutorials/v1';

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // CPT & Meta
        add_action('init', array($this, 'register_cpt'));
        add_action('add_meta_boxes', array($this, 'add_meta_box'));
        add_action('save_post_podcore_tutorial', array($this, 'save_meta'));
        add_action('admin_menu', array($this, 'add_diagnostics_menu'));

        // REST API
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Frontend
        add_action('template_redirect', array($this, 'handle_download'));
        add_shortcode('podcore_tutorial_hub', array($this, 'render_hub_shortcode'));
        add_shortcode('podcore_tutorials', array($this, 'render_hub_shortcode'));
        add_shortcode('podcore_single_tutorial', array($this, 'render_single_shortcode'));
        add_shortcode('podcore_tutorial', array($this, 'render_single_shortcode'));
        
        // Hooks & Filters
        add_filter('the_content', array($this, 'auto_append_single_content'), 20);
        add_filter('the_content', array($this, 'normalize_shortcode_quotes'), 10);
        add_filter('widget_text_content', array($this, 'normalize_shortcode_quotes'), 10);
        add_action('vc_before_init', array($this, 'register_wpbakery_element'));
        
        // Activation/Deactivation
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    public function activate() {
        $this->register_cpt();
        flush_rewrite_rules();
    }

    public function deactivate() {
        flush_rewrite_rules();
    }

    // --- CPT & Meta ---

    public function register_cpt() {
        register_post_type('podcore_tutorial', array(
            'labels' => array(
                'name'               => 'PodCore Tutorials',
                'singular_name'      => 'PodCore Tutorial',
                'menu_name'          => 'PodCore Tutorials',
                'add_new'            => 'Neues Tutorial hinzufügen',
                'add_new_item'       => 'Neues Tutorial erstellen',
                'edit_item'          => 'Tutorial bearbeiten',
                'new_item'           => 'Neues Tutorial',
                'view_item'          => 'Tutorial ansehen',
                'search_items'       => 'Tutorials durchsuchen',
                'not_found'          => 'Keine Tutorials gefunden',
                'not_found_in_trash' => 'Keine Tutorials im Papierkorb gefunden',
            ),
            'public'             => true,
            'has_archive'        => true,
            'publicly_queryable' => true,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-book-alt',
            'supports'           => array('title', 'editor', 'custom-fields', 'thumbnail'),
            'show_in_rest'       => true,
            'rewrite'            => array('slug' => 'podcore-tutorial'),
        ));
    }

    public function add_meta_box() {
        add_meta_box(
            'podcore_tutorial_data_box',
            'PodCore Tutorial Export-Daten (JSON)',
            array($this, 'render_meta_box'),
            'podcore_tutorial',
            'normal',
            'high'
        );
    }

    public function render_meta_box($post) {
        wp_nonce_field('podcore_tutorial_save_meta', 'podcore_tutorial_nonce');
        $json_data = get_post_meta($post->ID, '_podcore_tutorial_json', true);
        $roles = get_post_meta($post->ID, '_podcore_tutorial_roles', true);
        ?>
        <p>
            <label for="podcore_tutorial_roles"><strong>Zielrollen (kommagetrennt):</strong></label><br>
            <input type="text" id="podcore_tutorial_roles" name="podcore_tutorial_roles" value="<?php echo esc_attr($roles ? $roles : 'admin, redakteur'); ?>" style="width:100%;" placeholder="admin, redakteur, *">
        </p>
        <p>
            <label for="podcore_tutorial_json"><strong>Tutorial-Export (JSON):</strong></label><br>
            <textarea id="podcore_tutorial_json" name="podcore_tutorial_json" rows="12" style="width:100%; font-family:monospace; font-size:12px;"><?php echo esc_textarea($json_data); ?></textarea>
        </p>
        <p class="description">Füge hier den JSON-Export aus PodCore ein. Das Plugin erkennt automatisch Schritte und Bilder.</p>
        <?php
    }

    public function save_meta($post_id) {
        if (!isset($_POST['podcore_tutorial_nonce']) || !wp_verify_nonce($_POST['podcore_tutorial_nonce'], 'podcore_tutorial_save_meta')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        if (isset($_POST['podcore_tutorial_json'])) {
            update_post_meta($post_id, '_podcore_tutorial_json', wp_unslash($_POST['podcore_tutorial_json']));
        }
        if (isset($_POST['podcore_tutorial_roles'])) {
            update_post_meta($post_id, '_podcore_tutorial_roles', sanitize_text_field(wp_unslash($_POST['podcore_tutorial_roles'])));
        }
    }

    public function add_diagnostics_menu() {
        add_submenu_page('edit.php?post_type=podcore_tutorial', 'PodCore Diagnose', 'Diagnose', 'manage_options', 'podcore-tutorial-diagnostics', array($this, 'render_diagnostics_page'));
    }

    public function render_diagnostics_page() {
        if (!current_user_can('manage_options')) wp_die('Keine Berechtigung.');
        $posts = get_posts(array('post_type' => 'podcore_tutorial', 'post_status' => 'any', 'posts_per_page' => -1));
        ?>
        <div class="wrap">
            <h1>PodCore Tutorial-Diagnose</h1>
            <p>Version: <?php echo esc_html($this->version); ?></p>
            <table class="widefat striped">
                <thead><tr><th>Tutorial</th><th>JSON</th><th>Schritte</th></tr></thead>
                <tbody>
                <?php foreach ($posts as $p) : 
                    $data = $this->decode_json(get_post_meta($p->ID, '_podcore_tutorial_json', true));
                    $steps = $this->get_steps($data);
                ?>
                    <tr>
                        <td><strong><?php echo esc_html($p->post_title); ?></strong></td>
                        <td><?php echo !empty($data) ? '✓' : '✕'; ?></td>
                        <td><?php echo count($steps); ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    // --- Data Processing ---

    public function decode_json($raw) {
        if (empty($raw)) return array();
        if (is_array($raw)) return $raw;
        $clean = trim($raw);
        $clean = preg_replace('/^```(?:json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', trim($clean));
        $decoded = json_decode($clean, true);
        
        if (!is_array($decoded)) {
            $start = strpos($clean, '{');
            $end = strrpos($clean, '}');
            if ($start !== false && $end !== false) {
                $decoded = json_decode(substr($clean, $start, $end - $start + 1), true);
            }
        }
        
        if (!is_array($decoded)) return array();
        if (isset($decoded['data'])) $decoded = $decoded['data'];
        if (isset($decoded['tutorial'])) $decoded = $decoded['tutorial'];
        return $decoded;
    }

    public function get_steps($data) {
        if (!is_array($data)) return array();
        if (isset($data['steps']) && is_array($data['steps'])) return $data['steps'];
        return (array_values($data) === $data) ? $data : array();
    }

    public function get_image($step) {
        if (!is_array($step)) return '';
        foreach (array('screenshotUrl', 'imageUrl', 'screenshot', 'image', 'imageData') as $key) {
            if (!empty($step[$key]) && is_string($step[$key])) return $step[$key];
        }
        return '';
    }

    // --- REST API ---

    public function register_rest_routes() {
        register_rest_route($this->namespace, '/tutorials', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_list_tutorials'),
            'permission_callback' => '__return_true',
        ));
    }

    public function rest_list_tutorials($request) {
        $query = new WP_Query(array(
            'post_type' => 'podcore_tutorial',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        ));
        
        $items = array();
        foreach ($query->posts as $post) {
            $data = $this->decode_json(get_post_meta($post->ID, '_podcore_tutorial_json', true));
            $raw_steps = $this->get_steps($data);
            $steps = array();
            foreach ($raw_steps as $idx => $s) {
                $steps[] = array(
                    'id' => $s['id'] ?? ('step-' . ($idx + 1)),
                    'title' => $s['title'] ?? ($s['name'] ?? ('Schritt ' . ($idx + 1))),
                    'description' => wp_strip_all_tags($s['content'] ?? ($s['description'] ?? '')),
                    'image' => $this->get_image($s),
                    'target' => $s['target'] ?? '',
                    'position' => $s['position'] ?? '',
                    'annotations' => $s['annotations'] ?? array(),
                );
            }
            
            $roles_raw = get_post_meta($post->ID, '_podcore_tutorial_roles', true);
            $roles = array_filter(array_map('trim', explode(',', (string) $roles_raw)));
            if (empty($roles)) $roles = array('*');

            $items[] = array(
                'id' => $post->ID,
                'slug' => $post->post_name,
                'title' => $post->post_title,
                'description' => wp_strip_all_tags($post->post_content ?: ($data['description'] ?? '')),
                'roles' => array_values($roles),
                'steps' => $steps,
                'version' => $this->version,
                'updatedAt' => $post->post_modified_gmt,
            );
        }

        return rest_ensure_response(array(
            'items' => $items,
            'total' => count($items),
            'updatedAt' => gmdate('c'),
        ));
    }

    // --- Frontend & Shortcodes ---

    public function handle_download() {
        if (!isset($_GET['download_podcore_tutorial'])) return;
        $post_id = absint($_GET['download_podcore_tutorial']);
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'podcore_tutorial' || $post->post_status !== 'publish') return;

        $data = $this->decode_json(get_post_meta($post_id, '_podcore_tutorial_json', true));
        $roles_raw = get_post_meta($post_id, '_podcore_tutorial_roles', true);
        $roles = array_filter(array_map('trim', explode(',', (string) $roles_raw)));

        $export = array(
            'title' => $post->post_title,
            'description' => wp_strip_all_tags($post->post_content ?: ($data['description'] ?? '')),
            'roles' => !empty($roles) ? array_values($roles) : array('admin'),
            'steps' => $this->get_steps($data),
            'version' => $this->version,
        );

        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="podcore_tutorial_' . $post->post_name . '.json"');
        echo wp_json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public function render_hub_shortcode() {
        $query = new WP_Query(array('post_type' => 'podcore_tutorial', 'post_status' => 'publish', 'posts_per_page' => -1));
        ob_start();
        ?>
        <div class="podcore-hub">
            <?php if ($query->have_posts()) : while ($query->have_posts()) : $query->the_post(); ?>
                <div class="podcore-card" style="border:1px solid #ddd; padding:15px; margin-bottom:15px; border-radius:8px;">
                    <h3><?php the_title(); ?></h3>
                    <p><?php echo wp_trim_words(get_the_content(), 20); ?></p>
                    <a href="<?php the_permalink(); ?>" class="button">Ansehen</a>
                </div>
            <?php endwhile; wp_reset_postdata(); else : ?>
                <p>Keine Tutorials gefunden.</p>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public function render_single_shortcode($atts) {
        $atts = shortcode_atts(array('id' => 0, 'slug' => ''), $atts);
        $post = null;
        if ($atts['id']) $post = get_post($atts['id']);
        elseif ($atts['slug']) $post = get_page_by_path($atts['slug'], OBJECT, 'podcore_tutorial');
        
        if (!$post || $post->post_type !== 'podcore_tutorial') return '';

        $data = $this->decode_json(get_post_meta($post->ID, '_podcore_tutorial_json', true));
        $steps = $this->get_steps($data);

        ob_start();
        ?>
        <div class="podcore-single">
            <h2><?php echo esc_html($post->post_title); ?></h2>
            <div class="content"><?php echo wpautop(get_the_content('', false, $post->ID)); ?></div>
            <?php foreach ($steps as $idx => $s) : ?>
                <div class="step" style="margin-top:20px; border-top:1px solid #eee; padding-top:10px;">
                    <h4><?php echo esc_html($s['title'] ?? 'Schritt ' . ($idx + 1)); ?></h4>
                    <p><?php echo esc_html($s['description'] ?? ($s['content'] ?? '')); ?></p>
                    <?php $img = $this->get_image($s); if ($img) : ?>
                        <img src="<?php echo esc_url($img); ?>" style="max-width:100%; height:auto; border-radius:4px;">
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
            <p style="margin-top:20px;">
                <a href="<?php echo esc_url(add_query_arg('download_podcore_tutorial', $post->ID, get_permalink($post->ID))); ?>" class="button" style="background:#7c3aed; color:#fff; padding:10px 15px; text-decoration:none; border-radius:5px;">JSON Download</a>
            </p>
        </div>
        <?php
        return ob_get_clean();
    }

    public function auto_append_single_content($content) {
        if (is_singular('podcore_tutorial') && in_the_loop() && is_main_query()) {
            $content .= $this->render_single_shortcode(array('id' => get_the_ID()));
        }
        return $content;
    }

    public function normalize_shortcode_quotes($content) {
        if (!is_string($content) || strpos($content, 'podcore_') === false) return $content;
        return str_replace(array('“', '”', '„', '«', '»'), '"', $content);
    }

    public function register_wpbakery_element() {
        if (function_exists('vc_map')) {
            vc_map(array(
                'name' => 'PodCore Tutorial',
                'base' => 'podcore_tutorial',
                'category' => 'PodCore',
                'params' => array(
                    array('type' => 'textfield', 'heading' => 'Slug', 'param_name' => 'slug'),
                    array('type' => 'textfield', 'heading' => 'ID', 'param_name' => 'id'),
                ),
            ));
        }
    }
}

// Initialisierung
PodCore_Tutorial_Plugin::get_instance();
