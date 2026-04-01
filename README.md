# 🎓 中山大学 LMS 自动学习助手 (SYSU LMS Assistant)

[![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tampermonkey](https://img.shields.io/badge/Extension-Tampermonkey-black.svg)](https://www.tampermonkey.net/)
[![Version](https://img.shields.io/badge/Version-1.5-blue.svg)](#)

这是一个为 **中山大学 LMS (Learning Management System)** 编写的浏览器油猴脚本（Tampermonkey）。旨在优化视频课程观看体验，实现全自动的视频连播、画质切换、进度异常修复以及全局状态控制，让你解放双手。

## ✨ 核心功能 (Features)

- **▶️ 自动播放与防暂停**：进入页面自动静音播放（突破浏览器自动播放限制），检测到非人为暂停会自动恢复播放。
- **⚙️ 自动超清画质**：自动检测并切换至“超清”画质，省去每次手动点击的烦恼。
- **⏭️ 自动下一页**：视频进度达到 100% 或状态变更为“已完成”后，自动跳转至下一课件。
- **🔄 进度防 Bug 重播**：如果视频已播完但系统进度未达到 100%（平台偶发 Bug），脚本会自动重播视频补全进度，直到任务真正完成才跳转。
- **⏩ 自动跳过讨论区**：遇到无需停留的“讨论/论坛”页面，等待 2 秒后自动跳过。
- **🎛️ 悬浮控制面板**：页面左侧带有全局控制按钮，支持一键“暂停/恢复”脚本。跨页面记忆运行状态。
- **💬 优雅的 Toast 提示**：放弃原有的控制台输出，采用屏幕右下角仿系统级 Toast 弹窗，平滑动画，不打扰观看体验。

## 🛠️ 安装说明 (Installation)

### 第一步：安装脚本管理器
请先在浏览器中安装用户脚本管理器扩展程序：
- [Tampermonkey](https://www.tampermonkey.net/) (推荐)
- [Violentmonkey](https://violentmonkey.github.io/)

### 第二步：安装脚本
有以下两种方式安装本脚本：

**方式 A：直接安装（推荐）**
点击以下链接即可直接唤起 Tampermonkey 进行安装：
👉 **[点击这里安装脚本](https://raw.githubusercontent.com/ntgmc/sysu-lms-assistant/main/lms-script.user.js)**

**方式 B：手动复制**
1. 复制仓库中 `lms-script.user.js` 的所有代码。
2. 打开 Tampermonkey 面板，点击“添加新脚本”。
3. 粘贴代码并保存 (`Ctrl+S` / `Cmd+S`)。

## 🚀 使用指南 (Usage)

1. 安装完成后，正常登录 `lms.sysu.edu.cn` 并进入任意视频课程页面。
2. 页面左侧会出现一个 **“LMS助手: 运行中”** 的绿色悬浮按钮，右下角会弹出启动提示。
3. 脚本将自动接管后续操作。
4. 如果遇到想仔细看的视频或想手动答题，点击左侧按钮将其切换为 **“已暂停”** 状态（红色），脚本将完全停止干预。

## 📝 更新日志 (Changelog)

- **v1.5** 
  - 修复平台进度 Bug：增加视频播完但进度未满 100% 时自动重播的机制。
- **v1.4** 
  - 新增屏幕右下角 Toast 消息提示，移除旧版控制台输出。
  - 新增页面左侧悬浮启停按钮，并使用 `localStorage` 实现状态跨页面记忆。
- **v1.3及之前** 
  - 实现基础自动播放、自动超清、跳过讨论页与自动下一页功能。

## ⚠️ 免责声明 (Disclaimer)

1. 本脚本仅供**前端技术学习与交流使用**。
2. 请合理安排学习时间，保证学习质量。过度依赖自动化工具可能导致错失关键知识点。
3. 因使用本脚本导致的任何账号异常或学习进度问题，作者**不承担任何责任**。请自行斟酌风险。

## 🤝 参与贡献与反馈

如果你在使用过程中遇到 Bug 或有新的功能建议，欢迎提交 [Issues](https://github.com/ntgmc/sysu-lms-assistant/issues) 或 Pull Requests。
