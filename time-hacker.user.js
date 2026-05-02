// ==UserScript==
// @name         time-hacker
// @namespace    Violentmonkey Scripts
// @match        https://lms.sysu.edu.cn/mod/fsresource/view.php*
// @grant        none
// @version      1.2
// @author       Your Name
// @description  优化版：加速 setInterval 和 setTimeout，支持 document-start 注入，增加稳定性
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // === 配置区域 ===
    const SPEED_UP_FACTOR = 50; // 加速倍率
    const MIN_DELAY = 10;       // 最小延迟(ms)，防止浏览器卡死
    // ================

    const log = (msg) => console.log(`[TimerHook] ${msg}`);

    /**
     * 核心劫持函数
     * @param {Function} original 原函数
     * @param {string} name 函数名
     */
    function hookTimer(original, name) {
        const proxy = function(handler, delay, ...args) {
            let finalDelay = delay;

            // 如果 delay 是数字，则进行加速
            if (typeof delay === 'number' && delay > 0) {
                finalDelay = Math.max(delay / SPEED_UP_FACTOR, MIN_DELAY);
                // 只有当延迟较大时才打印日志，避免刷屏
                if (delay > 500) {
                    log(`${name} 劫持: ${delay}ms -> ${Math.floor(finalDelay)}ms`);
                }
            }

            return original(handler, finalDelay, ...args);
        };

        // 简单的防检测：还原 toString
        proxy.toString = () => original.toString();
        return proxy;
    }

    // 劫持 setInterval
    window.setInterval = hookTimer(window.setInterval, 'setInterval');

    // 劫持 setTimeout (很多插件用这个递归)
    window.setTimeout = hookTimer(window.setTimeout, 'setTimeout');

    // 额外优化：解决“失去焦点暂停”的问题
    // 很多学习平台会在切换标签页时停止计时，通过覆盖 visibilityState 解决
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });

    log("定时器加速脚本已注入，当前倍率: " + SPEED_UP_FACTOR);

})();
