<?php
/**
 * Plugin Name: PodCore Tutorial Hub
 * Plugin URI: https://github.com/webcaster/podcore_V2
 * Description: Bietet Endnutzern die Möglichkeit, PodCore-Tutorials direkt auf der Webseite anzusehen (inklusive Screenshots & Annotationen), als JSON herunterzuladen und in ihr PodCore-System zu importieren.
 * Version: 2.15.10
 * Author: PodCore / Max
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

// 1. Custom Post Type für Tutorials registrieren
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
        'not_found_in_trash' => 'Keine Tutorials im Papierkorb gefunden'
    );

    $args = array(
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => true,
        'publicly_queryable'  => true,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-book-alt',
        'supports'            => array('title', 'editor', 'custom-fields', 'thumbnail'),
        'show_in_rest'        => true,
    );

    register_post_type('podcore_tutorial', $args);
}
add_action('init', 'podcore_tutorials_cpt');

// 2. Meta-Box für JSON-Daten & Rollen
function podcore_tutorial_add_meta_box() {
    add_meta_box(
        'podcore_tutorial_data_box',
        'PodCore Tutorial Export-Daten (JSON mit Screenshots & Schritten)',
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
        <label for="podcore_tutorial_json"><strong>Tutorial JSON-Struktur (enthält Schritte & Base64/URL-Screenshots):</strong></label><br>
        <textarea id="podcore_tutorial_json" name="podcore_tutorial_json" rows="12" style="width:100%; font-family:monospace;"><?php echo esc_textarea($json_data); ?></textarea>
    </p>
    <p class="description">Füge hier den Export-Code aus PodCore ein. Die in den Schritten enthaltenen Screenshots (Base64 oder URLs) werden im Frontend automatisch gerendert.</p>
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
        update_post_meta($post_id, '_podcore_tutorial_roles', sanitize_text_field($_POST['podcore_tutorial_roles']));
    }
}
add_action('save_post_podcore_tutorial', 'podcore_tutorial_save_meta');

// 3. Frontend Shortcode [podcore_tutorial_hub] mit Screenshot-Vorschau
function podcore_tutorials_shortcode($atts) {
    ob_start();
    
    // Handle Download request
    if (isset($_GET['download_podcore_tutorial']) && !empty($_GET['download_podcore_tutorial'])) {
        $post_id = intval($_GET['download_podcore_tutorial']);
        $post = get_post($post_id);
        if ($post && $post->post_type === 'podcore_tutorial') {
            $json = get_post_meta($post_id, '_podcore_tutorial_json', true);
            $roles_str = get_post_meta($post_id, '_podcore_tutorial_roles', true);
            $roles = array_map('trim', explode(',', $roles_str));
            
            $export_arr = array(
                'title' => $post->post_title,
                'description' => $post->post_content,
                'roles' => !empty($roles) ? $roles : array('admin'),
                'enabled' => true,
                'steps' => json_decode($json, true) ?: array()
            );

            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="podcore_tutorial_' . $post->post_name . '.json"');
            echo json_encode($export_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $args = array(
        'post_type'      => 'podcore_tutorial',
        'posts_per_page' => -1,
        'post_status'    => 'publish'
    );
    $query = new WP_Query($args);

    ?>
    <div class="podcore-tutorial-hub" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 1200px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h2 style="font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">PodCore Tutorial-Wissensbase</h2>
            <p style="font-size: 16px; color: #64748b;">Entdecke alle Schritte mit Screenshots, lade Tutorials herunter und importiere sie in dein System.</p>
        </div>

        <?php if ($query->have_posts()) : ?>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px;">
                <?php while ($query->have_posts()) : $query->the_post(); 
                    $roles = get_post_meta(get_the_ID(), '_podcore_tutorial_roles', true);
                    $json_raw = get_post_meta(get_the_ID(), '_podcore_tutorial_json', true);
                    $steps = json_decode($json_raw, true);
                    $download_url = add_query_arg('download_podcore_tutorial', get_the_ID(), get_permalink());
                ?>
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0;"><?php the_title(); ?></h3>
                                <?php if ($roles) : ?>
                                    <span style="background: #f1f5f9; color: #475569; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 500;"><?php echo esc_html($roles); ?></span>
                                <?php endif; ?>
                            </div>
                            <div style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 16px;">
                                <?php the_content(); ?>
                            </div>

                            <?php if (is_array($steps) && !empty(supports_steps_preview($steps))) : ?>
                                <div style="margin-bottom: 20px; border-top: 1px solid #f1f5f9; pt: 12px;">
                                    <p style="font-size: 12px; font-weight: 600; color: #64748b; margin: 12px 0 8px 0;">Schritte & Screenshots:</p>
                                    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;">
                                        <?php foreach ($steps as $idx => $step) : 
                                            $img = isset($step['screenshotUrl']) ? $step['screenshotUrl'] : (isset($step['image']) ? $step['image'] : '');
                                            if (!empty($img)) :
                                        ?>
                                            <div style="flex: 0 0 90px; text-align: center;">
                                                <img src="<?php echo esc_attr($img); ?>" alt="Schritt <?php echo $idx+1; ?>" style="width: 90px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />
                                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">Schritt <?php echo $idx+1; ?></span>
                                            </div>
                                        <?php endif; endforeach; ?>
                                    </div>
                                </div>
                            <?php endif; ?>
                        </div>
                        <div>
                            <a href="<?php echo esc_url($download_url); ?>" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #7c3aed; color: #ffffff; font-weight: 600; padding: 10px 16px; border-radius: 8px; text-decoration: none; transition: background 0.2s;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Tutorial herunterladen (.json)
                            </a>
                        </div>
                    </div>
                <?php endwhile; wp_reset_postdata(); ?>
            </div>
        <?php else : ?>
            <p style="text-align: center; color: #64748b;">Aktuell sind keine Tutorials im System hinterlegt.</p>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}

function supports_steps_preview($steps) {
    foreach ($steps as $s) {
        if (!empty($s['screenshotUrl']) || !empty($s['image'])) return true;
    }
    return false;
}

add_shortcode('podcore_tutorial_hub', 'podcore_tutorials_shortcode');
