export const FORUM_TASK_PHASES = Object.freeze({
    OPENING: 'opening',
    ATTEMPTED: 'attempted',
    FAILED: 'failed'
});

export function createForumTaskStore(storage, key) {
    function read() {
        try {
            const serialized = storage.getItem(key);
            if (serialized === null) return null;
            const parsed = JSON.parse(serialized);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }

    function write(task) {
        try {
            storage.setItem(key, JSON.stringify(task));
            return true;
        } catch {
            return false;
        }
    }

    function clear() {
        try {
            storage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }

    return { read, write, clear };
}

export function isValidForumTask(task) {
    return Boolean(task)
        && typeof task.activityId === 'string'
        && typeof task.sourceUrl === 'string'
        && /^\d+$/.test(String(task.replyPostId || ''))
        && typeof task.replyText === 'string'
        && task.replyText.trim().length > 0
        && Object.values(FORUM_TASK_PHASES).includes(task.phase)
        && typeof task.verifyReloaded === 'boolean'
        && Number.isFinite(task.startedAt)
        && (task.discussionId === null
            || task.discussionId === undefined
            || /^\d+$/.test(String(task.discussionId)));
}

export function isForumTaskExpired(task, now, maxAge) {
    return now - task.startedAt > maxAge;
}
