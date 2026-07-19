import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    createNavigationScheduler,
    getNavigationCancellation
} from '../src/navigation.js';
import { createTimerProxy, installTimerAcceleration } from '../src/timers.js';

afterEach(() => vi.useRealTimers());

describe('timer acceleration', () => {
    it('scales positive delays while preserving zero and invalid delays', () => {
        const original = vi.fn(() => 42);
        const proxy = createTimerProxy(original, 'setTimeout', () => 10, 10);
        expect(proxy(() => {}, 500)).toBe(42);
        expect(original).toHaveBeenLastCalledWith(expect.any(Function), 50);
        proxy(() => {}, 5);
        expect(original).toHaveBeenLastCalledWith(expect.any(Function), 10);
        proxy(() => {}, 0);
        expect(original).toHaveBeenLastCalledWith(expect.any(Function), 0);
        proxy(() => {}, 'soon');
        expect(original).toHaveBeenLastCalledWith(expect.any(Function), 'soon');
    });

    it('installs proxies only on enabled resource pages', () => {
        const originalTimeout = vi.fn();
        const originalInterval = vi.fn();
        const targetWindow = {
            location: { pathname: '/mod/fsresource/view.php' },
            setTimeout: originalTimeout,
            setInterval: originalInterval
        };
        const nativeTimers = { setTimeout: originalTimeout, setInterval: originalInterval };
        expect(installTimerAcceleration({
            targetWindow,
            nativeTimers,
            resourcePath: '/mod/fsresource/view.php',
            enabled: true,
            getSpeedFactor: () => 5,
            minimumDelay: 10
        })).toBe(true);
        expect(targetWindow.setTimeout).not.toBe(originalTimeout);

        targetWindow.location.pathname = '/course/view.php';
        expect(installTimerAcceleration({
            targetWindow,
            nativeTimers,
            resourcePath: '/mod/fsresource/view.php',
            enabled: true,
            getSpeedFactor: () => 5,
            minimumDelay: 10
        })).toBe(false);
    });
});

describe('navigation scheduler', () => {
    it('maps setting changes to the correct cancellation scope', () => {
        expect(getNavigationCancellation('assistantEnabled', { assistantEnabled: false })).toBe('all');
        expect(getNavigationCancellation('autoNext', { autoNext: false })).toBe('auto-next');
        expect(getNavigationCancellation('skipForum', { skipForum: false })).toBe('forum-skip');
        expect(getNavigationCancellation('autoCompleteForum', { autoCompleteForum: true })).toBe('forum-skip');
        expect(getNavigationCancellation('forumReplyTemplates', {})).toBeNull();
    });

    it('cancels a pending navigation before click and fallback', () => {
        vi.useFakeTimers();
        const timers = {
            setTimeout,
            clearTimeout
        };
        const location = { href: 'https://lms.sysu.edu.cn/current' };
        const link = { href: 'https://lms.sysu.edu.cn/next', click: vi.fn() };
        const scheduler = createNavigationScheduler(timers, location);

        expect(scheduler.schedule({
            kind: 'auto-next',
            link,
            delay: 1000,
            isCurrent: () => true,
            onNavigate: vi.fn()
        })).toBe(true);
        expect(scheduler.cancel('auto-next')?.kind).toBe('auto-next');
        vi.runAllTimers();
        expect(link.click).not.toHaveBeenCalled();
        expect(location.href).toBe('https://lms.sysu.edu.cn/current');
    });

    it('checks current settings before navigating and avoids duplicates', () => {
        vi.useFakeTimers();
        const scheduler = createNavigationScheduler({ setTimeout, clearTimeout }, { href: 'current' });
        const link = { href: 'next', click: vi.fn() };
        const request = {
            kind: 'forum-skip',
            link,
            delay: 1000,
            isCurrent: () => false,
            onNavigate: vi.fn()
        };
        expect(scheduler.schedule(request)).toBe(true);
        expect(scheduler.schedule(request)).toBe(false);
        vi.advanceTimersByTime(1000);
        expect(link.click).not.toHaveBeenCalled();
        expect(scheduler.getPending()).toBeNull();
    });

    it('clicks once and uses the URL fallback when the page does not navigate', () => {
        vi.useFakeTimers();
        const location = { href: 'current' };
        const link = { href: 'next', click: vi.fn() };
        const onNavigate = vi.fn();
        const scheduler = createNavigationScheduler({ setTimeout, clearTimeout }, location);
        scheduler.schedule({
            kind: 'auto-next',
            link,
            delay: 1000,
            isCurrent: () => true,
            onNavigate
        });
        vi.advanceTimersByTime(1000);
        expect(link.click).toHaveBeenCalledOnce();
        expect(onNavigate).toHaveBeenCalledOnce();
        vi.advanceTimersByTime(1000);
        expect(location.href).toBe('next');
    });
});
