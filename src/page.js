export const PAGE_TYPES = Object.freeze({
    FORUM_POST: 'forum-post',
    FORUM_DISCUSSION: 'forum-discussion',
    VIDEO: 'video',
    RESOURCE: 'resource',
    COURSE: 'course'
});

export function classifyPage(document, location, resourcePath) {
    const reply = new URL(location.href).searchParams.get('reply') || '';
    if (location.pathname === '/mod/forum/post.php' && /^\d+$/.test(reply)) {
        return PAGE_TYPES.FORUM_POST;
    }
    if (location.pathname === '/mod/forum/view.php'
        || location.pathname === '/mod/forum/discuss.php'
        || document.body?.id === 'page-mod-forum-view'
        || document.body?.id === 'page-mod-forum-discuss') {
        return PAGE_TYPES.FORUM_DISCUSSION;
    }
    if (document.querySelector('video')) return PAGE_TYPES.VIDEO;
    if (location.pathname === resourcePath) return PAGE_TYPES.RESOURCE;
    return PAGE_TYPES.COURSE;
}

export function getPageKey(location) {
    return `${location.pathname}${location.search}`;
}
