import { describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_SETTINGS,
    LEGACY_RUNNING_KEY,
    STORAGE_KEY
} from '../src/config.js';
import {
    chooseRandomItem,
    createSettingsStore,
    parseForumReplyTemplates
} from '../src/settings.js';

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: vi.fn((key) => values.get(key) ?? null),
        setItem: vi.fn((key, value) => values.set(key, value)),
        values
    };
}

describe('settings store', () => {
    it('loads safe defaults and persists the legacy running key', () => {
        const storage = memoryStorage();
        const store = createSettingsStore(storage);

        expect(store.load()).toEqual(DEFAULT_SETTINGS);
        expect(store.save(DEFAULT_SETTINGS, true)).toBe(true);
        expect(storage.values.get(LEGACY_RUNNING_KEY)).toBe('true');
    });

    it('migrates the legacy disabled state', () => {
        const store = createSettingsStore(memoryStorage({ [LEGACY_RUNNING_KEY]: 'false' }));
        expect(store.load().assistantEnabled).toBe(false);
    });

    it('normalizes invalid fields and reports damaged JSON', () => {
        const invalidFields = memoryStorage({
            [STORAGE_KEY]: JSON.stringify({
                assistantEnabled: 'yes',
                speedFactor: 999,
                forumReplyTemplates: 'x'.repeat(1001),
                panelExpanded: true
            })
        });
        const store = createSettingsStore(invalidFields);
        const settings = store.load();
        expect(settings.assistantEnabled).toBe(true);
        expect(settings.speedFactor).toBe(10);
        expect(settings.forumReplyTemplates).toBe(DEFAULT_SETTINGS.forumReplyTemplates);
        expect(settings.panelExpanded).toBe(true);

        const damaged = createSettingsStore(memoryStorage({ [STORAGE_KEY]: '{bad' }));
        expect(damaged.load()).toEqual(DEFAULT_SETTINGS);
        expect(damaged.hasLoadIssue()).toBe(true);
    });

    it('survives unavailable storage and reports failed saves', () => {
        const storage = {
            getItem: vi.fn(() => { throw new Error('denied'); }),
            setItem: vi.fn(() => { throw new Error('denied'); })
        };
        const store = createSettingsStore(storage);
        expect(store.load()).toEqual(DEFAULT_SETTINGS);
        expect(store.hasLoadIssue()).toBe(true);
        expect(store.save(DEFAULT_SETTINGS, true)).toBe(false);
    });
});

describe('reply helpers', () => {
    it('parses only non-empty templates and supports deterministic selection', () => {
        expect(parseForumReplyTemplates(' 同意 | | 支持 ')).toEqual(['同意', '支持']);
        expect(parseForumReplyTemplates(null)).toEqual([]);
        expect(chooseRandomItem(['a', 'b'], () => 0.75)).toBe('b');
        expect(chooseRandomItem([])).toBeNull();
    });
});
