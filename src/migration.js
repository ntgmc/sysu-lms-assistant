(function() {
    'use strict';

    const ASSISTANT_INSTANCE_KEY = '__SYSU_LMS_ASSISTANT_V2__';
    const DISMISSED_KEY = 'sysu_lms_time_hacker_migration_dismissed';
    const INSTALL_URL = 'https://raw.githubusercontent.com/ntgmc/sysu-lms-assistant/main/lms-script.user.js';

    if (window[ASSISTANT_INSTANCE_KEY]) return;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showMigrationNotice, { once: true });
    } else {
        showMigrationNotice();
    }

    function isDismissed() {
        try {
            return window.localStorage.getItem(DISMISSED_KEY) === 'true';
        } catch {
            return false;
        }
    }

    function rememberDismissal() {
        try {
            window.localStorage.setItem(DISMISSED_KEY, 'true');
        } catch {
            // The notice still closes for this page when storage is unavailable.
        }
    }

    function showMigrationNotice() {
        if (window[ASSISTANT_INSTANCE_KEY] || isDismissed() || !document.body) return;

        const host = document.createElement('div');
        host.id = 'sysu-lms-time-hacker-migration';
        host.style.cssText = [
            'position: fixed',
            'right: 16px',
            'bottom: 16px',
            'z-index: 2147482999'
        ].join(';');

        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                :host {
                    color-scheme: light dark;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                .notice {
                    width: min(360px, calc(100vw - 32px));
                    padding: 16px;
                    border: 1px solid #f59e0b;
                    border-radius: 14px;
                    background: #ffffff;
                    color: #0f172a;
                    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
                }

                .title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 700;
                    line-height: 1.4;
                }

                .message {
                    margin: 8px 0 14px;
                    color: #475569;
                    font-size: 13px;
                    line-height: 1.55;
                }

                .actions {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                    gap: 8px;
                }

                a,
                button {
                    display: inline-flex;
                    min-height: 44px;
                    align-items: center;
                    justify-content: center;
                    padding: 0 14px;
                    border-radius: 9px;
                    font: inherit;
                    font-size: 13px;
                    font-weight: 650;
                    cursor: pointer;
                }

                a {
                    border: 1px solid #0f766e;
                    background: #0f766e;
                    color: #ffffff;
                    text-decoration: none;
                }

                button {
                    border: 1px solid #cbd5e1;
                    background: transparent;
                    color: #334155;
                }

                a:focus-visible,
                button:focus-visible {
                    outline: 3px solid rgba(13, 148, 136, 0.4);
                    outline-offset: 2px;
                }

                @media (prefers-color-scheme: dark) {
                    .notice {
                        background: #111827;
                        color: #f8fafc;
                    }

                    .message {
                        color: #cbd5e1;
                    }

                    button {
                        border-color: #475569;
                        color: #e2e8f0;
                    }
                }

                @media (max-width: 480px) {
                    .notice {
                        width: calc(100vw - 24px);
                    }
                }
            </style>
            <section class="notice" role="status" aria-labelledby="migration-title">
                <h2 class="title" id="migration-title">计时加速功能已合并</h2>
                <p class="message">旧版加速器已停止修改页面计时器。请安装或更新“中山大学 LMS 助手”，之后可在统一控制面板中按需开启加速。</p>
                <div class="actions">
                    <button id="dismiss" type="button">不再提示</button>
                    <a href="${INSTALL_URL}" target="_blank" rel="noopener noreferrer">安装统一脚本</a>
                </div>
            </section>
        `;

        shadow.getElementById('dismiss').addEventListener('click', () => {
            rememberDismissal();
            host.remove();
        });
        document.body.appendChild(host);
    }
})();
