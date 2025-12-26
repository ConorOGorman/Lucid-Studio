import type { SupportedPHPVersion } from '@php-wasm/universal';
/**
 * Returns the path to the intl extension for the specified PHP version.
 *
 * Each PHP version's intl extension is packaged separately. Install the
 * version-specific package you need:
 * - @php-wasm/web-8-5
 * - @php-wasm/web-8-4
 * - etc.
 */
export declare function getIntlExtensionModule(version?: SupportedPHPVersion): Promise<any>;
