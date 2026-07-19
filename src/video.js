export function getCompletionState(document, video) {
    const progressSpan = document.querySelector('.num-bfjd span');
    const statusSpan = document.querySelector('.tips-completion');
    const hasProgressTracker = Boolean(progressSpan || statusSpan);
    const parsedProgress = progressSpan ? Number.parseFloat(progressSpan.innerText) : 0;
    const progress = Number.isFinite(parsedProgress) ? parsedProgress : 0;
    const completedText = statusSpan ? statusSpan.innerText.trim() === '已完成' : false;
    const videoEnded = Boolean(video && video.ended);
    return {
        progress,
        hasProgressTracker,
        videoEnded,
        completed: hasProgressTracker ? progress >= 100 || completedText : videoEnded
    };
}

export function findHdOption(qualityContainer) {
    return Array.from(qualityContainer.querySelectorAll('.vjs-menu-item'))
        .find((element) => element.innerText.includes('超清')) || null;
}
