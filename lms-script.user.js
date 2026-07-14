// ==UserScript==
// @name         中山大学 LMS 助手
// @namespace    https://github.com/ntgmc/sysu-lms-assistant
// @version      2.0.0
// @description  集成自动播放、自动下一页、进度修复、讨论页跳过与可选计时加速，并提供统一控制面板。
// @author       ntgmc
// @match        *://lms.sysu.edu.cn/*
// @homepage     https://github.com/ntgmc/sysu-lms-assistant
// @supportURL   https://github.com/ntgmc/sysu-lms-assistant/issues
// @grant        none
// @run-at       document-start
// @license      GPL-3.0 License
// ==/UserScript==

(function() {
    'use strict';

    const VERSION = '2.0.0';
    const INSTANCE_KEY = '__SYSU_LMS_ASSISTANT_V2__';
    const STORAGE_KEY = 'sysu_lms_assistant_settings_v2';
    const LEGACY_RUNNING_KEY = 'lms_script_running';
    const RESOURCE_PATH = '/mod/fsresource/view.php';
    const CHECK_INTERVAL = 1000;
    const DELAY_BEFORE_NEXT = 1000;
    const SKIP_FORUM_DELAY = 2000;
    const MIN_TIMER_DELAY = 10;
    const SPEED_FACTORS = Object.freeze([2, 5, 10, 25, 50]);

    if (window[INSTANCE_KEY]) return;

    const nativeTimers = Object.freeze({
        setTimeout: window.setTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        clearInterval: window.clearInterval.bind(window)
    });

    const runtime = {
        version: VERSION,
        accelerationInstalled: false,
        uiInitialized: false
    };
    window[INSTANCE_KEY] = runtime;

    const DEFAULT_SETTINGS = Object.freeze({
        assistantEnabled: true,
        autoPlay: true,
        autoNext: true,
        autoQuality: true,
        skipForum: true,
        timerAcceleration: false,
        speedFactor: 10,
        panelExpanded: false
    });
    const BOOLEAN_SETTING_KEYS = Object.freeze([
        'assistantEnabled',
        'autoPlay',
        'autoNext',
        'autoQuality',
        'skipForum',
        'timerAcceleration',
        'panelExpanded'
    ]);

    let settingsLoadIssue = false;
    let settings = loadSettings();
    if (!saveSettings(settings, true)) settingsLoadIssue = true;

    installTimerAcceleration();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        nativeTimers.setTimeout(initialize, 0);
    }

    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            settingsLoadIssue = true;
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch (error) {
            return false;
        }
    }

    function loadSettings() {
        const nextSettings = { ...DEFAULT_SETTINGS };
        const serialized = readStorage(STORAGE_KEY);

        if (serialized !== null) {
            try {
                const parsed = JSON.parse(serialized);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new TypeError('Settings must be an object.');
                }

                BOOLEAN_SETTING_KEYS.forEach((key) => {
                    if (typeof parsed[key] === 'boolean') {
                        nextSettings[key] = parsed[key];
                    }
                });

                if (SPEED_FACTORS.includes(parsed.speedFactor)) {
                    nextSettings.speedFactor = parsed.speedFactor;
                }
            } catch (error) {
                settingsLoadIssue = true;
            }
        } else {
            const legacyRunning = readStorage(LEGACY_RUNNING_KEY);
            if (legacyRunning !== null) {
                nextSettings.assistantEnabled = legacyRunning !== 'false';
            }
        }

        return nextSettings;
    }

    function saveSettings(nextSettings, syncLegacy = false) {
        const saved = writeStorage(STORAGE_KEY, JSON.stringify(nextSettings));
        const legacySaved = !syncLegacy || writeStorage(
            LEGACY_RUNNING_KEY,
            String(nextSettings.assistantEnabled)
        );
        return saved && legacySaved;
    }

    function installTimerAcceleration() {
        if (window.location.pathname !== RESOURCE_PATH || !settings.timerAcceleration) return;

        const createTimerProxy = (original, name) => {
            const proxy = function(handler, delay, ...args) {
                const adjustedDelay = typeof delay === 'number' && delay > 0
                    ? Math.max(delay / settings.speedFactor, MIN_TIMER_DELAY)
                    : delay;
                return original(handler, adjustedDelay, ...args);
            };

            proxy.toString = () => original.toString();
            Object.defineProperty(proxy, 'name', {
                configurable: true,
                value: name
            });
            return proxy;
        };

        window.setTimeout = createTimerProxy(nativeTimers.setTimeout, 'setTimeout');
        window.setInterval = createTimerProxy(nativeTimers.setInterval, 'setInterval');
        runtime.accelerationInstalled = true;
    }

    function initialize() {
        if (runtime.uiInitialized || !document.body) return;
        runtime.uiInitialized = true;

        let controller;
        const ui = createUI({
            getSettings: () => settings,
            onSettingChange: (key, value) => {
                const previousSettings = settings;
                settings = { ...settings, [key]: value };
                const saved = saveSettings(settings, key === 'assistantEnabled');

                if (!saved) {
                    settings = previousSettings;
                    ui.renderSettings();
                    ui.showToast(
                        'settings-save-error',
                        '设置保存失败，请检查浏览器的站点存储权限。',
                        { tone: 'error', duration: 5000 }
                    );
                    return false;
                }

                if (controller) controller.handleSettingChange(key);
                return true;
            },
            onAccelerationApply: (pendingAcceleration) => {
                const enabling = pendingAcceleration.timerAcceleration;
                const action = enabling ? '启用或调整计时加速' : '关闭计时加速';
                const warning = `${action}后需要刷新当前页面才能可靠生效。计时加速可能造成学习数据异常，并带来进度清零或账号风险。是否保存设置并立即刷新？`;

                if (!window.confirm(warning)) return false;

                const nextSettings = {
                    ...settings,
                    timerAcceleration: pendingAcceleration.timerAcceleration,
                    speedFactor: pendingAcceleration.speedFactor
                };

                if (!saveSettings(nextSettings)) {
                    ui.showToast(
                        'acceleration-save-error',
                        '加速设置保存失败，页面不会刷新。',
                        { tone: 'error', duration: 5000 }
                    );
                    return false;
                }

                settings = nextSettings;
                window.location.reload();
                return true;
            }
        });

        controller = createLmsController(ui);
        controller.start();

        if (settingsLoadIssue) {
            ui.showToast(
                'settings-recovered',
                '部分设置无法读取，已使用安全默认值。',
                { tone: 'warning', duration: 5000 }
            );
        } else if (settings.assistantEnabled) {
            ui.showToast('assistant-started', `LMS 助手 ${VERSION} 已启动。`);
        }
    }

    function createUI({ getSettings, onSettingChange, onAccelerationApply }) {
        const host = document.createElement('div');
        host.id = 'sysu-lms-assistant-root';
        host.style.cssText = [
            'position: fixed',
            'inset: 0',
            'z-index: 2147483000',
            'pointer-events: none'
        ].join(';');

        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                :host {
                    --sla-primary: #0f766e;
                    --sla-primary-hover: #115e59;
                    --sla-primary-soft: #ccfbf1;
                    --sla-surface: #ffffff;
                    --sla-surface-raised: #f8fafc;
                    --sla-text: #0f172a;
                    --sla-text-muted: #475569;
                    --sla-border: #cbd5e1;
                    --sla-warning: #92400e;
                    --sla-warning-bg: #fffbeb;
                    --sla-warning-border: #f59e0b;
                    --sla-error: #b91c1c;
                    --sla-error-bg: #fef2f2;
                    --sla-success: #047857;
                    --sla-shadow: 0 16px 40px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.1);
                    --sla-focus: #0d9488;
                    --sla-panel-z: 10;
                    --sla-toast-z: 20;
                    color-scheme: light dark;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                button,
                input,
                select {
                    font: inherit;
                }

                button,
                select,
                label {
                    -webkit-tap-highlight-color: transparent;
                }

                button:focus-visible,
                select:focus-visible,
                input:focus-visible + .switch-track {
                    outline: 3px solid color-mix(in srgb, var(--sla-focus) 45%, transparent);
                    outline-offset: 2px;
                }

                .assistant-shell {
                    position: fixed;
                    right: 16px;
                    bottom: 16px;
                    z-index: var(--sla-panel-z);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 10px;
                    width: min(320px, calc(100vw - 32px));
                    pointer-events: none;
                }

                .assistant-shell > * {
                    pointer-events: auto;
                }

                .panel {
                    width: 100%;
                    max-height: calc(100dvh - 86px);
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    border: 1px solid var(--sla-border);
                    border-radius: 16px;
                    background: var(--sla-surface);
                    color: var(--sla-text);
                    box-shadow: var(--sla-shadow);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(8px);
                    transition: opacity 180ms ease-out, transform 180ms ease-out, visibility 180ms;
                }

                .assistant-shell[data-expanded="true"] .panel {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                .panel-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 16px 16px 12px;
                    border-bottom: 1px solid var(--sla-border);
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .brand-icon {
                    display: grid;
                    flex: 0 0 36px;
                    place-items: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 11px;
                    background: var(--sla-primary-soft);
                    color: var(--sla-primary);
                }

                .brand-icon svg,
                .icon-button svg,
                .trigger-button svg {
                    width: 20px;
                    height: 20px;
                    fill: none;
                    stroke: currentColor;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    stroke-width: 2;
                }

                .brand-copy {
                    min-width: 0;
                }

                .brand-title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 700;
                    line-height: 1.35;
                }

                .brand-version {
                    margin: 2px 0 0;
                    color: var(--sla-text-muted);
                    font-size: 12px;
                    line-height: 1.35;
                }

                .icon-button {
                    display: grid;
                    flex: 0 0 44px;
                    place-items: center;
                    width: 44px;
                    height: 44px;
                    margin: -4px -6px 0 0;
                    border: 0;
                    border-radius: 10px;
                    background: transparent;
                    color: var(--sla-text-muted);
                    cursor: pointer;
                    transition: background-color 150ms ease-out, color 150ms ease-out;
                }

                .icon-button:hover {
                    background: var(--sla-surface-raised);
                    color: var(--sla-text);
                }

                .status-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 12px 16px 4px;
                    padding: 10px 12px;
                    border-radius: 11px;
                    background: var(--sla-surface-raised);
                }

                .status-indicator,
                .trigger-indicator {
                    flex: 0 0 9px;
                    width: 9px;
                    height: 9px;
                    border-radius: 999px;
                    background: var(--sla-primary);
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sla-primary) 16%, transparent);
                }

                [data-tone="paused"] .status-indicator,
                .trigger-button[data-tone="paused"] .trigger-indicator,
                [data-tone="warning"] .status-indicator,
                .trigger-button[data-tone="warning"] .trigger-indicator {
                    background: var(--sla-warning-border);
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sla-warning-border) 18%, transparent);
                }

                [data-tone="error"] .status-indicator,
                .trigger-button[data-tone="error"] .trigger-indicator {
                    background: var(--sla-error);
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sla-error) 16%, transparent);
                }

                [data-tone="complete"] .status-indicator,
                .trigger-button[data-tone="complete"] .trigger-indicator {
                    background: var(--sla-success);
                    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sla-success) 16%, transparent);
                }

                .status-copy {
                    min-width: 0;
                }

                .status-label {
                    margin: 0;
                    font-size: 13px;
                    font-weight: 650;
                    line-height: 1.4;
                }

                .status-action {
                    margin: 2px 0 0;
                    overflow-wrap: anywhere;
                    color: var(--sla-text-muted);
                    font-size: 12px;
                    line-height: 1.45;
                }

                .section {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--sla-border);
                }

                .section:last-of-type {
                    border-bottom: 0;
                }

                .section-title {
                    margin: 0 0 8px;
                    color: var(--sla-text-muted);
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    line-height: 1.4;
                    text-transform: uppercase;
                }

                .setting-row {
                    display: flex;
                    min-height: 44px;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    color: var(--sla-text);
                }

                .setting-copy {
                    min-width: 0;
                }

                .setting-name {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    line-height: 1.4;
                }

                .setting-help {
                    display: block;
                    margin-top: 2px;
                    color: var(--sla-text-muted);
                    font-size: 11px;
                    line-height: 1.4;
                }

                .switch-label {
                    position: relative;
                    display: inline-flex;
                    flex: 0 0 46px;
                    align-items: center;
                    width: 46px;
                    height: 44px;
                    cursor: pointer;
                }

                .switch-input {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    opacity: 0;
                }

                .switch-track {
                    position: relative;
                    width: 42px;
                    height: 24px;
                    border: 1px solid var(--sla-border);
                    border-radius: 999px;
                    background: var(--sla-border);
                    transition: background-color 150ms ease-out, border-color 150ms ease-out;
                }

                .switch-track::after {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #ffffff;
                    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.3);
                    content: "";
                    transition: transform 150ms ease-out;
                }

                .switch-input:checked + .switch-track {
                    border-color: var(--sla-primary);
                    background: var(--sla-primary);
                }

                .switch-input:checked + .switch-track::after {
                    transform: translateX(18px);
                }

                .warning-callout {
                    margin: 2px 0 8px;
                    padding: 10px 11px;
                    border: 1px solid var(--sla-warning-border);
                    border-radius: 10px;
                    background: var(--sla-warning-bg);
                    color: var(--sla-warning);
                    font-size: 11px;
                    line-height: 1.5;
                }

                .speed-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 116px;
                    align-items: center;
                    gap: 12px;
                    min-height: 44px;
                }

                .speed-select {
                    width: 100%;
                    min-height: 40px;
                    padding: 7px 30px 7px 10px;
                    border: 1px solid var(--sla-border);
                    border-radius: 9px;
                    background: var(--sla-surface);
                    color: var(--sla-text);
                    cursor: pointer;
                }

                .apply-button {
                    width: 100%;
                    min-height: 44px;
                    margin-top: 8px;
                    border: 1px solid var(--sla-primary);
                    border-radius: 10px;
                    background: var(--sla-primary);
                    color: #ffffff;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background-color 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out;
                }

                .apply-button:hover:not(:disabled) {
                    border-color: var(--sla-primary-hover);
                    background: var(--sla-primary-hover);
                }

                .apply-button:disabled {
                    cursor: default;
                    opacity: 0.45;
                }

                .page-note {
                    margin: 8px 0 0;
                    color: var(--sla-text-muted);
                    font-size: 11px;
                    line-height: 1.45;
                }

                .panel-footer {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 16px 13px;
                    color: var(--sla-text-muted);
                    font-size: 11px;
                    line-height: 1.4;
                }

                .trigger-button {
                    display: flex;
                    min-width: 178px;
                    min-height: 48px;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 0 14px;
                    border: 1px solid var(--sla-border);
                    border-radius: 999px;
                    background: var(--sla-surface);
                    color: var(--sla-text);
                    box-shadow: var(--sla-shadow);
                    cursor: pointer;
                    transition: background-color 150ms ease-out, border-color 150ms ease-out;
                }

                .trigger-button:hover {
                    border-color: var(--sla-primary);
                    background: var(--sla-surface-raised);
                }

                .trigger-copy {
                    display: flex;
                    min-width: 0;
                    align-items: center;
                    gap: 10px;
                }

                .trigger-text {
                    overflow: hidden;
                    font-size: 13px;
                    font-weight: 700;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .trigger-button svg {
                    flex: 0 0 18px;
                    width: 18px;
                    height: 18px;
                    transition: transform 180ms ease-out;
                }

                .assistant-shell[data-expanded="true"] .trigger-button svg {
                    transform: rotate(180deg);
                }

                .toasts {
                    position: fixed;
                    top: 16px;
                    left: 16px;
                    z-index: var(--sla-toast-z);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: min(340px, calc(100vw - 32px));
                    pointer-events: none;
                }

                .toast {
                    padding: 11px 13px;
                    border: 1px solid var(--sla-border);
                    border-left: 4px solid var(--sla-primary);
                    border-radius: 11px;
                    background: var(--sla-surface);
                    color: var(--sla-text);
                    box-shadow: var(--sla-shadow);
                    font-size: 13px;
                    line-height: 1.45;
                    opacity: 0;
                    transform: translateY(-6px);
                    transition: opacity 180ms ease-out, transform 180ms ease-out;
                }

                .toast[data-visible="true"] {
                    opacity: 1;
                    transform: translateY(0);
                }

                .toast[data-tone="warning"] {
                    border-left-color: var(--sla-warning-border);
                }

                .toast[data-tone="error"] {
                    border-left-color: var(--sla-error);
                }

                .toast[data-tone="success"] {
                    border-left-color: var(--sla-success);
                }

                @media (prefers-color-scheme: dark) {
                    :host {
                        --sla-primary: #5eead4;
                        --sla-primary-hover: #2dd4bf;
                        --sla-primary-soft: #134e4a;
                        --sla-surface: #111827;
                        --sla-surface-raised: #1f2937;
                        --sla-text: #f8fafc;
                        --sla-text-muted: #cbd5e1;
                        --sla-border: #475569;
                        --sla-warning: #fde68a;
                        --sla-warning-bg: #422006;
                        --sla-warning-border: #f59e0b;
                        --sla-error: #fca5a5;
                        --sla-error-bg: #450a0a;
                        --sla-success: #6ee7b7;
                        --sla-focus: #5eead4;
                        --sla-shadow: 0 18px 46px rgba(0, 0, 0, 0.42), 0 4px 14px rgba(0, 0, 0, 0.3);
                    }
                }

                @media (max-width: 480px) {
                    .assistant-shell {
                        right: 12px;
                        bottom: 12px;
                        width: calc(100vw - 24px);
                    }

                    .toasts {
                        top: 12px;
                        left: 12px;
                        width: calc(100vw - 24px);
                    }

                    .trigger-button {
                        min-width: 166px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    *,
                    *::before,
                    *::after {
                        scroll-behavior: auto !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            </style>

            <div class="toasts" id="toast-container" role="region" aria-label="LMS 助手通知" aria-live="polite"></div>

            <div class="assistant-shell" id="assistant-shell" data-expanded="false">
                <section class="panel" id="assistant-panel" aria-hidden="true" aria-label="LMS 助手控制面板">
                    <header class="panel-header">
                        <div class="brand">
                            <span class="brand-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M5 3h11a3 3 0 0 1 3 3v15l-7-4-7 4V3Z"></path><path d="m9 8 6 3-6 3V8Z"></path></svg>
                            </span>
                            <div class="brand-copy">
                                <h2 class="brand-title">中山大学 LMS 助手</h2>
                                <p class="brand-version">版本 ${VERSION}</p>
                            </div>
                        </div>
                        <button class="icon-button" id="close-panel" type="button" aria-label="收起控制面板">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"></path></svg>
                        </button>
                    </header>

                    <div class="status-card" id="status-card" data-tone="active">
                        <span class="status-indicator" aria-hidden="true"></span>
                        <div class="status-copy">
                            <p class="status-label" id="status-label">运行中</p>
                            <p class="status-action" id="status-action">正在检测当前页面</p>
                        </div>
                    </div>

                    <section class="section" aria-labelledby="master-section-title">
                        <h3 class="section-title" id="master-section-title">总控</h3>
                        <div class="setting-row">
                            <div class="setting-copy">
                                <label class="setting-name" for="assistant-enabled">启用 LMS 助手</label>
                                <span class="setting-help">暂停后仍可使用控制面板</span>
                            </div>
                            <label class="switch-label" aria-label="启用 LMS 助手">
                                <input class="switch-input" id="assistant-enabled" type="checkbox">
                                <span class="switch-track" aria-hidden="true"></span>
                            </label>
                        </div>
                    </section>

                    <section class="section" aria-labelledby="automation-section-title">
                        <h3 class="section-title" id="automation-section-title">自动化</h3>
                        <div class="setting-row">
                            <div class="setting-copy"><label class="setting-name" for="auto-play">自动播放与防暂停</label></div>
                            <label class="switch-label" aria-label="自动播放与防暂停"><input class="switch-input" id="auto-play" type="checkbox"><span class="switch-track" aria-hidden="true"></span></label>
                        </div>
                        <div class="setting-row">
                            <div class="setting-copy"><label class="setting-name" for="auto-next">完成后自动下一页</label></div>
                            <label class="switch-label" aria-label="完成后自动下一页"><input class="switch-input" id="auto-next" type="checkbox"><span class="switch-track" aria-hidden="true"></span></label>
                        </div>
                        <div class="setting-row">
                            <div class="setting-copy"><label class="setting-name" for="auto-quality">自动切换超清</label></div>
                            <label class="switch-label" aria-label="自动切换超清"><input class="switch-input" id="auto-quality" type="checkbox"><span class="switch-track" aria-hidden="true"></span></label>
                        </div>
                        <div class="setting-row">
                            <div class="setting-copy"><label class="setting-name" for="skip-forum">自动跳过讨论页</label></div>
                            <label class="switch-label" aria-label="自动跳过讨论页"><input class="switch-input" id="skip-forum" type="checkbox"><span class="switch-track" aria-hidden="true"></span></label>
                        </div>
                    </section>

                    <section class="section" aria-labelledby="acceleration-section-title">
                        <h3 class="section-title" id="acceleration-section-title">计时加速</h3>
                        <p class="warning-callout">计时加速可能产生异常学习数据，并带来进度清零或账号风险。请确认符合学校与平台规定后再使用。</p>
                        <div class="setting-row">
                            <div class="setting-copy">
                                <label class="setting-name" for="timer-acceleration">启用计时加速</label>
                                <span class="setting-help" id="acceleration-state-help"></span>
                            </div>
                            <label class="switch-label" aria-label="启用计时加速"><input class="switch-input" id="timer-acceleration" type="checkbox"><span class="switch-track" aria-hidden="true"></span></label>
                        </div>
                        <div class="speed-row">
                            <label class="setting-name" for="speed-factor">加速倍率</label>
                            <select class="speed-select" id="speed-factor">
                                <option value="2">2×</option>
                                <option value="5">5×</option>
                                <option value="10">10×</option>
                                <option value="25">25×</option>
                                <option value="50">50×</option>
                            </select>
                        </div>
                        <button class="apply-button" id="apply-acceleration" type="button" disabled>应用并刷新</button>
                        <p class="page-note" id="acceleration-page-note"></p>
                    </section>

                    <footer class="panel-footer">
                        <span id="page-type">页面：检测中</span>
                        <span>本地运行 · 无遥测</span>
                    </footer>
                </section>

                <button class="trigger-button" id="panel-trigger" type="button" data-tone="active" aria-expanded="false" aria-controls="assistant-panel">
                    <span class="trigger-copy"><span class="trigger-indicator" aria-hidden="true"></span><span class="trigger-text" id="trigger-text">LMS 助手：运行中</span></span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
            </div>
        `;

        document.body.appendChild(host);

        const refs = {
            shell: shadow.getElementById('assistant-shell'),
            panel: shadow.getElementById('assistant-panel'),
            trigger: shadow.getElementById('panel-trigger'),
            triggerText: shadow.getElementById('trigger-text'),
            close: shadow.getElementById('close-panel'),
            statusCard: shadow.getElementById('status-card'),
            statusLabel: shadow.getElementById('status-label'),
            statusAction: shadow.getElementById('status-action'),
            pageType: shadow.getElementById('page-type'),
            toastContainer: shadow.getElementById('toast-container'),
            accelerationHelp: shadow.getElementById('acceleration-state-help'),
            accelerationNote: shadow.getElementById('acceleration-page-note'),
            applyAcceleration: shadow.getElementById('apply-acceleration'),
            inputs: {
                assistantEnabled: shadow.getElementById('assistant-enabled'),
                autoPlay: shadow.getElementById('auto-play'),
                autoNext: shadow.getElementById('auto-next'),
                autoQuality: shadow.getElementById('auto-quality'),
                skipForum: shadow.getElementById('skip-forum'),
                timerAcceleration: shadow.getElementById('timer-acceleration'),
                speedFactor: shadow.getElementById('speed-factor')
            }
        };

        const activeToasts = new Map();
        let pendingAcceleration = {
            timerAcceleration: getSettings().timerAcceleration,
            speedFactor: getSettings().speedFactor
        };

        const isResourcePage = () => window.location.pathname === RESOURCE_PATH;

        const setExpanded = (expanded, returnFocus = false) => {
            refs.shell.dataset.expanded = String(expanded);
            refs.panel.setAttribute('aria-hidden', String(!expanded));
            refs.trigger.setAttribute('aria-expanded', String(expanded));

            const currentSettings = getSettings();
            if (currentSettings.panelExpanded !== expanded) {
                onSettingChange('panelExpanded', expanded);
            }

            if (returnFocus) refs.trigger.focus();
        };

        refs.trigger.addEventListener('click', () => {
            setExpanded(refs.shell.dataset.expanded !== 'true');
        });
        refs.close.addEventListener('click', () => setExpanded(false, true));
        shadow.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && refs.shell.dataset.expanded === 'true') {
                event.preventDefault();
                setExpanded(false, true);
            }
        });

        Object.entries(refs.inputs).forEach(([key, input]) => {
            if (key === 'timerAcceleration' || key === 'speedFactor') return;
            input.addEventListener('change', () => {
                const value = input.type === 'checkbox' ? input.checked : input.value;
                if (!onSettingChange(key, value)) return;

                if (key === 'assistantEnabled') {
                    showToast(
                        'assistant-toggle',
                        value ? 'LMS 助手已恢复运行。' : 'LMS 助手已暂停。',
                        { tone: value ? 'success' : 'warning' }
                    );
                }
                renderSettings(false);
            });
        });

        refs.inputs.timerAcceleration.addEventListener('change', () => {
            pendingAcceleration.timerAcceleration = refs.inputs.timerAcceleration.checked;
            renderAccelerationState();
        });
        refs.inputs.speedFactor.addEventListener('change', () => {
            pendingAcceleration.speedFactor = Number(refs.inputs.speedFactor.value);
            renderAccelerationState();
        });
        refs.applyAcceleration.addEventListener('click', () => {
            if (!onAccelerationApply({ ...pendingAcceleration })) {
                pendingAcceleration = {
                    timerAcceleration: getSettings().timerAcceleration,
                    speedFactor: getSettings().speedFactor
                };
                renderAccelerationState();
            }
        });

        function renderSettings(resetAcceleration = true) {
            const currentSettings = getSettings();
            BOOLEAN_SETTING_KEYS.forEach((key) => {
                if (refs.inputs[key]) refs.inputs[key].checked = currentSettings[key];
            });

            if (resetAcceleration) {
                pendingAcceleration = {
                    timerAcceleration: currentSettings.timerAcceleration,
                    speedFactor: currentSettings.speedFactor
                };
            }
            refs.shell.dataset.expanded = String(currentSettings.panelExpanded);
            refs.panel.setAttribute('aria-hidden', String(!currentSettings.panelExpanded));
            refs.trigger.setAttribute('aria-expanded', String(currentSettings.panelExpanded));
            renderAccelerationState();

            if (!currentSettings.assistantEnabled) {
                setStatus('paused', '已暂停', '自动化功能已暂停');
            }
        }

        function renderAccelerationState() {
            const currentSettings = getSettings();
            const hasChanges = pendingAcceleration.timerAcceleration !== currentSettings.timerAcceleration
                || pendingAcceleration.speedFactor !== currentSettings.speedFactor;

            refs.inputs.timerAcceleration.checked = pendingAcceleration.timerAcceleration;
            refs.inputs.speedFactor.value = String(pendingAcceleration.speedFactor);
            refs.applyAcceleration.disabled = !hasChanges;
            refs.accelerationHelp.textContent = pendingAcceleration.timerAcceleration
                ? `刷新后按 ${pendingAcceleration.speedFactor}× 生效`
                : '默认关闭，修改后需刷新';
            refs.accelerationNote.textContent = isResourcePage()
                ? (runtime.accelerationInstalled
                    ? `当前页面已启用 ${currentSettings.speedFactor}× 加速。`
                    : '当前为资源停留页；应用设置后会自动刷新。')
                : '仅在资源停留页生效，其他 LMS 页面不会修改计时器。';
        }

        function setStatus(tone, label, action) {
            refs.statusCard.dataset.tone = tone;
            refs.trigger.dataset.tone = tone;
            refs.statusLabel.textContent = label;
            refs.statusAction.textContent = action;
            refs.triggerText.textContent = `LMS 助手：${label}`;
        }

        function setAction(action) {
            refs.statusAction.textContent = action;
        }

        function setPageType(type) {
            refs.pageType.textContent = `页面：${type}`;
        }

        function showToast(key, message, { tone = 'info', duration = 3000 } = {}) {
            const now = Date.now();
            const existingExpiry = activeToasts.get(key);
            if (existingExpiry && existingExpiry > now) return;

            activeToasts.set(key, now + duration + 1000);
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.dataset.tone = tone;
            toast.textContent = message;
            refs.toastContainer.appendChild(toast);

            nativeTimers.setTimeout(() => {
                toast.dataset.visible = 'true';
            }, 10);
            nativeTimers.setTimeout(() => {
                toast.dataset.visible = 'false';
                nativeTimers.setTimeout(() => {
                    toast.remove();
                    activeToasts.delete(key);
                }, 200);
            }, duration);
        }

        renderSettings();

        return {
            renderSettings,
            setStatus,
            setAction,
            setPageType,
            showToast
        };
    }

    function createLmsController(ui) {
        const state = {
            hasNavigated: false,
            hasSetQuality: false,
            currentVideo: null,
            autoplayBlockedFor: null,
            replayInProgress: false,
            intervalId: null,
            lastErrorAt: 0,
            videoHandlers: null,
            forumNoticeShown: false,
            retryInteractionCleanup: null
        };

        function start() {
            updateBaseStatus();
            state.intervalId = nativeTimers.setInterval(checkPage, CHECK_INTERVAL);
            window.addEventListener('pagehide', stop, { once: true });
            checkPage();
        }

        function stop() {
            if (state.intervalId !== null) {
                nativeTimers.clearInterval(state.intervalId);
                state.intervalId = null;
            }
            detachVideo();
        }

        function handleSettingChange(key) {
            if (key === 'autoQuality' && settings.autoQuality) {
                state.hasSetQuality = false;
            }

            if (key === 'assistantEnabled') {
                updateBaseStatus();
            } else if (key !== 'panelExpanded') {
                ui.setAction('设置已保存，将在当前页面即时生效');
            }
        }

        function updateBaseStatus() {
            if (settings.assistantEnabled) {
                ui.setStatus('active', '运行中', '正在检测当前页面');
            } else {
                ui.setStatus('paused', '已暂停', '自动化功能已暂停');
            }
        }

        function checkPage() {
            try {
                if (!settings.assistantEnabled) {
                    ui.setStatus('paused', '已暂停', '自动化功能已暂停');
                    return;
                }
                if (state.hasNavigated) return;

                const nextLink = document.getElementById('next-activity-link');
                const isForumPage = window.location.href.includes('/mod/forum/view.php')
                    || document.body.id === 'page-mod-forum-view';

                if (isForumPage) {
                    handleForumPage(nextLink);
                    return;
                }

                const video = document.querySelector('video');
                attachVideo(video);
                ui.setPageType(video ? '视频课程' : (window.location.pathname === RESOURCE_PATH ? '资源停留页' : '普通课程页'));

                handleQuality();

                if (video && settings.autoPlay && video.paused && !video.ended
                    && state.autoplayBlockedFor !== video) {
                    attemptPlay(video, false);
                }

                handleCompletion(video, nextLink);

                if (!video && !document.querySelector('.num-bfjd span, .tips-completion')) {
                    ui.setStatus('active', '等待页面内容', '尚未检测到视频或进度信息');
                } else if (video && !video.paused && !video.ended) {
                    ui.setStatus('active', '正在播放', '正在监测学习进度');
                }
            } catch (error) {
                const now = Date.now();
                ui.setStatus('error', '发生错误', '页面结构暂时无法识别，将继续重试');
                if (now - state.lastErrorAt > 10000) {
                    state.lastErrorAt = now;
                    ui.showToast(
                        'page-check-error',
                        '页面检测出现异常，助手将在后台继续重试。',
                        { tone: 'error', duration: 5000 }
                    );
                    console.error('[SYSU LMS Assistant] Page check failed:', error);
                }
            }
        }

        function handleForumPage(nextLink) {
            ui.setPageType('讨论页');

            if (!settings.skipForum) {
                ui.setStatus('active', '运行中', '已关闭讨论页自动跳过');
                return;
            }

            if (!nextLink) {
                ui.setStatus('warning', '需要手动操作', '讨论页没有可用的下一页链接');
                if (!state.forumNoticeShown) {
                    state.forumNoticeShown = true;
                    ui.showToast(
                        'forum-no-next',
                        '检测到讨论页，但没有找到下一页链接。',
                        { tone: 'warning', duration: 5000 }
                    );
                }
                return;
            }

            scheduleNavigation(
                nextLink,
                SKIP_FORUM_DELAY,
                `检测到讨论页，${SKIP_FORUM_DELAY / 1000} 秒后自动跳过。`,
                'forum-skip'
            );
        }

        function handleQuality() {
            if (!settings.autoQuality || state.hasSetQuality) return;

            const qualityContainer = document.querySelector('.tcp-video-quality-switcher');
            if (!qualityContainer) return;

            const qualityText = qualityContainer.querySelector('.tcp-quality-switcher-value p');
            const currentQuality = qualityText ? qualityText.innerText.trim() : '';

            if (currentQuality !== '超清') {
                const hdOption = Array.from(qualityContainer.querySelectorAll('.vjs-menu-item'))
                    .find((element) => element.innerText.includes('超清'));

                if (hdOption) {
                    hdOption.click();
                    ui.setAction('已自动切换为超清画质');
                    ui.showToast('quality-hd', '已自动切换为超清画质。', { tone: 'success' });
                } else {
                    ui.showToast(
                        'quality-missing',
                        '当前视频没有可用的超清选项，将保持默认画质。',
                        { tone: 'warning' }
                    );
                }
            }

            state.hasSetQuality = true;
        }

        function handleCompletion(video, nextLink) {
            const progressSpan = document.querySelector('.num-bfjd span');
            const statusSpan = document.querySelector('.tips-completion');
            const hasProgressTracker = Boolean(progressSpan || statusSpan);
            const parsedProgress = progressSpan ? Number.parseFloat(progressSpan.innerText) : 0;
            const progress = Number.isFinite(parsedProgress) ? parsedProgress : 0;
            const isCompletedText = statusSpan ? statusSpan.innerText.trim() === '已完成' : false;
            const isVideoEnded = Boolean(video && video.ended);
            const isTrulyCompleted = hasProgressTracker
                ? progress >= 100 || isCompletedText
                : isVideoEnded;

            if (isTrulyCompleted) {
                if (nextLink && settings.autoNext) {
                    scheduleNavigation(
                        nextLink,
                        DELAY_BEFORE_NEXT,
                        `学习任务已完成，${DELAY_BEFORE_NEXT / 1000} 秒后进入下一页。`,
                        'activity-complete'
                    );
                } else if (!nextLink) {
                    ui.setStatus('complete', '已完成', '当前为最后一节，自动化已停止');
                    ui.showToast(
                        'course-last-activity',
                        '学习任务已完成，当前为最后一节。',
                        { tone: 'success', duration: 5000 }
                    );
                    stop();
                } else {
                    ui.setStatus('complete', '已完成', '自动下一页已关闭，请手动继续');
                }
                return;
            }

            if (isVideoEnded && hasProgressTracker && video && !state.replayInProgress) {
                if (!settings.autoPlay) {
                    ui.setStatus('warning', '需要手动操作', `视频已结束但进度为 ${progress}%，自动播放已关闭`);
                    return;
                }

                state.replayInProgress = true;
                video.currentTime = 0;
                ui.setStatus('warning', '正在修复进度', `视频已结束但进度为 ${progress}%，正在重播`);
                ui.showToast(
                    'progress-replay',
                    `视频已结束但进度为 ${progress}%，正在自动重播补全进度。`,
                    { tone: 'warning', duration: 5000 }
                );
                attemptPlay(video, true);
            }
        }

        function scheduleNavigation(nextLink, delay, message, toastKey) {
            if (state.hasNavigated) return;
            state.hasNavigated = true;
            ui.setStatus('active', '等待跳转', message);
            ui.showToast(toastKey, message, { tone: 'success' });

            nativeTimers.setTimeout(() => {
                ui.setAction('正在进入下一页');
                nextLink.click();
                nativeTimers.setTimeout(() => {
                    if (nextLink.href) window.location.href = nextLink.href;
                }, 1000);
            }, delay);
        }

        function attachVideo(video) {
            if (state.currentVideo === video) return;
            detachVideo();
            state.currentVideo = video;
            state.autoplayBlockedFor = null;
            state.replayInProgress = false;

            if (!video) return;

            const handlePause = () => {
                if (!settings.assistantEnabled || !settings.autoPlay || video.ended || state.hasNavigated) return;
                ui.setStatus('warning', '检测到暂停', '正在尝试恢复视频播放');
                ui.showToast(
                    'video-paused',
                    '检测到视频暂停，正在尝试恢复播放。',
                    { tone: 'warning' }
                );
                attemptPlay(video, true);
            };
            const handlePlay = () => {
                state.autoplayBlockedFor = null;
                state.replayInProgress = false;
                clearPlaybackRetry();
                if (settings.assistantEnabled) {
                    ui.setStatus('active', '正在播放', '正在监测学习进度');
                }
            };

            state.videoHandlers = { handlePause, handlePlay };
            video.addEventListener('pause', handlePause);
            video.addEventListener('play', handlePlay);
        }

        function detachVideo() {
            if (state.currentVideo && state.videoHandlers) {
                state.currentVideo.removeEventListener('pause', state.videoHandlers.handlePause);
                state.currentVideo.removeEventListener('play', state.videoHandlers.handlePlay);
            }
            state.currentVideo = null;
            state.videoHandlers = null;
            clearPlaybackRetry();
        }

        function attemptPlay(video, isRecovery) {
            if (!settings.assistantEnabled || !settings.autoPlay || !video) return;

            video.muted = true;
            let playResult;
            try {
                playResult = video.play();
            } catch (error) {
                handlePlayFailure(video, error);
                return;
            }

            if (playResult && typeof playResult.catch === 'function') {
                playResult.catch((error) => handlePlayFailure(video, error));
            } else if (isRecovery) {
                ui.setAction('已请求恢复视频播放');
            }
        }

        function handlePlayFailure(video, error) {
            if (state.currentVideo !== video || !settings.assistantEnabled || !settings.autoPlay) return;
            state.autoplayBlockedFor = video;
            state.replayInProgress = false;
            ui.setStatus('warning', '需要手动操作', '浏览器阻止了自动播放，请点击页面激活视频');
            ui.showToast(
                'autoplay-blocked',
                '浏览器阻止了自动播放，请手动点击页面或视频后重试。',
                { tone: 'warning', duration: 5000 }
            );
            console.warn('[SYSU LMS Assistant] Video playback was blocked:', error);
            armPlaybackRetry(video);
        }

        function armPlaybackRetry(video) {
            if (state.retryInteractionCleanup) return;

            const retryAfterInteraction = () => {
                clearPlaybackRetry();
                if (state.currentVideo !== video || !settings.assistantEnabled || !settings.autoPlay) return;
                state.autoplayBlockedFor = null;
                nativeTimers.setTimeout(checkPage, 0);
            };

            document.addEventListener('pointerdown', retryAfterInteraction, true);
            document.addEventListener('keydown', retryAfterInteraction, true);
            state.retryInteractionCleanup = () => {
                document.removeEventListener('pointerdown', retryAfterInteraction, true);
                document.removeEventListener('keydown', retryAfterInteraction, true);
                state.retryInteractionCleanup = null;
            };
        }

        function clearPlaybackRetry() {
            if (state.retryInteractionCleanup) state.retryInteractionCleanup();
        }

        return {
            start,
            stop,
            handleSettingChange
        };
    }
})();
