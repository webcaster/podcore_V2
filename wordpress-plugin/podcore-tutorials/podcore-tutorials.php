<?php
/**
 * Plugin Name: PodCore Tutorial Hub
 * Plugin URI: https://github.com/webcaster/podcore_V2
 * Description: Zeigt PodCore-Tutorials mit Schritten, Screenshots und Annotationen auf einer WordPress-Seite an und bietet kompatible JSON-Downloads.
 * Version: 2.16.3
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
        <textarea id="podcore_tutorial_json" name="podcore_tutorial_json" rows="16" spellcheck="false" style="width:100%; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; line-height:1.5;"><?php echo esc_textarea($json_data); ?></textarea>
        <button type="button" class="button" id="podcore-format-json" style="margin-top:8px;">JSON formatieren</button>
        <span id="podcore-json-live-status" style="margin-left:8px; font-weight:600;"></span>
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
    <script>
    (function(){
        var field = document.getElementById('podcore_tutorial_json');
        var status = document.getElementById('podcore-json-live-status');
        var format = document.getElementById('podcore-format-json');
        if (!field || !status) return;
        function validate(){
            var raw = field.value.trim();
            if (!raw) { status.textContent = ''; return; }
            try {
                var data = JSON.parse(raw);
                if (data && data.data) data = data.data;
                if (data && data.tutorial) data = data.tutorial;
                var steps = data && Array.isArray(data.steps) ? data.steps : (Array.isArray(data) ? data : []);
                status.textContent = steps.length ? '✓ ' + steps.length + ' Schritte erkannt' : '⚠ Kein steps-Array gefunden';
                status.style.color = steps.length ? '#047857' : '#b45309';
            } catch (error) {
                status.textContent = '✕ Ungültiges JSON';
                status.style.color = '#b91c1c';
            }
        }
        field.addEventListener('input', validate);
        if (format) format.addEventListener('click', function(){
            try {
                field.value = JSON.stringify(JSON.parse(field.value), null, 2);
                validate();
            } catch (error) {
                status.textContent = '✕ Erst gültiges JSON einfügen';
                status.style.color = '#b91c1c';
            }
        });
        validate();
    }());
    </script>
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

function podcore_tutorial_diagnostics_menu() {
    add_submenu_page(
        'edit.php?post_type=podcore_tutorial',
        'PodCore Diagnose',
        'Diagnose',
        'manage_options',
        'podcore-tutorial-diagnostics',
        'podcore_tutorial_diagnostics_page'
    );
}
add_action('admin_menu', 'podcore_tutorial_diagnostics_menu');

function podcore_tutorial_diagnostics_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Keine Berechtigung.');
    }
    $posts = get_posts(array(
        'post_type' => 'podcore_tutorial',
        'post_status' => array('publish', 'draft', 'pending', 'private'),
        'posts_per_page' => -1,
        'orderby' => 'title',
        'order' => 'ASC',
    ));
    ?>
    <div class="wrap">
        <h1>PodCore Tutorial-Diagnose</h1>
        <p>Diese Prüfung zeigt, ob WordPress das JSON-Feld und das <code>steps</code>-Array erkennt. WordPress <?php echo esc_html(get_bloginfo('version')); ?> · Plugin 2.16.2.</p>
        <table class="widefat striped">
            <thead><tr><th>Tutorial</th><th>Status</th><th>JSON</th><th>Schritte</th><th>Aktion</th></tr></thead>
            <tbody>
            <?php if (empty($posts)) : ?>
                <tr><td colspan="5">Keine PodCore Tutorials gefunden.</td></tr>
            <?php else : foreach ($posts as $tutorial_post) :
                $raw = get_post_meta($tutorial_post->ID, '_podcore_tutorial_json', true);
                $decoded = podcore_tutorial_post_data($tutorial_post->ID);
                $steps = podcore_tutorial_steps($decoded);
                $json_ok = !empty($raw) && !empty($decoded);
                ?>
                <tr>
                    <td><strong><?php echo esc_html($tutorial_post->post_title); ?></strong><br><code><?php echo esc_html($tutorial_post->post_name); ?></code></td>
                    <td><?php echo esc_html($tutorial_post->post_status); ?></td>
                    <td><?php echo $json_ok ? '<span style="color:#047857;font-weight:700;">OK</span>' : '<span style="color:#b91c1c;font-weight:700;">Fehlt/ungültig</span>'; ?></td>
                    <td><?php echo esc_html(count($steps)); ?></td>
                    <td><a class="button" href="<?php echo esc_url(get_edit_post_link($tutorial_post->ID)); ?>">Bearbeiten</a> <a class="button" href="<?php echo esc_url(get_permalink($tutorial_post->ID)); ?>" target="_blank" rel="noopener">Frontend</a></td>
                </tr>
            <?php endforeach; endif; ?>
            </tbody>
        </table>
        <div style="margin-top:20px;padding:14px;background:#f0f6fc;border-left:4px solid #2271b1;">
            <strong>WPBakery/The7-Hinweis:</strong> Verwende auf der Seite das native WPBakery-Element <strong>PodCore Tutorial</strong> mit dem Slug des veröffentlichten Tutorials. Für den Text-Block funktioniert <code>[podcore_tutorial slug="erste-schritte"]</code>.
        </div>
    </div>
    <?php
}

function podcore_tutorial_decode($json_raw) {
    if (is_array($json_raw)) {
        $decoded = $json_raw;
    } elseif (is_string($json_raw) && trim($json_raw) !== '') {
        $clean = trim(wp_strip_all_tags($json_raw));
        $clean = preg_replace('/^\\xEF\\xBB\\xBF/', '', $clean);
        $clean = html_entity_decode($clean, ENT_QUOTES, get_bloginfo('charset') ?: 'UTF-8');
        $clean = preg_replace('/^```(?:json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', trim($clean));
        $decoded = json_decode(trim($clean), true);

        // Repariert JSON, das von Editoren mit zusätzlichem Text umgeben wurde.
        if (!is_array($decoded)) {
            $starts = array(strpos($clean, '{'), strpos($clean, '['));
            $starts = array_values(array_filter($starts, function ($value) { return $value !== false; }));
            if (!empty($starts)) {
                $start = min($starts);
                $end_object = strrpos($clean, '}');
                $end_array = strrpos($clean, ']');
                $end = max($end_object === false ? -1 : $end_object, $end_array === false ? -1 : $end_array);
                if ($end > $start) {
                    $decoded = json_decode(substr($clean, $start, $end - $start + 1), true);
                }
            }
        }
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

/**
 * Öffentliche Tutorial-Cloud-API für PodCore-Installationen.
 * Es werden ausschließlich veröffentlichte podcore_tutorial-Beiträge ausgeliefert.
 */
define('PODCORE_TUTORIAL_VERSION', '2.16.2');
define('PODCORE_TUTORIAL_REST_NAMESPACE', 'app-tutorials/v1');

function podcore_tutorial_rest_roles($post_id, $decoded) {
    $roles = isset($decoded['roles']) && is_array($decoded['roles']) ? $decoded['roles'] : array();
    if (empty($roles)) {
        $roles_raw = get_post_meta($post_id, '_podcore_tutorial_roles', true);
        $roles = array_filter(array_map('trim', explode(',', (string) $roles_raw)));
    }
    $roles = array_values(array_filter(array_map('sanitize_text_field', $roles)));
    return !empty($roles) ? $roles : array('*');
}

function podcore_tutorial_rest_step($step, $index) {
    if (!is_array($step)) {
        return array(
            'id' => 'cloud-step-' . ($index + 1),
            'title' => 'Schritt ' . ($index + 1),
            'description' => '',
        );
    }
    $image = podcore_tutorial_image($step);
    $result = array(
        'id' => sanitize_key($step['id'] ?? ('cloud-step-' . ($index + 1))),
        'title' => sanitize_text_field($step['title'] ?? ($step['name'] ?? ('Schritt ' . ($index + 1)))),
        'description' => wp_strip_all_tags(podcore_tutorial_step_text($step)),
        'target' => isset($step['target']) ? sanitize_text_field($step['target']) : '',
        'position' => isset($step['position']) && in_array($step['position'], array('top', 'bottom', 'left', 'right'), true) ? $step['position'] : '',
        'image' => $image,
        'annotations' => isset($step['annotations']) && is_array($step['annotations']) ? array_values($step['annotations']) : array(),
        'highlightColor' => isset($step['highlightColor']) ? sanitize_text_field($step['highlightColor']) : '',
        'allowSkip' => isset($step['allowSkip']) ? (bool) $step['allowSkip'] : true,
        'action' => isset($step['action']) ? sanitize_text_field($step['action']) : '',
    );
    return $result;
}

function podcore_tutorial_rest_topics($decoded) {
    $topics = array();
    foreach (array('category', 'topic', 'group', 'section') as $key) {
        if (empty($decoded[$key])) continue;
        $values = is_array($decoded[$key]) ? $decoded[$key] : array($decoded[$key]);
        foreach ($values as $value) {
            $name = sanitize_text_field((string) $value);
            if ($name !== '') $topics[] = array('slug' => sanitize_title($name), 'name' => $name);
        }
    }
    return $topics;
}

function podcore_tutorial_rest_serialize($post) {
    $post_id = (int) $post->ID;
    $decoded = podcore_tutorial_post_data($post_id);
    $raw_steps = podcore_tutorial_steps($decoded);
    $steps = array();
    $screenshots = array();
    foreach (array_slice($raw_steps, 0, 200) as $index => $step) {
        $normalized = podcore_tutorial_rest_step($step, $index);
        $steps[] = $normalized;
        if (!empty($normalized['image'])) {
            $screenshots[] = array('step' => $index + 1, 'url' => esc_url_raw($normalized['image']));
        }
    }
    $description = !empty($decoded['description']) ? wp_strip_all_tags((string) $decoded['description']) : wp_strip_all_tags(get_post_field('post_excerpt', $post_id));
    if ($description === '') $description = wp_strip_all_tags(get_post_field('post_content', $post_id));
    $version = !empty($decoded['version']) ? sanitize_text_field((string) $decoded['version']) : PODCORE_TUTORIAL_VERSION;
    return array(
        'id' => $post_id,
        'slug' => $post->post_name,
        'title' => get_the_title($post_id),
        'description' => $description,
        'content' => apply_filters('the_content', get_post_field('post_content', $post_id)),
        'topics' => podcore_tutorial_rest_topics($decoded),
        'roles' => podcore_tutorial_rest_roles($post_id, $decoded),
        'steps' => $steps,
        'screenshots' => $screenshots,
        'featuredImage' => get_the_post_thumbnail_url($post_id, 'large') ?: null,
        'downloadUrl' => esc_url_raw(add_query_arg('download_podcore_tutorial', $post_id, get_permalink($post_id))),
        'updatedAt' => get_post_field('post_modified_gmt', $post_id),
        'version' => $version,
        'source' => 'podcore.de',
        'formatVersion' => '1.0',
    );
}

function podcore_tutorial_rest_register_routes() {
    register_rest_route(PODCORE_TUTORIAL_REST_NAMESPACE, '/tutorials', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'podcore_tutorial_rest_list',
        'permission_callback' => '__return_true',
        'args' => array(
            'page' => array('default' => 1, 'sanitize_callback' => 'absint'),
            'per_page' => array('default' => 50, 'sanitize_callback' => 'absint'),
            'search' => array('default' => '', 'sanitize_callback' => 'sanitize_text_field'),
            'topic' => array('default' => '', 'sanitize_callback' => 'sanitize_title'),
        ),
    ));
    register_rest_route(PODCORE_TUTORIAL_REST_NAMESPACE, '/tutorials/(?P<slug>[a-zA-Z0-9-]+)', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'podcore_tutorial_rest_get',
        'permission_callback' => '__return_true',
        'args' => array('slug' => array('sanitize_callback' => 'sanitize_title')),
    ));
}
add_action('rest_api_init', 'podcore_tutorial_rest_register_routes');

function podcore_tutorial_rest_list(WP_REST_Request $request) {
    $page = max(1, (int) $request->get_param('page'));
    $per_page = min(100, max(1, (int) $request->get_param('per_page')));
    $search = sanitize_text_field((string) $request->get_param('search'));
    $topic = sanitize_title((string) $request->get_param('topic'));
    $query = new WP_Query(array(
        'post_type' => 'podcore_tutorial',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'orderby' => 'modified',
        'order' => 'DESC',
        's' => $search,
    ));
    $items = array_map('podcore_tutorial_rest_serialize', $query->posts);
    if ($topic !== '') {
        $items = array_values(array_filter($items, function ($item) use ($topic) {
            foreach ($item['topics'] as $entry) if ($entry['slug'] === $topic) return true;
            return false;
        }));
    }
    $total = count($items);
    $offset = ($page - 1) * $per_page;
    $items = array_slice($items, $offset, $per_page);
    return rest_ensure_response(array(
        'formatVersion' => '1.0',
        'items' => $items,
        'page' => $page,
        'perPage' => $per_page,
        'total' => $total,
        'totalPages' => $total > 0 ? (int) ceil($total / $per_page) : 0,
        'updatedAt' => gmdate('c'),
    ));
}

function podcore_tutorial_rest_get(WP_REST_Request $request) {
    $slug = sanitize_title((string) $request->get_param('slug'));
    $post = get_page_by_path($slug, OBJECT, 'podcore_tutorial');
    if (!$post || $post->post_status !== 'publish') {
        return new WP_Error('podcore_tutorial_not_found', 'Tutorial nicht gefunden.', array('status' => 404));
    }
    return rest_ensure_response(podcore_tutorial_rest_serialize($post));
}

function podcore_tutorial_image($step) {
    if (!is_array($step)) {
        return '';
    }
    foreach (array('screenshotUrl', 'imageUrl', 'screenshot', 'image', 'imageData') as $key) {
        if (!empty($step[$key]) && is_string($step[$key])) {
            $candidate = trim($step[$key]);
            if (preg_match('/^data:image\/(?:png|jpe?g|gif|webp);base64,/i', $candidate) || preg_match('/^(?:https?:)?\/\//i', $candidate) || strpos($candidate, '/') === 0) {
                return $candidate;
            }
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
    <div class="podcore-tutorial-hub" data-podcore-hub>
        <header class="podcore-hub-header">
            <div>
                <span class="podcore-eyebrow">PODCORE KNOWLEDGE BASE</span>
                <h2>PodCore Tutorial-Wissensbasis</h2>
                <p>Alle Anleitungen mit Schritten, Screenshots und kompatiblen Downloads.</p>
            </div>
            <div class="podcore-hub-mark" aria-hidden="true">?</div>
        </header>

        <?php if ($query->have_posts()) :
            $available_roles = array();
            foreach ($query->posts as $role_post) {
                $role_value = get_post_meta($role_post->ID, '_podcore_tutorial_roles', true);
                foreach (array_filter(array_map('trim', explode(',', (string) $role_value))) as $role_name) {
                    $available_roles[$role_name] = $role_name;
                }
            }
            ksort($available_roles);
        ?>
            <div class="podcore-hub-tools" role="search">
                <label class="podcore-sr-only" for="podcore-tutorial-search">Tutorials durchsuchen</label>
                <input class="podcore-tutorial-search" id="podcore-tutorial-search" type="search" placeholder="Tutorials durchsuchen …" autocomplete="off" />
                <label class="podcore-sr-only" for="podcore-tutorial-role">Nach Rolle filtern</label>
                <select class="podcore-tutorial-role" id="podcore-tutorial-role">
                    <option value="">Alle Rollen</option>
                    <?php foreach ($available_roles as $role_name) : ?>
                        <option value="<?php echo esc_attr(strtolower($role_name)); ?>"><?php echo esc_html($role_name); ?></option>
                    <?php endforeach; ?>
                </select>
                <span class="podcore-hub-count" aria-live="polite"><?php echo esc_html(count($query->posts)); ?> Tutorials</span>
            </div>
            <div class="podcore-tutorial-grid">
                <?php while ($query->have_posts()) : $query->the_post();
                    $post_id = get_the_ID();
                    $decoded = podcore_tutorial_post_data($post_id);
                    $steps = podcore_tutorial_steps($decoded);
                    $roles = get_post_meta($post_id, '_podcore_tutorial_roles', true);
                    $description = get_the_content();
                    if (trim(wp_strip_all_tags($description)) === '' && !empty($decoded['description'])) {
                        $description = $decoded['description'];
                    }
                    $title = get_the_title();
                    $search_text = strtolower($title . ' ' . $roles . ' ' . wp_strip_all_tags($description));
                    $download_url = add_query_arg('download_podcore_tutorial', $post_id, get_permalink());
                    ?>
                    <article class="podcore-tutorial-card" data-tutorial-card data-search="<?php echo esc_attr($search_text); ?>" data-roles="<?php echo esc_attr(strtolower($roles)); ?>">
                        <div class="podcore-card-topline"><span class="podcore-card-icon" aria-hidden="true">▣</span><span><?php echo esc_html(count($steps)); ?> Schritte</span></div>
                        <div class="podcore-card-heading">
                            <h3><?php echo esc_html($title); ?></h3>
                            <?php if ($roles) : ?><span class="podcore-role-badge"><?php echo esc_html($roles); ?></span><?php endif; ?>
                        </div>
                        <?php if (trim(wp_strip_all_tags($description)) !== '') : ?>
                            <div class="podcore-card-description"><?php echo wpautop(esc_html(wp_strip_all_tags($description))); ?></div>
                        <?php endif; ?>
                        <?php if (!empty($steps)) : ?>
                            <details class="podcore-card-steps">
                                <summary>Schritte anzeigen</summary>
                                <div class="podcore-card-step-list">
                                    <?php foreach ($steps as $index => $step) podcore_tutorial_render_step($step, $index); ?>
                                </div>
                            </details>
                        <?php else : ?>
                            <p class="podcore-card-warning">Keine gültigen Schritte gefunden. Bitte den vollständigen JSON-Export speichern.</p>
                        <?php endif; ?>
                        <a class="podcore-download-button" href="<?php echo esc_url($download_url); ?>">Tutorial herunterladen <span aria-hidden="true">↓</span></a>
                    </article>
                <?php endwhile; wp_reset_postdata(); ?>
            </div>
            <p class="podcore-hub-empty" data-empty-state hidden>Keine Tutorials passen zu deiner Suche.</p>
        <?php else : ?>
            <p class="podcore-hub-empty">Aktuell sind keine veröffentlichten Tutorials vorhanden. Lege unter „PodCore Tutorials“ einen Beitrag an und klicke auf „Veröffentlichen“.</p>
        <?php endif; ?>
    </div>
    <?php if ($query->have_posts() || !empty($available_roles)) : ?>
    <script>
    (function(){
        document.querySelectorAll('[data-podcore-hub]').forEach(function(hub){
            var input = hub.querySelector('.podcore-tutorial-search');
            var role = hub.querySelector('.podcore-tutorial-role');
            var cards = Array.prototype.slice.call(hub.querySelectorAll('[data-tutorial-card]'));
            var empty = hub.querySelector('[data-empty-state]');
            var count = hub.querySelector('.podcore-hub-count');
            function filter(){
                var query = (input ? input.value : '').toLowerCase().trim();
                var selected = (role ? role.value : '').toLowerCase();
                var visible = 0;
                cards.forEach(function(card){
                    var matchesText = !query || (card.getAttribute('data-search') || '').indexOf(query) !== -1;
                    var matchesRole = !selected || (card.getAttribute('data-roles') || '').indexOf(selected) !== -1;
                    var show = matchesText && matchesRole;
                    card.hidden = !show;
                    if (show) visible++;
                });
                if (empty) empty.hidden = visible !== 0;
                if (count) count.textContent = visible + (visible === 1 ? ' Tutorial' : ' Tutorials');
            }
            if (input) input.addEventListener('input', filter);
            if (role) role.addEventListener('change', filter);
        });
    }());
    </script>
    <?php endif; ?>
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
add_shortcode('podcore_tutorial', 'podcore_single_tutorial_shortcode');

/**
 * Native WPBakery-Integration für The7.
 * Das Element erzeugt den vorhandenen PodCore-Shortcode, sodass es auch dann
 * funktioniert, wenn das Theme den normalen Inhalt anders rendert.
 */
function podcore_tutorial_register_wpbakery_element() {
    if (!function_exists('vc_map')) {
        return;
    }

    vc_map(array(
        'name'        => 'PodCore Tutorial',
        'base'        => 'podcore_tutorial',
        'icon'        => 'dashicons dashicons-book-alt',
        'category'    => 'PodCore',
        'description' => 'Zeigt ein PodCore-Tutorial mit Schritten, Screenshots und Download an.',
        'params'      => array(
            array(
                'type'        => 'textfield',
                'heading'     => 'Tutorial-Slug',
                'param_name'  => 'slug',
                'description' => 'Zum Beispiel: erste-schritte',
                'admin_label' => true,
            ),
            array(
                'type'        => 'textfield',
                'heading'     => 'Tutorial-ID',
                'param_name'  => 'id',
                'description' => 'Optional. Die ID hat Vorrang vor dem Slug.',
                'admin_label' => true,
            ),
        ),
    ));
}
add_action('vc_before_init', 'podcore_tutorial_register_wpbakery_element');

/**
 * WordPress und manche mobile Editoren ersetzen gerade Anführungszeichen durch
 * typografische Quotes. Diese werden vor der normalen Shortcode-Verarbeitung
 * nur innerhalb des PodCore-Shortcodes wieder in ASCII-Quotes umgewandelt.
 */
function podcore_normalize_shortcode_quotes($content) {
    if (!is_string($content) || strpos($content, 'podcore_') === false) {
        return $content;
    }

    $content = preg_replace_callback(
        '/\[(podcore_(?:single_tutorial|tutorial))([^\]]*)\]/iu',
        function ($match) {
            $attributes = str_replace(
                array('“', '”', '„', '«', '»', '＂'),
                '"',
                $match[2]
            );
            return '[' . $match[1] . $attributes . ']';
        },
        $content
    );

    return $content;
}
add_filter('the_content', 'podcore_normalize_shortcode_quotes', 10);
add_filter('widget_text_content', 'podcore_normalize_shortcode_quotes', 10);

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
add_action('wp_body_open', 'podcore_tutorial_force_render_footer', 1);
add_action('wp_footer', 'podcore_tutorial_force_render_footer', 20);

function podcore_tutorial_mobile_styles() {
    if (is_admin()) return;
    ?>
    <style id="podcore-tutorial-mobile-styles">
        .podcore-tutorial-hub {
            --podcore-accent: #7c3aed;
            --podcore-accent-dark: #5b21b6;
            --podcore-surface: #ffffff;
            --podcore-soft: #f8fafc;
            --podcore-border: #e2e8f0;
            --podcore-text: #0f172a;
            --podcore-muted: #64748b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: var(--podcore-text);
            max-width: 1180px;
            margin: 0 auto;
            padding: clamp(16px, 3vw, 34px);
        }
        .podcore-hub-header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:20px;
            padding:clamp(22px, 4vw, 40px);
            margin-bottom:20px;
            border-radius:22px;
            color:#fff;
            background:linear-gradient(135deg, #27134d 0%, #5b21b6 55%, #7c3aed 100%);
            box-shadow:0 18px 40px rgba(91,33,182,.22);
        }
        .podcore-hub-header h2 { margin:4px 0 8px; color:#fff; font-size:clamp(24px, 4vw, 36px); line-height:1.15; }
        .podcore-hub-header p { margin:0; color:rgba(255,255,255,.78); font-size:15px; }
        .podcore-eyebrow { font-size:11px; letter-spacing:.14em; font-weight:800; color:#ddd6fe; }
        .podcore-hub-mark { display:grid; place-items:center; flex:0 0 52px; width:52px; height:52px; border:1px solid rgba(255,255,255,.35); border-radius:16px; color:#fff; font-size:28px; font-weight:800; }
        .podcore-hub-tools { display:grid; grid-template-columns:minmax(180px,1fr) minmax(150px,220px) auto; align-items:center; gap:12px; margin:0 0 24px; }
        .podcore-tutorial-search, .podcore-tutorial-role { width:100%; min-height:46px; box-sizing:border-box; padding:0 14px; border:1px solid var(--podcore-border); border-radius:12px; background:var(--podcore-surface); color:var(--podcore-text); font:inherit; }
        .podcore-tutorial-search:focus, .podcore-tutorial-role:focus { outline:3px solid rgba(124,58,237,.18); border-color:var(--podcore-accent); }
        .podcore-hub-count { justify-self:end; color:var(--podcore-muted); font-size:13px; font-weight:700; white-space:nowrap; }
        .podcore-tutorial-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr)); gap:20px; }
        .podcore-tutorial-card { display:flex; flex-direction:column; min-width:0; padding:22px; border:1px solid var(--podcore-border); border-radius:18px; background:var(--podcore-surface); box-shadow:0 8px 24px rgba(15,23,42,.06); transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .podcore-tutorial-card:hover { transform:translateY(-3px); border-color:rgba(124,58,237,.45); box-shadow:0 16px 32px rgba(91,33,182,.13); }
        .podcore-card-topline { display:flex; align-items:center; gap:8px; color:var(--podcore-muted); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .podcore-card-icon { display:grid; place-items:center; width:26px; height:26px; border-radius:8px; background:#ede9fe; color:var(--podcore-accent); }
        .podcore-card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:14px 0 10px; }
        .podcore-card-heading h3 { margin:0; color:var(--podcore-text); font-size:21px; line-height:1.25; }
        .podcore-role-badge { flex:0 0 auto; padding:5px 8px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:11px; line-height:1.2; }
        .podcore-card-description { color:var(--podcore-muted); font-size:14px; line-height:1.65; margin-bottom:14px; }
        .podcore-card-description p { margin:0 0 8px; }
        .podcore-card-steps { margin-top:auto; border-top:1px solid var(--podcore-border); }
        .podcore-card-steps summary { cursor:pointer; padding:14px 0; color:var(--podcore-accent-dark); font-size:14px; font-weight:800; list-style-position:inside; }
        .podcore-card-step-list { max-height:560px; overflow:auto; padding-right:3px; }
        .podcore-card-step-list .podcore-tutorial-step { padding-top:14px !important; margin-top:14px !important; }
        .podcore-download-button { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:18px; padding:12px 15px; border-radius:11px; color:#fff !important; background:linear-gradient(135deg,#7c3aed,#5b21b6); text-decoration:none !important; font-size:14px; font-weight:800; transition:filter .18s ease, transform .18s ease; }
        .podcore-download-button:hover { filter:brightness(1.08); transform:translateY(-1px); }
        .podcore-card-warning, .podcore-hub-empty { padding:13px; border-radius:11px; background:#fffbeb; border:1px solid #fde68a; color:#92400e; font-size:13px; line-height:1.5; }
        .podcore-hub-empty[hidden] { display:none; }
        .podcore-sr-only { position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
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
        @media (prefers-color-scheme: dark) {
            .podcore-tutorial-hub {
                --podcore-surface:#111827;
                --podcore-soft:#1f2937;
                --podcore-border:#374151;
                --podcore-text:#f8fafc;
                --podcore-muted:#cbd5e1;
            }
            .podcore-tutorial-hub .podcore-tutorial-search,
            .podcore-tutorial-hub .podcore-tutorial-role { color:var(--podcore-text); background:var(--podcore-surface); border-color:var(--podcore-border); }
            .podcore-tutorial-hub .podcore-role-badge, .podcore-tutorial-hub .podcore-card-icon { background:#312e81; color:#ddd6fe; }
            .podcore-tutorial-hub .podcore-tutorial-step h4 { color:#f8fafc !important; }
            .podcore-tutorial-hub .podcore-tutorial-step div, .podcore-tutorial-hub .podcore-tutorial-step ol { color:#cbd5e1 !important; }
        }
        @media (max-width: 640px) {
            .podcore-hub-header { border-radius:16px; }
            .podcore-hub-tools { grid-template-columns:1fr; }
            .podcore-hub-count { justify-self:start; }
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
