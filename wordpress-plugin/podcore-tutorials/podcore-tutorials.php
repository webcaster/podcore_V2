<?php
/**
 * Plugin Name: PodCore Tutorial Hub
 * Plugin URI: https://github.com/webcaster/podcore_V2
 * Description: Zeigt PodCore-Tutorials mit Schritten, Screenshots und Annotationen auf einer WordPress-Seite an und bietet kompatible JSON-Downloads.
 * Version: 2.16.0
 * Author: PodCore / Max
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

function podcore_tutorials_cpt() {
    $labels = array(
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
    );

    register_post_type('podcore_tutorial', array(
        'labels'             => $labels,
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
add_action('init', 'podcore_tutorials_cpt');

function podcore_tutorials_activate() {
    podcore_tutorials_cpt();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'podcore_tutorials_activate');

function podcore_tutorials_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'podcore_tutorials_deactivate');

function podcore_tutorial_add_meta_box() {
    add_meta_box(
        'podcore_tutorial_data_box',
        'PodCore Tutorial Export-Daten (JSON mit Screenshots und Schritten)',
        'podcore_tutorial_meta_box_callback',
        'podcore_tutorial',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'podcore_tutorial_add_meta_box');

function podcore_tutorial_meta_box_callback($post) {
    wp_nonce_field('podcore_tutorial_save_meta', 'podcore_tutorial_nonce');
    $json_data = get_post_meta($post->ID, '_podcore_tutorial_json', true);
    $roles = get_post_meta($post->ID, '_podcore_tutorial_roles', true);
    ?>
    <p>
        <label for="podcore_tutorial_roles"><strong>Zielrollen (kommagetrennt):</strong></label><br>
        <input type="text" id="podcore_tutorial_roles" name="podcore_tutorial_roles" value="<?php echo esc_attr($roles ? $roles : 'admin, redakteur'); ?>" style="width:100%;" placeholder="admin, redakteur, moderator">
    </p>
    <p>
        <label for="podcore_tutorial_json"><strong>Vollständiger Tutorial-Export aus PodCore (JSON):</strong></label><br>
        <textarea id="podcore_tutorial_json" name="podcore_tutorial_json" rows="16" style="width:100%; font-family:monospace;"><?php echo esc_textarea($json_data); ?></textarea>
    </p>
    <p class="description">
        Füge hier die komplette JSON-Datei aus PodCore ein. Das Plugin erkennt automatisch die Struktur mit <code>steps</code>, Screenshots, Base64-Bildern und Annotationen.
        Der Beitrag muss anschließend rechts über <strong>Veröffentlichen</strong> veröffentlicht werden.
    </p>
    <?php
    $preview_data = podcore_tutorial_decode($json_data);
    $preview_steps = podcore_tutorial_steps($preview_data);
    if (!empty($json_data) && !empty($preview_steps)) : ?>
        <p style="padding:10px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46;">
            <strong>JSON erkannt:</strong> <?php echo esc_html(count($preview_steps)); ?> Schritte gefunden.
        </p>
    <?php elseif (!empty($json_data)) : ?>
        <p style="padding:10px; background:#fffbeb; border:1px solid #fde68a; color:#92400e;">
            <strong>Keine Schritte erkannt.</strong> Bitte den vollständigen Export mit einem <code>steps</code>-Array einfügen.
        </p>
    <?php endif; ?>
    <?php
}

function podcore_tutorial_save_meta($post_id) {
    if (!isset($_POST['podcore_tutorial_nonce']) || !wp_verify_nonce($_POST['podcore_tutorial_nonce'], 'podcore_tutorial_save_meta')) {
        return;
    }
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    if (isset($_POST['podcore_tutorial_json'])) {
        update_post_meta($post_id, '_podcore_tutorial_json', wp_unslash($_POST['podcore_tutorial_json']));
    }
    if (isset($_POST['podcore_tutorial_roles'])) {
        update_post_meta($post_id, '_podcore_tutorial_roles', sanitize_text_field(wp_unslash($_POST['podcore_tutorial_roles'])));
    }
}
add_action('save_post_podcore_tutorial', 'podcore_tutorial_save_meta');

function podcore_tutorial_decode($json_raw) {
    if (is_array($json_raw)) {
        $decoded = $json_raw;
    } elseif (is_string($json_raw) && trim($json_raw) !== '') {
        $clean = trim(wp_strip_all_tags($json_raw));
        $clean = preg_replace('/^```(?:json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', trim($clean));
        $decoded = json_decode(trim($clean), true);
    } else {
        return array();
    }

    if (!is_array($decoded)) {
        return array();
    }
    // Unterstützt auch Wrapper aus Website-Exporten wie { data: {...} }.
    if (isset($decoded['data']) && is_array($decoded['data'])) {
        $decoded = $decoded['data'];
    }
    if (isset($decoded['tutorial']) && is_array($decoded['tutorial'])) {
        $decoded = $decoded['tutorial'];
    }
    return $decoded;
}

function podcore_tutorial_post_data($post_id) {
    $meta_keys = array(
        '_podcore_tutorial_json',
        '_podcore_tutorial_export',
        '_podcore_tutorial_data',
        '_tutorial_json',
        'podcore_tutorial_json',
    );

    foreach ($meta_keys as $key) {
        $raw = get_post_meta($post_id, $key, true);
        $decoded = podcore_tutorial_decode($raw);
        if (!empty($decoded)) {
            return $decoded;
        }
    }

    // Fallback: Wenn JSON in einem normalen Beitrag gespeichert wurde.
    $post = get_post($post_id);
    if ($post && is_string($post->post_content) && strpos($post->post_content, '"steps"') !== false) {
        $decoded = podcore_tutorial_decode($post->post_content);
        if (!empty($decoded)) {
            return $decoded;
        }
    }
    return array();
}

function podcore_tutorial_steps($decoded) {
    if (!is_array($decoded)) {
        return array();
    }
    if (isset($decoded['steps']) && is_array($decoded['steps'])) {
        return $decoded['steps'];
    }
    // Unterstützt auch einen Export, der direkt nur ein Schritte-Array enthält.
    return array_values($decoded) === $decoded ? $decoded : array();
}

function podcore_tutorial_image($step) {
    if (!is_array($step)) {
        return '';
    }
    foreach (array('screenshotUrl', 'imageUrl', 'screenshot', 'image', 'imageData') as $key) {
        if (!empty($step[$key]) && is_string($step[$key])) {
            return trim($step[$key]);
        }
    }
    return '';
}

function podcore_tutorial_step_text($step) {
    if (!is_array($step)) {
        return '';
    }
    $text = $step['content'] ?? ($step['description'] ?? ($step['text'] ?? ''));
    return is_string($text) ? $text : '';
}

function podcore_tutorial_render_step($step, $index) {
    if (!is_array($step)) {
        return;
    }
    $title = $step['title'] ?? ($step['name'] ?? ('Schritt ' . ($index + 1)));
    $text = podcore_tutorial_step_text($step);
    $image = podcore_tutorial_image($step);
    $annotations = isset($step['annotations']) && is_array($step['annotations']) ? $step['annotations'] : array();
    ?>
    <article class="podcore-tutorial-step" style="border-top:1px solid #e2e8f0; padding-top:18px; margin-top:18px;">
        <h4 style="font-size:16px; color:#0f172a; margin:0 0 8px;">Schritt <?php echo esc_html($index + 1); ?>: <?php echo esc_html($title); ?></h4>
        <?php if ($text !== '') : ?>
            <div style="font-size:14px; line-height:1.6; color:#475569; margin-bottom:12px;">
                <?php echo wpautop(esc_html($text)); ?>
            </div>
        <?php endif; ?>
        <?php if ($image !== '') : ?>
            <div style="position:relative; width:100%; overflow:hidden; border-radius:9px; border:1px solid #e2e8f0; background:#f8fafc; margin-bottom:10px;">
                <img src="<?php echo esc_attr($image); ?>" alt="<?php echo esc_attr('Screenshot für ' . $title); ?>" style="display:block; width:100%; height:auto; max-height:420px; object-fit:contain;" loading="lazy" />
                <?php foreach ($annotations as $annotation_index => $annotation) :
                    if (!is_array($annotation)) continue;
                    $x = isset($annotation['x']) ? max(0, min(100, (float) $annotation['x'])) : 50;
                    $y = isset($annotation['y']) ? max(0, min(100, (float) $annotation['y'])) : 50;
                    $label = $annotation['label'] ?? ($annotation['description'] ?? '');
                    $color = isset($annotation['color']) && is_string($annotation['color']) ? $annotation['color'] : '#7c3aed';
                    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) $color = '#7c3aed';
                    ?>
                    <span title="<?php echo esc_attr($label); ?>" style="position:absolute; left:<?php echo esc_attr($x); ?>%; top:<?php echo esc_attr($y); ?>%; transform:translate(-50%,-50%); width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:<?php echo esc_attr($color); ?>; color:#fff; font-size:13px; font-weight:700; border:2px solid #fff; box-shadow:0 2px 7px rgba(15,23,42,.35);">
                        <?php echo esc_html($annotation_index + 1); ?>
                    </span>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <?php if (!empty($annotations)) : ?>
            <ol style="margin:8px 0 0 20px; padding:0; color:#475569; font-size:13px;">
                <?php foreach ($annotations as $annotation) :
                    if (!is_array($annotation)) continue;
                    $label = $annotation['label'] ?? ($annotation['description'] ?? 'Markierung');
                    ?>
                    <li style="margin-bottom:4px;"><?php echo esc_html($label); ?></li>
                <?php endforeach; ?>
            </ol>
        <?php endif; ?>
    </article>
    <?php
}

function podcore_tutorial_download() {
    if (!isset($_GET['download_podcore_tutorial']) || empty($_GET['download_podcore_tutorial'])) {
        return;
    }
    $post_id = absint($_GET['download_podcore_tutorial']);
    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'podcore_tutorial' || $post->post_status !== 'publish') {
        return;
    }

    $decoded = podcore_tutorial_decode(get_post_meta($post_id, '_podcore_tutorial_json', true));
    $roles_str = get_post_meta($post_id, '_podcore_tutorial_roles', true);
    $roles = array_values(array_filter(array_map('trim', explode(',', (string) $roles_str))));
    $export = $decoded;
    if (empty($export)) {
        $export = array();
    }
    $export['title'] = $export['title'] ?? $post->post_title;
    $export['description'] = $export['description'] ?? wp_strip_all_tags($post->post_content);
    $export['roles'] = !empty($export['roles']) ? $export['roles'] : (!empty($roles) ? $roles : array('admin'));
    $export['enabled'] = isset($export['enabled']) ? (bool) $export['enabled'] : true;
    $export['steps'] = podcore_tutorial_steps($decoded);

    nocache_headers();
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="podcore_tutorial_' . sanitize_file_name($post->post_name) . '.json"');
    echo wp_json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
add_action('template_redirect', 'podcore_tutorial_download');

function podcore_tutorials_shortcode($atts = array()) {
    $query = new WP_Query(array(
        'post_type'      => 'podcore_tutorial',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'orderby'        => 'date',
        'order'          => 'DESC',
    ));

    ob_start();
    ?>
    <div class="podcore-tutorial-hub" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1e293b; max-width:1200px; margin:0 auto; padding:20px;">
        <div style="text-align:center; margin-bottom:40px;">
            <h2 style="font-size:28px; font-weight:700; color:#0f172a; margin:0 0 10px;">PodCore Tutorial-Wissensbasis</h2>
            <p style="font-size:16px; color:#64748b; margin:0;">Alle Anleitungen mit Schritten, Screenshots und kompatiblen Downloads.</p>
        </div>

        <?php if ($query->have_posts()) : ?>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:24px;">
                <?php while ($query->have_posts()) : $query->the_post();
                    $post_id = get_the_ID();
                    $decoded = podcore_tutorial_post_data($post_id);
                    $steps = podcore_tutorial_steps($decoded);
                    $roles = get_post_meta($post_id, '_podcore_tutorial_roles', true);
                    $description = get_the_content();
                    if (trim(wp_strip_all_tags($description)) === '' && !empty($decoded['description'])) {
                        $description = $decoded['description'];
                    }
                    $download_url = add_query_arg('download_podcore_tutorial', $post_id, get_permalink());
                    ?>
                    <section style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; box-shadow:0 4px 6px -1px rgba(0,0,0,.05);">
                        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px;">
                            <h3 style="font-size:20px; font-weight:700; color:#0f172a; margin:0;"><?php echo esc_html(get_the_title()); ?></h3>
                            <?php if ($roles) : ?><span style="background:#f1f5f9; color:#475569; font-size:11px; padding:4px 8px; border-radius:6px; white-space:nowrap;"><?php echo esc_html($roles); ?></span><?php endif; ?>
                        </div>
                        <?php if (trim(wp_strip_all_tags($description)) !== '') : ?>
                            <div style="font-size:14px; color:#475569; line-height:1.6; margin-bottom:16px;"><?php echo wpautop(esc_html(wp_strip_all_tags($description))); ?></div>
                        <?php endif; ?>
                        <?php if (!empty($steps)) : ?>
                            <div style="margin-bottom:20px;">
                                <p style="font-size:13px; font-weight:700; color:#64748b; margin:0 0 8px;">Schritte und Screenshots</p>
                                <?php foreach ($steps as $index => $step) podcore_tutorial_render_step($step, $index); ?>
                            </div>
                        <?php else : ?>
                            <p style="font-size:13px; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:10px; border-radius:8px;">Für dieses Tutorial wurden noch keine gültigen Schritte gefunden. Bitte den vollständigen JSON-Export im Backend einfügen.</p>
                        <?php endif; ?>
                        <a href="<?php echo esc_url($download_url); ?>" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; background:#7c3aed; color:#fff; font-weight:600; padding:11px 16px; border-radius:8px; text-decoration:none;">
                            Tutorial herunterladen (.json)
                        </a>
                    </section>
                <?php endwhile; wp_reset_postdata(); ?>
            </div>
        <?php else : ?>
            <p style="text-align:center; color:#64748b;">Aktuell sind keine veröffentlichten Tutorials vorhanden. Lege unter „PodCore Tutorials“ einen Beitrag an und klicke auf „Veröffentlichen“.</p>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('podcore_tutorial_hub', 'podcore_tutorials_shortcode');
add_shortcode('podcore_tutorials', 'podcore_tutorials_shortcode');

/**
 * Manueller Shortcode für Themes und Page-Builder:
 * [podcore_single_tutorial id="123"]
 * [podcore_single_tutorial slug="erste-schritte"]
 */
function podcore_single_tutorial_shortcode($atts = array()) {
    $atts = shortcode_atts(array(
        'id'    => 0,
        'slug'  => '',
        'title' => '',
    ), $atts, 'podcore_single_tutorial');

    $tutorial = false;
    if (!empty($atts['id'])) {
        $candidate = get_post(absint($atts['id']));
        if ($candidate && $candidate->post_type === 'podcore_tutorial' && $candidate->post_status === 'publish') {
            $tutorial = $candidate;
        }
    }
    if (!$tutorial && !empty($atts['slug'])) {
        $tutorial = get_page_by_path(sanitize_title($atts['slug']), OBJECT, 'podcore_tutorial');
    }
    if (!$tutorial && !empty($atts['title'])) {
        $tutorial = get_page_by_title(sanitize_text_field($atts['title']), OBJECT, 'podcore_tutorial');
    }
    if (!$tutorial) {
        $posts = get_posts(array(
            'post_type' => 'podcore_tutorial',
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
        ));
        $tutorial = !empty($posts) ? $posts[0] : false;
    }

    if (!$tutorial) {
        return current_user_can('manage_options')
            ? '<div style="padding:14px; background:#fffbeb; border:1px solid #fde68a; color:#92400e;">PodCore: Kein veröffentlichtes Tutorial gefunden. Bitte zuerst unter <strong>PodCore Tutorials</strong> einen Beitrag veröffentlichen.</div>'
            : '';
    }

    $decoded = podcore_tutorial_post_data($tutorial->ID);
    $steps = podcore_tutorial_steps($decoded);
    $description = !empty($decoded['description']) ? $decoded['description'] : $tutorial->post_content;

    ob_start();
    ?>
    <div class="podcore-single-tutorial" style="max-width:980px; margin:24px auto; padding:24px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; color:#1e293b;">
        <h2 style="margin:0 0 10px; color:#0f172a;"><?php echo esc_html($tutorial->post_title); ?></h2>
        <?php if (trim(wp_strip_all_tags($description)) !== '') : ?>
            <div style="color:#475569; line-height:1.6; margin-bottom:20px;"><?php echo wpautop(esc_html(wp_strip_all_tags($description))); ?></div>
        <?php endif; ?>
        <?php if (empty($steps)) : ?>
            <div style="padding:12px; background:#fffbeb; border:1px solid #fde68a; color:#92400e;">Für dieses Tutorial wurden keine Schritte erkannt. Bitte den vollständigen JSON-Export im Tutorial-Metafeld speichern.</div>
        <?php else : ?>
            <?php foreach ($steps as $index => $step) podcore_tutorial_render_step($step, $index); ?>
        <?php endif; ?>
        <a href="<?php echo esc_url(add_query_arg('download_podcore_tutorial', $tutorial->ID, get_permalink($tutorial->ID))); ?>" style="display:inline-flex; margin-top:20px; background:#7c3aed; color:#fff; padding:11px 16px; border-radius:8px; text-decoration:none; font-weight:600;">Tutorial herunterladen (.json)</a>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('podcore_single_tutorial', 'podcore_single_tutorial_shortcode');

/**
 * Gibt die JSON-Schritte zusätzlich in der nativen WordPress-Einzelansicht aus.
 * Dadurch funktionieren auch die automatisch erzeugten CPT-Seiten, ohne dass
 * dort nochmals ein Shortcode eingefügt werden muss.
 */
function podcore_tutorial_single_content($content) {
    static $rendered = false;
    if ($rendered || !is_singular()) {
        return $content;
    }

    global $post;
    if (!$post) {
        return $content;
    }

    $tutorial_post_id = 0;
    if ($post->post_type === 'podcore_tutorial') {
        $tutorial_post_id = (int) $post->ID;
    } else {
        // Fallback für eine normale WordPress-Seite mit demselben Titel wie das Tutorial.
        $linked = get_page_by_title($post->post_title, OBJECT, 'podcore_tutorial');
        if ($linked && $linked->post_status === 'publish') {
            $tutorial_post_id = (int) $linked->ID;
        }
    }
    if (!$tutorial_post_id) {
        return $content;
    }

    $decoded = podcore_tutorial_post_data($tutorial_post_id);
    $steps = podcore_tutorial_steps($decoded);

    if (empty($steps)) {
        if (current_user_can('manage_options')) {
            return $content . '<!-- PodCore Tutorial: keine gültigen steps gefunden; bitte den vollständigen JSON-Export im Tutorial-Metafeld speichern. -->';
        }
        return $content;
    }

    ob_start();
    if (current_user_can('manage_options')) {
        echo '<!-- PodCore Tutorial: Einzelansicht aktiv; ' . esc_html(count($steps)) . ' Schritte erkannt. -->';
    }
    $rendered = true;
    ?>
    <section class="podcore-tutorial-single" style="max-width:980px; margin:32px auto 0; padding:24px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; box-shadow:0 4px 14px rgba(15,23,42,.06);">
        <h2 style="font-size:24px; line-height:1.25; color:#0f172a; margin:0 0 8px;">Tutorial-Schritte</h2>
        <p style="font-size:14px; color:#64748b; margin:0 0 18px;">Folge den einzelnen Schritten. Screenshots und Markierungen werden direkt aus dem PodCore-Export angezeigt.</p>
        <?php foreach ($steps as $index => $step) {
            podcore_tutorial_render_step($step, $index);
        } ?>
        <p style="margin:24px 0 0;">
            <a href="<?php echo esc_url(add_query_arg('download_podcore_tutorial', $tutorial_post_id, get_permalink($tutorial_post_id))); ?>" style="display:inline-flex; align-items:center; justify-content:center; background:#7c3aed; color:#fff; font-weight:600; padding:11px 18px; border-radius:8px; text-decoration:none;">Tutorial als JSON herunterladen</a>
        </p>
    </section>
    <?php
    $GLOBALS['podcore_tutorial_rendered'] = isset($GLOBALS['podcore_tutorial_rendered']) && is_array($GLOBALS['podcore_tutorial_rendered']) ? $GLOBALS['podcore_tutorial_rendered'] : array();
    $GLOBALS['podcore_tutorial_rendered'][$tutorial_post_id] = true;
    return $content . ob_get_clean();
}
add_filter('the_content', 'podcore_tutorial_single_content', 20);

/**
 * Fallback für Themes, die the_content nicht normal filtern oder Page-Builder
 * verwenden. Die Ausgabe erscheint am Ende des Seiteninhalts vor dem Footer.
 */
function podcore_tutorial_force_render_footer() {
    if (is_admin() || !is_singular()) {
        return;
    }

    global $post;
    if (!$post) {
        return;
    }

    $tutorial_post_id = 0;
    if ($post->post_type === 'podcore_tutorial') {
        $tutorial_post_id = (int) $post->ID;
    } else {
        $linked = get_page_by_title($post->post_title, OBJECT, 'podcore_tutorial');
        if ($linked && $linked->post_status === 'publish') {
            $tutorial_post_id = (int) $linked->ID;
        }
    }
    if (!$tutorial_post_id) {
        return;
    }

    $rendered = isset($GLOBALS['podcore_tutorial_rendered']) && is_array($GLOBALS['podcore_tutorial_rendered']) ? $GLOBALS['podcore_tutorial_rendered'] : array();
    if (!empty($rendered[$tutorial_post_id])) {
        return;
    }

    $decoded = podcore_tutorial_post_data($tutorial_post_id);
    if (empty(podcore_tutorial_steps($decoded))) {
        if (current_user_can('manage_options')) {
            echo '<div style="margin:20px auto; max-width:980px; padding:12px; background:#fff7ed; border:1px solid #fdba74; color:#9a3412; font-family:Arial,sans-serif;">PodCore-Diagnose: Die Seite wurde erkannt, aber das JSON enthält kein gültiges <code>steps</code>-Array.</div>';
        }
        return;
    }

    echo '<div class="podcore-force-render" style="clear:both; width:100%; box-sizing:border-box;">';
    echo do_shortcode('[podcore_single_tutorial id="' . absint($tutorial_post_id) . '"]');
    echo '</div>';
    $GLOBALS['podcore_tutorial_rendered'][$tutorial_post_id] = true;
}
add_action('wp_footer', 'podcore_tutorial_force_render_footer', 20);

function podcore_tutorial_mobile_styles() {
    if (is_admin()) return;
    ?>
    <style id="podcore-tutorial-mobile-styles">
        .podcore-tutorial-hub,
        .podcore-single-tutorial,
        .podcore-tutorial-single,
        .podcore-force-render {
            max-width: 100% !important;
            box-sizing: border-box !important;
        }
        .podcore-tutorial-hub img,
        .podcore-single-tutorial img,
        .podcore-tutorial-single img {
            max-width: 100% !important;
            height: auto !important;
        }
        @media (max-width: 640px) {
            .podcore-tutorial-hub,
            .podcore-single-tutorial,
            .podcore-tutorial-single {
                padding: 14px !important;
                margin: 16px 0 !important;
                border-radius: 10px !important;
            }
            .podcore-tutorial-hub h2,
            .podcore-single-tutorial h2,
            .podcore-tutorial-single h2 {
                font-size: 22px !important;
            }
            .podcore-tutorial-step {
                overflow-wrap: anywhere;
            }
        }
    </style>
    <?php
}
add_action('wp_head', 'podcore_tutorial_mobile_styles', 20);
