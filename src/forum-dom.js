export function getForumCompletionRequirement(document) {
    const candidates = Array.from(document.querySelectorAll(
        '[data-region="completionrequirements"] [role="listitem"], .automatic-completion-conditions .badge'
    ));
    const element = candidates.find((candidate) => candidate.textContent.includes('发表论坛帖子'));
    if (!element) return { recognized: false, completed: false, element: null };

    const strongText = element.querySelector('strong')?.textContent.trim() || '';
    const checkedIcon = Boolean(element.querySelector('img[src*="/i/checked"]'));
    return {
        recognized: true,
        completed: element.classList.contains('alert-success')
            || strongText === '完成'
            || checkedIcon,
        element
    };
}

export function getForumActivityId(location) {
    const url = new URL(location.href);
    const activityId = url.searchParams.get('id');
    if (/^\d+$/.test(activityId || '')) return activityId;
    const discussionId = url.searchParams.get('d');
    return /^\d+$/.test(discussionId || '') ? `d:${discussionId}` : null;
}

export function getForumDiscussionId(document, location) {
    const currentUrl = new URL(location.href);
    const currentDiscussionId = currentUrl.searchParams.get('d');
    if (/^\d+$/.test(currentDiscussionId || '')) return currentDiscussionId;

    const links = document.querySelectorAll('a[href*="/mod/forum/discuss.php?d="]');
    for (const link of links) {
        try {
            const url = new URL(link.href, currentUrl.href);
            const discussionId = url.searchParams.get('d');
            if (url.origin === currentUrl.origin
                && url.pathname === '/mod/forum/discuss.php'
                && /^\d+$/.test(discussionId || '')) {
                return discussionId;
            }
        } catch {
            // Host pages can contain malformed links; ignore them.
        }
    }
    return null;
}

export function getNormalizedPageUrl(location) {
    const url = new URL(location.href);
    return `${url.origin}${url.pathname}${url.search}`;
}

export function getReplyTargets(document, location) {
    const links = Array.from(document.querySelectorAll(
        'a[data-action="collapsible-link"][href*="/mod/forum/post.php?reply="]'
    ));
    const targets = links.flatMap((element) => {
        try {
            const url = new URL(element.href, location.href);
            const replyPostId = url.searchParams.get('reply');
            if (url.origin !== location.origin
                || url.pathname !== '/mod/forum/post.php'
                || !/^\d+$/.test(replyPostId || '')) {
                return [];
            }
            return [{ element, url, replyPostId }];
        } catch {
            return [];
        }
    });
    const ordinary = targets.filter(({ element }) => !element.closest('.firstpost.starter'));
    return ordinary.length > 0 ? ordinary : targets;
}

export function findForumTextarea(form) {
    const selectors = [
        'textarea[name="message[text]"]',
        'textarea[name="message"]',
        'textarea[name="post"]',
        'textarea[data-region="post-content"]',
        'textarea[id^="id_message"]'
    ];
    return selectors.map((selector) => form.querySelector(selector)).find(Boolean) || null;
}

export function findForumSubmitButton(form) {
    const preferred = form.querySelector(
        '[data-action="forum-submit-post"], #id_submitbutton, [name="submitbutton"]'
    );
    if (preferred) return preferred;
    return Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'))
        .find((element) => {
            const label = `${element.name || ''} ${element.value || ''} ${element.textContent || ''}`;
            return !/(cancel|取消|advanced|高级)/i.test(label);
        }) || null;
}

export function fillForumReply(textarea, contentEditable, replyText) {
    for (const editor of [textarea, contentEditable].filter(Boolean)) {
        if (editor === textarea) editor.value = replyText;
        else editor.textContent = replyText;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
