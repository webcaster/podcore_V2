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
    if (!is_string($json_raw) || trim($json_raw) === '') {
        return array();
    }
    $decoded = json_decode($json_raw, true);
    return is_array($decoded) ? $decoded : array();
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
                    $decoded = podcore_tutorial_decode(get_post_meta($post_id, '_podcore_tutorial_json', true));
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
