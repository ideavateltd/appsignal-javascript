export function errorHandler(appsignal, Vue) {
    var _a;
    var version = (_a = Vue === null || Vue === void 0 ? void 0 : Vue.version) !== null && _a !== void 0 ? _a : "";
    return function (error, vm, info) {
        var componentOptions = vm === null || vm === void 0 ? void 0 : vm.$vnode.componentOptions;
        var span = appsignal.createSpan();
        span
            .setAction((componentOptions === null || componentOptions === void 0 ? void 0 : componentOptions.tag) || "[unknown Vue component]")
            .setTags({ framework: "Vue", info: info, version: version })
            .setError(error);
        appsignal.send(span);
        if (typeof console !== "undefined" && typeof console.error === "function") {
            console.error(error);
        }
    };
}
//# sourceMappingURL=index.js.map