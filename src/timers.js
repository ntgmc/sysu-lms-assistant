export function captureNativeTimers(targetWindow) {
    return Object.freeze({
        setTimeout: targetWindow.setTimeout.bind(targetWindow),
        setInterval: targetWindow.setInterval.bind(targetWindow),
        clearTimeout: targetWindow.clearTimeout.bind(targetWindow),
        clearInterval: targetWindow.clearInterval.bind(targetWindow)
    });
}

export function createTimerProxy(original, name, getSpeedFactor, minimumDelay) {
    const proxy = function(handler, delay, ...args) {
        const adjustedDelay = typeof delay === 'number' && delay > 0
            ? Math.max(delay / getSpeedFactor(), minimumDelay)
            : delay;
        return original(handler, adjustedDelay, ...args);
    };
    proxy.toString = () => original.toString();
    Object.defineProperty(proxy, 'name', { configurable: true, value: name });
    return proxy;
}

export function installTimerAcceleration({
    targetWindow,
    nativeTimers,
    resourcePath,
    enabled,
    getSpeedFactor,
    minimumDelay
}) {
    if (targetWindow.location.pathname !== resourcePath || !enabled) return false;
    targetWindow.setTimeout = createTimerProxy(
        nativeTimers.setTimeout,
        'setTimeout',
        getSpeedFactor,
        minimumDelay
    );
    targetWindow.setInterval = createTimerProxy(
        nativeTimers.setInterval,
        'setInterval',
        getSpeedFactor,
        minimumDelay
    );
    return true;
}
