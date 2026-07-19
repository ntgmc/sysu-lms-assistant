export function getNavigationCancellation(key, settings) {
    if (key === 'assistantEnabled' && !settings.assistantEnabled) return 'all';
    if (key === 'autoNext' && !settings.autoNext) return 'auto-next';
    if ((key === 'skipForum' && !settings.skipForum)
        || (key === 'autoCompleteForum' && settings.autoCompleteForum)) {
        return 'forum-skip';
    }
    return null;
}

export function createNavigationScheduler(nativeTimers, location) {
    let generation = 0;
    let timeoutId = null;
    let fallbackId = null;
    let pending = null;

    function clearTimers() {
        if (timeoutId !== null) nativeTimers.clearTimeout(timeoutId);
        if (fallbackId !== null) nativeTimers.clearTimeout(fallbackId);
        timeoutId = null;
        fallbackId = null;
    }

    function cancel(kind = null) {
        if (!pending || (kind && pending.kind !== kind)) return null;
        const cancelled = pending;
        generation += 1;
        clearTimers();
        pending = null;
        return cancelled;
    }

    function schedule({ kind, link, delay, isCurrent, onNavigate }) {
        if (pending) return false;
        const scheduledGeneration = ++generation;
        pending = { kind, link };
        timeoutId = nativeTimers.setTimeout(() => {
            timeoutId = null;
            if (scheduledGeneration !== generation || !pending || !isCurrent()) {
                cancel();
                return;
            }
            onNavigate();
            link.click();
            fallbackId = nativeTimers.setTimeout(() => {
                fallbackId = null;
                if (scheduledGeneration === generation && link.href) {
                    location.href = link.href;
                }
            }, 1000);
        }, delay);
        return true;
    }

    return {
        schedule,
        cancel,
        getPending: () => pending
    };
}
