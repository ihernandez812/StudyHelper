import js from '@eslint/js'
import globals from 'globals'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import tseslint from 'typescript-eslint'

export default [
    { ignores: ['node_modules/**', 'dist/**', 'src/private/**'] },

    js.configs.recommended,

    // ── Main process ──────────────────────────────────────────────────────────
    {
        // preload runs in a Node context with require(), same as main
        files: ['src/main/**/*.js', 'src/preload/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },

    // ── Renderer ──────────────────────────────────────────────────────────────
    // ES modules, so every file has its own scope and no-undef works off the
    // imports. Bootstrap is the one real global: it is loaded by a classic
    // <script> in view.html because bare specifiers do not resolve in a browser.
    {
        files: ['src/renderer/**/*.js'],
        plugins: { 'no-unsanitized': noUnsanitized },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                bootstrap: 'readonly',
            },
        },
        rules: {
            // Assigning a non-literal to innerHTML/outerHTML, or passing one to
            // insertAdjacentHTML. This is the rule that catches the XSS surface.
            'no-unsanitized/property': 'error',
            'no-unsanitized/method': 'error',
        },
    },

    // ── Shared rules ──────────────────────────────────────────────────────────
    {
        files: ['src/**/*.js'],
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'prefer-const': 'warn',
            'eqeqeq': ['warn', 'smart'],
            'no-var': 'warn',
        },
    },

    // ── Type-aware rules ──────────────────────────────────────────────────────
    // Uses the TypeScript parser to build a real type model of the plain JS
    // (see tsconfig.json — nothing is compiled or emitted). That model is what
    // lets ESLint know window.api.getChecklistById returns a Promise, which no
    // amount of syntax-only linting can tell.
    //
    // Placed last so it overrides the parser without disturbing the globals and
    // sourceType set by the blocks above; languageOptions merges key by key.
    {
        files: ['src/**/*.js'],
        plugins: { '@typescript-eslint': tseslint.plugin },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            // checksVoidReturn.arguments off: it fires on every async event
            // handler passed to addEventListener, which is the normal way to
            // write one and which we already wrap in try/catch. The check
            // exists mainly to catch forEach(async ...) — there are none here,
            // and no-floating-promises still covers the un-awaited calls.
            // The conditional and spread checks stay on.
            '@typescript-eslint/no-misused-promises': [
                'error',
                { checksVoidReturn: { arguments: false } },
            ],
            '@typescript-eslint/await-thenable': 'warn',
        },
    },
]
