import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'coverage/**',
            'lms-script.user.js',
            'time-hacker.user.js'
        ]
    },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.browser
        },
        rules: {
            'no-console': 'off'
        }
    },
    {
        files: ['scripts/**/*.mjs', 'vitest.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node
        }
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    }
];
