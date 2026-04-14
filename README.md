# 🎓 中山大学 LMS 自动学习助手 (SYSU LMS Assistant)

[![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tampermonkey](https://img.shields.io/badge/Extension-Tampermonkey-black.svg)](https://www.tampermonkey.net/)
[![Version](https://img.shields.io/badge/Version-1.6-blue.svg)](#)

这是一个为 **中山大学 LMS (Learning Management System)** 编写的浏览器插件集。旨在优化视频课程观看体验，实现全自动的视频连播、画质切换、进度修复以及**可选的计时加速**功能。

## 🚨 核心警示 (Risk Warning)

**本仓库现在包含一个实验性加速脚本 `time-hacker.user.js`。**
- **搭配使用**：该脚本可以与主脚本同时开启，大幅缩短非视频任务（如文档、页面停留）的统计时间。
- **封号风险**：由于加速脚本修改了浏览器底层定时器，其产生的异常学习数据可能会被后台审计。**过度加速可能导致账号异常、进度被清零或封号。** 请务必根据实际情况谨慎选择是否安装，建议加速倍率控制在合理范围内。

---

## ✨ 核心功能 (Features)

### 1. 基础助手 (lms-script.user.js)
- **▶️ 自动播放与防暂停**：进入页面自动静音播放，检测到非人为暂停会自动恢复。
- **⚙️ 自动超清画质**：自动检测并切换至最高画质。
- **⏭️ 自动下一页**：视频播完后自动跳转至下一课件。
- **🔄 进度修复**：针对平台 Bug，若视频结束但进度未满 100%，将自动重播直至任务完成。
- **🎛️ 控制面板**：左侧悬浮按钮，支持跨页面状态记忆，可一键暂停所有自动化逻辑。

### 2. 计时加速器 (time-hacker.user.js) - [新]
- **⚡ 毫秒级加速**：拦截并重写 `setInterval` 与 `setTimeout`，让页面计时器运行速度提升（默认 10 倍）。
- **📄 缩短停留要求**：显著减少“必须在该页面停留 X 分钟”类任务的实际等待时间。
- **🛡️ 稳定性优化**：内置最小延迟保护，防止因速度过快导致浏览器崩溃或页面加载逻辑错误。

---

## 🛠️ 安装说明 (Installation)

### 第一步：安装脚本管理器
请先安装：[Tampermonkey](https://www.tampermonkey.net/) (推荐) 或 [Violentmonkey](https://violentmonkey.github.io/)。

### 第二步：选择安装脚本
你可以根据需求安装以下一个或多个脚本：

| 脚本名称 | 功能描述 | 安装链接 |
| :--- | :--- | :--- |
| **LMS 自动助手 (主脚本)** | 视频自动连播、画质控制、UI交互 | [👉 点击安装](https://raw.githubusercontent.com/ntgmc/sysu-lms-assistant/main/lms-script.user.js) |
| **计时加速插件 (可选)** | 加速页面逻辑、缩短停留任务时长 | [👉 点击安装](https://raw.githubusercontent.com/ntgmc/sysu-lms-assistant/main/time-hacker.user.js) |

> **提示**：建议两个脚本同时开启以获得最完整的自动化体验，但请阅读上方的风险提示。

---

## 🚀 使用指南 (Usage)

1. 安装完成后，登录 `lms.sysu.edu.cn` 进入课程。
2. **状态指示**：
   - 页面左侧出现 **“LMS助手: 运行中”** 绿色按钮，表示主脚本正常工作。
   - 打开浏览器控制台 (`F12`)，若看到 `[TimerHook]` 字样，表示加速插件已生效。
3. **手动干预**：如需手动答题或操作，点击左侧按钮切换为“已暂停”即可。

## 📝 更新日志 (Changelog)

- **v1.6**
  - 新增 `time-hacker.user.js`：支持 `setInterval/setTimeout` 劫持加速。
  - 优化加速逻辑，增加 `document-start` 注入机制，确保脚本在页面最早期运行。
- **v1.5** 
  - 修复平台进度 Bug：增加视频播完但进度未满 100% 时自动重播的机制。
- **v1.4** 
  - 新增屏幕右下角 Toast 消息提示与左侧悬浮启停按钮。

## ⚠️ 免责声明 (Disclaimer)

1. 本项目仅供**前端技术交流与个人辅助实验**使用。
2. 使用本辅助工具（尤其是加速脚本）可能违反学校或平台的相关学习规定。
3. **因使用本工具导致的任何账号封禁、进度清零、成绩异常等后果，作者概不负责。** 请在法律和规章制度允许的范围内合理使用。

## 🤝 参与贡献与反馈

如果你在加速过程中发现某些页面加载异常，欢迎提交 [Issues](https://github.com/ntgmc/sysu-lms-assistant/issues)。
