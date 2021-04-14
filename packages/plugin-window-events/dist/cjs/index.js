"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = void 0;
function windowEventsPlugin(options) {
    var ctx = window;
    var opts = __assign({ onerror: true, onunhandledrejection: true }, options);
    return function () {
        var _a, _b;
        var self = this;
        var prev = {
            onError: ctx.onerror,
            unhandledRejection: ctx.onunhandledrejection
        };
        function _onErrorHandler(event, source, lineno, colno, error) {
            var span = self.createSpan();
            if (typeof event === "string" &&
                lineno === 0 &&
                /Script error\.?/.test(event)) {
                console.warn("[APPSIGNAL]: Cross-domain or eval script error detected, error ignored");
            }
            else {
                if (error) {
                    span.setError(error);
                }
                else {
                    span.setError({
                        name: "Error",
                        message: typeof event === "string"
                            ? event
                            : 'An HTML onerror="" handler failed to execute',
                        stack: "at " + source + ":" + lineno + (colno ? ":" + colno : "")
                    });
                }
                self.send(span);
            }
            if (typeof prev.onError === "function") {
                prev.onError.apply(this, arguments);
            }
        }
        function _onUnhandledRejectionHandler(error) {
            var _a;
            var span = self.createSpan();
            span.setError({
                name: "UnhandledPromiseRejectionError",
                message: error && typeof error.reason === "string"
                    ? error.reason
                    : JSON.stringify(error === null || error === void 0 ? void 0 : error.reason),
                stack: ((_a = error === null || error === void 0 ? void 0 : error.reason) === null || _a === void 0 ? void 0 : _a.stack) || "No stacktrace available"
            });
            self.send(span);
            if (typeof prev.unhandledRejection === "function") {
                prev.unhandledRejection.apply(this, arguments);
            }
        }
        if (opts.onerror && ((_a = Object.getOwnPropertyDescriptor(ctx, 'onerror')) === null || _a === void 0 ? void 0 : _a.set)) {
            ctx.onerror = _onErrorHandler;
        }
        if (opts.onunhandledrejection && ((_b = Object.getOwnPropertyDescriptor(ctx, 'onunhandledrejection')) === null || _b === void 0 ? void 0 : _b.set)) {
            ctx.onunhandledrejection = _onUnhandledRejectionHandler;
        }
    };
}
exports.plugin = windowEventsPlugin;
//# sourceMappingURL=index.js.map