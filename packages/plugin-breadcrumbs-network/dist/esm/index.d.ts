import type { JSClient } from "@appsignal/types";
declare type PluginOptions = {
    xhrEnabled: boolean;
    fetchEnabled: boolean;
    ignoreUrls: RegExp[];
};
declare function networkBreadcrumbsPlugin(options?: Partial<PluginOptions>): (this: JSClient) => void;
export declare const plugin: typeof networkBreadcrumbsPlugin;
export {};
//# sourceMappingURL=index.d.ts.map