import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, VERSION } from '../src/config.js';

describe('published artifact contract', () => {
    it('keeps install metadata, version and documented defaults aligned', async () => {
        const [assistant, migration, readme, packageJson] = await Promise.all([
            readFile('lms-script.user.js', 'utf8'),
            readFile('time-hacker.user.js', 'utf8'),
            readFile('README.md', 'utf8'),
            readFile('package.json', 'utf8').then(JSON.parse)
        ]);

        expect(VERSION).toBe('2.2.0');
        expect(packageJson.version).toBe(VERSION);
        expect(assistant).toContain('// @version      2.2.0');
        expect(assistant).toContain('// @match        *://lms.sysu.edu.cn/*');
        expect(assistant).toContain('// @grant        none');
        expect(assistant).toContain('// @run-at       document-start');
        expect(migration).toContain('// @match        https://lms.sysu.edu.cn/mod/fsresource/view.php*');
        expect(migration).toContain('// @grant        none');
        expect(readme).toContain('Version-2.2.0');
        expect(readme).toContain('| 自动完成讨论任务 | **关闭** |');
        expect(readme).toContain('| 计时加速 | **关闭** |');
        expect(DEFAULT_SETTINGS.autoCompleteForum).toBe(false);
        expect(DEFAULT_SETTINGS.timerAcceleration).toBe(false);
        expect(DEFAULT_SETTINGS.speedFactor).toBe(10);
    });
});
