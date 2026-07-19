import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('migration userscript', () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = '';
        localStorage.clear();
        delete window.__SYSU_LMS_ASSISTANT_V2__;
    });

    it('renders a safe installation link and remembers dismissal', async () => {
        await import('../src/migration.js');
        const host = document.getElementById('sysu-lms-time-hacker-migration');
        expect(host).not.toBeNull();
        const link = host.shadowRoot.querySelector('a');
        expect(link.rel).toContain('noopener');
        expect(link.rel).toContain('noreferrer');
        expect(link.href).toBe('https://raw.githubusercontent.com/ntgmc/sysu-lms-assistant/main/lms-script.user.js');

        host.shadowRoot.getElementById('dismiss').click();
        expect(document.getElementById('sysu-lms-time-hacker-migration')).toBeNull();
        expect(localStorage.getItem('sysu_lms_time_hacker_migration_dismissed')).toBe('true');
    });

    it('does not render when the unified assistant is present', async () => {
        window.__SYSU_LMS_ASSISTANT_V2__ = {};
        await import('../src/migration.js');
        expect(document.getElementById('sysu-lms-time-hacker-migration')).toBeNull();
    });
});
