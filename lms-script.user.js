// ==UserScript==
// @name         中山大学 LMS 自动播放
// @namespace    https://github.com/ntgmc/sysu-lms-assistant
// @version      1.5
// @description  自动播放LMS视频，自动切超清防止无法播放，进度100%自动下一页。若视频播完但进度未满则自动重播。遇讨论页跳过。含悬浮控制与Toast提示。
// @author       ntgmc
// @match        *://lms.sysu.edu.cn/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ================= 配置项 =================
    const CHECK_INTERVAL = 3000;      // 每3秒检查一次状态
    const DELAY_BEFORE_NEXT = 3000;   // 视频完成（或进度100%）后等待3秒再跳转
    const SKIP_FORUM_DELAY = 2000;    // 遇到讨论页时，等待2秒再跳过
    // ==========================================

    let hasNavigated = false;
    let hasSetQuality = false;

    // 获取脚本运行状态（默认开启，支持跨页面记忆）
    let isRunning = localStorage.getItem('lms_script_running') !== 'false';

    // ================= UI 模块：Toast 提示与控制按钮 =================
    let toastContainer;

    function initUI() {
        // 1. 初始化 Toast 容器
        toastContainer = document.createElement('div');
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);

        // 2. 初始化悬浮控制按钮
        const btn = document.createElement('button');
        updateBtnStyle(btn);
        btn.style.cssText += `
            position: fixed;
            top: 30%;
            left: 10px;
            z-index: 9999999;
            padding: 10px 15px;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s;
        `;

        btn.onclick = () => {
            isRunning = !isRunning;
            localStorage.setItem('lms_script_running', isRunning);
            updateBtnStyle(btn);
            showToast(isRunning ? "▶️ 脚本已恢复运行" : "⏸️ 脚本已暂停");
        };

        document.body.appendChild(btn);
    }

    function updateBtnStyle(btn) {
        if (isRunning) {
            btn.innerText = "LMS助手: 运行中";
            btn.style.backgroundColor = "#4CAF50"; // 绿色
        } else {
            btn.innerText = "LMS助手: 已暂停";
            btn.style.backgroundColor = "#f44336"; // 红色
        }
    }

    function showToast(text, duration = 3000) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.innerText = text;
        toast.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.4s ease-in-out;
        `;
        toastContainer.appendChild(toast);

        // 淡入
        setTimeout(() => { toast.style.opacity = '1'; }, 10);

        // 淡出并移除
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // 初始化 UI 并提示
    initUI();
    if (isRunning) {
        showToast("▶️ LMS 自动学习脚本已启动 (v1.5)");
    }

    // ================= 核心逻辑：定时检测 =================
    let mainLoop = setInterval(() => {
        // 如果脚本被暂停，或已触发跳转，则跳过执行
        if (!isRunning || hasNavigated) return;

        let nextLink = document.getElementById('next-activity-link');

        // ==============================
        // 1. 讨论页面：自动跳过逻辑
        // ==============================
        let isForumPage = window.location.href.includes('/mod/forum/view.php') || document.body.id === 'page-mod-forum-view';

        if (isForumPage) {
            if (nextLink) {
                showToast(`⏭️ 检测到讨论页，${SKIP_FORUM_DELAY/1000}秒后自动跳过...`);
                hasNavigated = true;
                clearInterval(mainLoop);

                setTimeout(() => {
                    nextLink.click();
                    setTimeout(() => { window.location.href = nextLink.href; }, 1000);
                }, SKIP_FORUM_DELAY);
            } else {
                showToast("⏭️ 检测到讨论页，但没有下一页按钮。");
                clearInterval(mainLoop);
            }
            return;
        }

        // ==============================
        // 2. 视频页面：自动切换超清画质
        // ==============================
        let qualityContainer = document.querySelector('.tcp-video-quality-switcher');
        if (qualityContainer && !hasSetQuality) {
            let qualityTextElem = qualityContainer.querySelector('.tcp-quality-switcher-value p');

            if (qualityTextElem && qualityTextElem.innerText.trim() !== '超清') {
                let hdOption = Array.from(qualityContainer.querySelectorAll('.vjs-menu-item'))
                                    .find(el => el.innerText.includes('超清'));

                if (hdOption) {
                    showToast("⚙️ 正在自动切换为【超清】画质...");
                    hdOption.click();
                } else {
                    showToast("⚠️ 未找到【超清】选项，保持默认画质。");
                }
            } else if (qualityTextElem && qualityTextElem.innerText.trim() === '超清') {
                // 已经是超清则不提示
            }
            hasSetQuality = true;
        }

        // ==============================
        // 3. 视频页面：自动播放与防暂停
        // ==============================
        let video = document.querySelector('video');
        if (video) {
            if (video.paused && !video.ended) {
                video.muted = true;
                let playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        showToast("⚠️ 浏览器拦截了自动播放，请手动点击页面激活。");
                    });
                }
            }

            // 防暂停机制
            video.onpause = function() {
                if (isRunning && !video.ended && !hasNavigated) {
                    showToast("⚠️ 检测到视频暂停，尝试恢复播放...");
                    video.play();
                }
            };
        }

        // ==============================
        // 4. 视频页面：检测进度 Bug 与自动下一页
        // ==============================
        let progressSpan = document.querySelector('.num-bfjd span');
        let statusSpan = document.querySelector('.tips-completion');

        let hasProgressTracker = !!progressSpan || !!statusSpan; // 判断页面是否有进度追踪元素
        let progress = progressSpan ? parseFloat(progressSpan.innerText) : 0;
        let isCompletedText = statusSpan ? statusSpan.innerText.trim() === '已完成' : false;
        let isVideoEnded = video ? video.ended : false;

        let isTrulyCompleted = false;

        // 判断是否真正完成
        if (hasProgressTracker) {
            if (progress >= 100 || isCompletedText) {
                isTrulyCompleted = true;
            }
        } else {
            // 没有进度条的视频，以视频播完为准
            if (isVideoEnded) {
                isTrulyCompleted = true;
            }
        }

        // 执行对应动作
        if (isTrulyCompleted) {
            if (nextLink) {
                showToast(`✅ 学习任务完成！${DELAY_BEFORE_NEXT/1000}秒后自动下一页...`);
                hasNavigated = true;
                clearInterval(mainLoop);

                setTimeout(() => {
                    showToast("⏭️ 正在跳转...");
                    nextLink.click();
                    setTimeout(() => { window.location.href = nextLink.href; }, 1000);
                }, DELAY_BEFORE_NEXT);
            } else {
                showToast("✅ 学习任务完成！当前为最后一节，停止运行。", 5000);
                clearInterval(mainLoop);
            }
        } else if (isVideoEnded && hasProgressTracker && video) {
            // [新增逻辑]: 视频播完了，但是平台进度没达到100% -> 重新播放
            showToast(`⚠️ 视频结束但进度未满 (${progress}%)，自动重播补全进度...`, 4000);
            video.currentTime = 0; // 回到视频开头
            video.play();          // 重新开始播放
        }

    }, CHECK_INTERVAL);

})();
