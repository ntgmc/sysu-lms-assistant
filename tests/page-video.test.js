import { describe, expect, it } from 'vitest';
import { classifyPage, PAGE_TYPES } from '../src/page.js';
import { findHdOption, getCompletionState } from '../src/video.js';

function locationFor(path) {
    const url = new URL(path, 'https://lms.sysu.edu.cn');
    return { href: url.href, pathname: url.pathname, search: url.search };
}

describe('page classification', () => {
    it.each([
        ['/mod/forum/post.php?reply=12', PAGE_TYPES.FORUM_POST],
        ['/mod/forum/discuss.php?d=3', PAGE_TYPES.FORUM_DISCUSSION],
        ['/mod/fsresource/view.php?id=4', PAGE_TYPES.RESOURCE],
        ['/course/view.php?id=1', PAGE_TYPES.COURSE]
    ])('classifies %s', (path, expected) => {
        document.body.innerHTML = '';
        document.body.id = '';
        expect(classifyPage(document, locationFor(path), '/mod/fsresource/view.php')).toBe(expected);
    });

    it('recognizes forum body ids and video elements', () => {
        document.body.id = 'page-mod-forum-view';
        expect(classifyPage(document, locationFor('/unknown'), '/resource')).toBe(PAGE_TYPES.FORUM_DISCUSSION);
        document.body.id = '';
        document.body.innerHTML = '<video></video>';
        expect(classifyPage(document, locationFor('/course'), '/resource')).toBe(PAGE_TYPES.VIDEO);
    });
});

describe('video helpers', () => {
    it('uses explicit completion text and progress', () => {
        document.body.innerHTML = '<span class="tips-completion"></span>';
        document.querySelector('.tips-completion').innerText = '已完成';
        expect(getCompletionState(document, null).completed).toBe(true);

        document.body.innerHTML = '<div class="num-bfjd"><span></span></div>';
        document.querySelector('.num-bfjd span').innerText = '85.5%';
        expect(getCompletionState(document, { ended: true })).toMatchObject({
            completed: false,
            progress: 85.5,
            videoEnded: true
        });
    });

    it('falls back to video ended without a progress tracker and finds HD', () => {
        document.body.innerHTML = '<div class="quality"><button class="vjs-menu-item"></button></div>';
        document.querySelector('button').innerText = '超清 1080p';
        expect(getCompletionState(document, { ended: true }).completed).toBe(true);
        expect(findHdOption(document.querySelector('.quality'))).toBe(document.querySelector('button'));
    });
});
