import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const checkOnly = process.argv.includes('--check');
const targets = [
    {
        entryPoint: 'src/assistant.js',
        outfile: 'lms-script.user.js',
        metadata: [
            ['name', '中山大学 LMS 助手'],
            ['namespace', 'https://github.com/ntgmc/sysu-lms-assistant'],
            ['version', '2.2.0'],
            ['description', '集成自动播放、自动下一页、进度修复、讨论页跳过、讨论任务自动完成与可选计时加速，并提供统一控制面板。'],
            ['author', 'ntgmc'],
            ['match', '*://lms.sysu.edu.cn/*'],
            ['homepage', 'https://github.com/ntgmc/sysu-lms-assistant'],
            ['supportURL', 'https://github.com/ntgmc/sysu-lms-assistant/issues'],
            ['grant', 'none'],
            ['run-at', 'document-start'],
            ['license', 'GPL-3.0 License']
        ]
    },
    {
        entryPoint: 'src/migration.js',
        outfile: 'time-hacker.user.js',
        metadata: [
            ['name', 'time-hacker'],
            ['namespace', 'Violentmonkey Scripts'],
            ['match', 'https://lms.sysu.edu.cn/mod/fsresource/view.php*'],
            ['grant', 'none'],
            ['version', '2.2.0'],
            ['author', 'ntgmc'],
            ['description', '迁移兼容脚本：计时加速已合并到中山大学 LMS 助手，请改用统一脚本。'],
            ['homepage', 'https://github.com/ntgmc/sysu-lms-assistant'],
            ['supportURL', 'https://github.com/ntgmc/sysu-lms-assistant/issues'],
            ['run-at', 'document-start'],
            ['license', 'GPL-3.0 License']
        ]
    }
];

function createBanner(metadata) {
    const lines = metadata.map(([key, value]) => `// @${key.padEnd(12)} ${value}`);
    return ['// ==UserScript==', ...lines, '// ==/UserScript==', ''].join('\n');
}

let stale = false;
for (const target of targets) {
    const result = await build({
        entryPoints: [target.entryPoint],
        bundle: true,
        write: false,
        format: 'iife',
        platform: 'browser',
        target: ['es2020'],
        charset: 'utf8',
        legalComments: 'none',
        banner: { js: createBanner(target.metadata) }
    });
    const output = result.outputFiles[0].text.replaceAll('\r\n', '\n');

    if (checkOnly) {
        let current = '';
        try {
            current = (await readFile(target.outfile, 'utf8')).replaceAll('\r\n', '\n');
        } catch {
            // A missing artifact is reported as stale below.
        }
        if (current !== output) {
            stale = true;
            console.error(`${target.outfile} is stale; run npm run build.`);
        }
    } else {
        await writeFile(target.outfile, output, 'utf8');
        console.log(`Built ${target.outfile}`);
    }
}

if (stale) process.exitCode = 1;
