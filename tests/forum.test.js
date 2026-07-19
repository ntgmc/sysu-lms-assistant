import { describe, expect, it, vi } from 'vitest';
import {
    fillForumReply,
    findForumSubmitButton,
    findForumTextarea,
    getForumActivityId,
    getForumCompletionRequirement,
    getForumDiscussionId,
    getReplyTargets
} from '../src/forum-dom.js';
import {
    createForumTaskStore,
    isForumTaskExpired,
    isValidForumTask
} from '../src/forum-task.js';

const baseTask = {
    activityId: '42',
    discussionId: '7',
    sourceUrl: 'https://lms.sysu.edu.cn/mod/forum/view.php?id=42',
    replyPostId: '9',
    replyText: '同意',
    phase: 'opening',
    verifyReloaded: false,
    startedAt: 1000,
    errorCode: null
};

describe('forum task state', () => {
    it('validates supported phases and expiration', () => {
        expect(isValidForumTask(baseTask)).toBe(true);
        expect(isValidForumTask({ ...baseTask, phase: 'unknown' })).toBe(false);
        expect(isValidForumTask({ ...baseTask, replyText: ' ' })).toBe(false);
        expect(isForumTaskExpired(baseTask, 11_001, 10_000)).toBe(true);
    });

    it('round-trips storage and handles failures', () => {
        const values = new Map();
        const storage = {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
            removeItem: (key) => values.delete(key)
        };
        const store = createForumTaskStore(storage, 'task');
        expect(store.write(baseTask)).toBe(true);
        expect(store.read()).toEqual(baseTask);
        expect(store.clear()).toBe(true);
        expect(store.read()).toBeNull();

        const denied = createForumTaskStore({
            getItem: () => { throw new Error('denied'); },
            setItem: () => { throw new Error('denied'); },
            removeItem: () => { throw new Error('denied'); }
        }, 'task');
        expect(denied.read()).toBeNull();
        expect(denied.write(baseTask)).toBe(false);
        expect(denied.clear()).toBe(false);
    });
});

describe('Moodle forum adapter', () => {
    it('recognizes completion variants and activity ids', () => {
        document.body.innerHTML = `
            <div data-region="completionrequirements">
                <div role="listitem" class="alert-success">发表论坛帖子</div>
            </div>`;
        expect(getForumCompletionRequirement(document)).toMatchObject({
            recognized: true,
            completed: true
        });
        expect(getForumActivityId({ href: 'https://lms.sysu.edu.cn/mod/forum/view.php?id=42' })).toBe('42');
        expect(getForumActivityId({ href: 'https://lms.sysu.edu.cn/mod/forum/discuss.php?d=7' })).toBe('d:7');
    });

    it('prefers ordinary same-origin reply targets and finds discussion ids', () => {
        document.head.innerHTML = '<base href="https://lms.sysu.edu.cn/">';
        document.body.innerHTML = `
            <div class="firstpost starter"><a data-action="collapsible-link" href="/mod/forum/post.php?reply=1">reply</a></div>
            <div><a data-action="collapsible-link" href="/mod/forum/post.php?reply=2">reply</a></div>
            <a href="/mod/forum/discuss.php?d=77">discussion</a>`;
        const location = new URL('https://lms.sysu.edu.cn/mod/forum/view.php?id=42');
        expect(getReplyTargets(document, location).map((target) => target.replyPostId)).toEqual(['2']);
        expect(getForumDiscussionId(document, location)).toBe('77');
    });

    it('fills the native form and avoids cancel buttons', () => {
        document.body.innerHTML = `
            <form>
                <textarea name="message[text]"></textarea>
                <button type="submit" name="cancel">取消</button>
                <button type="submit" name="submitbutton">发表</button>
            </form>`;
        const form = document.querySelector('form');
        const textarea = findForumTextarea(form);
        const inputListener = vi.fn();
        textarea.addEventListener('input', inputListener);
        fillForumReply(textarea, null, '支持');
        expect(textarea.value).toBe('支持');
        expect(inputListener).toHaveBeenCalledOnce();
        expect(findForumSubmitButton(form).name).toBe('submitbutton');
    });
});
