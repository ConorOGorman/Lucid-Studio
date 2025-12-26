<?php

declare(strict_types=1);

function lucid_hatamex_clone_theme_enqueue_assets(): void {
	$theme_uri = get_template_directory_uri();

	wp_enqueue_style(
		'lucid-hatamex-reference',
		$theme_uri . '/assets/css/reference.css',
		array(),
		'0.1.0'
	);

	wp_enqueue_style(
		'lucid-hatamex-keen',
		$theme_uri . '/assets/css/keen.css',
		array( 'lucid-hatamex-reference' ),
		'0.1.0'
	);

	wp_enqueue_style(
		'lucid-hatamex-wp-overrides',
		$theme_uri . '/assets/css/wp-overrides.css',
		array( 'lucid-hatamex-keen' ),
		'0.1.0'
	);

	wp_enqueue_script(
		'lucid-hatamex-main',
		$theme_uri . '/assets/js/main.js',
		array(),
		'0.1.0',
		true
	);
}
add_action( 'wp_enqueue_scripts', 'lucid_hatamex_clone_theme_enqueue_assets' );
