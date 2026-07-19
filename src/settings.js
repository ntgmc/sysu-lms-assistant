import {
    BOOLEAN_SETTING_KEYS,
    DEFAULT_SETTINGS,
    LEGACY_RUNNING_KEY,
    SPEED_FACTORS,
    STORAGE_KEY
} from './config.js';

export function createSettingsStore(storage) {
    let loadIssue = false;

    function read(key) {
        try {
            return storage.getItem(key);
        } catch {
            loadIssue = true;
            return null;
        }
    }

    function write(key, value) {
        try {
            storage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function load() {
        const settings = { ...DEFAULT_SETTINGS };
        const serialized = read(STORAGE_KEY);

        if (serialized === null) {
            const legacyRunning = read(LEGACY_RUNNING_KEY);
            if (legacyRunning !== null) settings.assistantEnabled = legacyRunning !== 'false';
            return settings;
        }

        try {
            const parsed = JSON.parse(serialized);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new TypeError('Settings must be an object.');
            }
            for (const key of BOOLEAN_SETTING_KEYS) {
                if (typeof parsed[key] === 'boolean') settings[key] = parsed[key];
            }
            if (SPEED_FACTORS.includes(parsed.speedFactor)) {
                settings.speedFactor = parsed.speedFactor;
            }
            if (typeof parsed.forumReplyTemplates === 'string'
                && parsed.forumReplyTemplates.length <= 1000) {
                settings.forumReplyTemplates = parsed.forumReplyTemplates;
            }
        } catch {
            loadIssue = true;
        }
        return settings;
    }

    function save(settings, syncLegacy = false) {
        const saved = write(STORAGE_KEY, JSON.stringify(settings));
        const legacySaved = !syncLegacy
            || write(LEGACY_RUNNING_KEY, String(settings.assistantEnabled));
        return saved && legacySaved;
    }

    return {
        load,
        save,
        hasLoadIssue: () => loadIssue
    };
}

export function parseForumReplyTemplates(value) {
    if (typeof value !== 'string') return [];
    return value.split('|').map((item) => item.trim()).filter(Boolean);
}

export function chooseRandomItem(items, random = Math.random) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(random() * items.length)];
}
