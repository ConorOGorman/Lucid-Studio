import type { SupportedPHPVersion, EmscriptenOptions, PHPLoaderModule } from '@php-wasm/universal';
import type { TCPOverFetchOptions } from './tcp-over-fetch-websocket';
export interface LoaderOptions {
    emscriptenOptions?: EmscriptenOptions;
    onPhpLoaderModuleLoaded?: (module: PHPLoaderModule) => void;
    tcpOverFetch?: TCPOverFetchOptions;
    withIntl?: boolean;
}
export declare function loadWebRuntime(phpVersion: SupportedPHPVersion, loaderOptions?: LoaderOptions): Promise<number>;
