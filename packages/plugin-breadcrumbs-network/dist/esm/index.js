var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var DEFAULTS = {
    xhrEnabled: true,
    fetchEnabled: true,
    ignoreUrls: []
};
function networkBreadcrumbsPlugin(options) {
    var opts = __assign(__assign({}, DEFAULTS), options);
    var xhrEnabled = opts.xhrEnabled, fetchEnabled = opts.fetchEnabled, ignoreUrls = opts.ignoreUrls;
    var isXhrEnabled = xhrEnabled ? "XMLHttpRequest" in window : false;
    var isFetchEnabled = fetchEnabled ? "fetch" in window : false;
    return function () {
        var appsignal = this;
        var xhrPatch = function () {
            var prevOpen = XMLHttpRequest.prototype.open;
            function open(method, url) {
                var metadata = { method: method, url: url };
                function onXhrLoad() {
                    if (!ignoreUrls.some(function (el) { return el.test(url); })) {
                        appsignal.addBreadcrumb({
                            action: this.status >= 400
                                ? "Request failed with code " + this.status
                                : "Received a response with code " + this.status,
                            category: "XMLHttpRequest",
                            metadata: metadata
                        });
                    }
                }
                function onXhrError() {
                    if (!ignoreUrls.some(function (el) { return el.test(url); })) {
                        appsignal.addBreadcrumb({
                            action: "Request failed",
                            category: "XMLHttpRequest",
                            metadata: metadata
                        });
                    }
                }
                this.addEventListener("load", onXhrLoad);
                this.addEventListener("error", onXhrError);
                prevOpen.apply(this, arguments);
            }
            XMLHttpRequest.prototype.open = open;
        };
        var fetchPatch = function () {
            var originalFetch = window.fetch;
            function fetch(input, init) {
                var url = typeof input === "string" ? input : input.url;
                var method = (typeof input !== "string" && input.method) ||
                    (init && init.method) ||
                    "GET";
                var metadata = {
                    method: method,
                    url: url
                };
                if (ignoreUrls.some(function (el) { return el.test(url); })) {
                    return originalFetch.apply(window, arguments);
                }
                return originalFetch
                    .apply(window, arguments)
                    .then(function (response) {
                    var statusCode = response.status;
                    appsignal.addBreadcrumb({
                        action: "Received a response with code " + statusCode,
                        category: "Fetch",
                        metadata: metadata
                    });
                    return response;
                })
                    .catch(function (error) {
                    appsignal.addBreadcrumb({
                        action: "Request failed",
                        category: "Fetch",
                        metadata: __assign(__assign({}, metadata), { message: error.message, name: error.name })
                    });
                    throw error;
                });
            }
            window.fetch = fetch;
        };
        if (isXhrEnabled)
            xhrPatch();
        if (isFetchEnabled)
            fetchPatch();
    };
}
export var plugin = networkBreadcrumbsPlugin;
//# sourceMappingURL=index.js.map