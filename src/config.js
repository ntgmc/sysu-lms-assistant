export const VERSION = '2.2.0';
export const INSTANCE_KEY = '__SYSU_LMS_ASSISTANT_V2__';
export const STORAGE_KEY = 'sysu_lms_assistant_settings_v2';
export const LEGACY_RUNNING_KEY = 'lms_script_running';
export const RESOURCE_PATH = '/mod/fsresource/view.php';
export const CHECK_INTERVAL = 1000;
export const DELAY_BEFORE_NEXT = 1000;
export const SKIP_FORUM_DELAY = 2000;
export const FORUM_TASK_STORAGE_KEY = 'sysu_lms_forum_task_v1';
export const FORUM_FORM_TIMEOUT = 10000;
export const FORUM_VERIFICATION_DELAY = 3000;
export const FORUM_TASK_MAX_AGE = 10 * 60 * 1000;
export const MIN_TIMER_DELAY = 10;
export const SPEED_FACTORS = Object.freeze([2, 5, 10, 25, 50]);

export const DEFAULT_SETTINGS = Object.freeze({
    assistantEnabled: true,
    autoPlay: true,
    autoNext: true,
    autoQuality: true,
    skipForum: true,
    autoCompleteForum: false,
    forumReplyTemplates: '同意|赞同|支持',
    timerAcceleration: false,
    speedFactor: 10,
    panelExpanded: false
});

export const BOOLEAN_SETTING_KEYS = Object.freeze([
    'assistantEnabled',
    'autoPlay',
    'autoNext',
    'autoQuality',
    'skipForum',
    'autoCompleteForum',
    'timerAcceleration',
    'panelExpanded'
]);
