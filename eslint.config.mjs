import fs from 'node:fs'
import path from 'node:path'
import js from '@eslint/js'
import globals from 'globals'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import tseslint from 'typescript-eslint'

// ── Renderer cross-file globals ───────────────────────────────────────────────
// The renderer is a set of classic <script> files sharing one global scope, so
// every cross-file reference (navigate, cloneTemplate, loadHomeScreen, ...) is
// an undeclared global as far as ESLint is concerned.
//
// Each file gets a config block listing the top-level declarations of every
// OTHER renderer file. Giving a file its own names would make no-redeclare fire
// on its own declarations; leaving them out keeps that rule useful, so a real
// collision — two files both declaring `TEMPLATES`, which is a runtime
// SyntaxError — still gets reported.
//
// DELETE ALL OF THIS once the renderer moves to <script type="module">: each
// file gets its own scope then, and imports make no-undef work unaided.
const RENDERER_DIRS = ['src/controller', 'src/HTMLUtils']
const DECLARATION_RE = /^(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/gm

const rendererFiles = RENDERER_DIRS.flatMap(dir =>
    fs.readdirSync(dir)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(dir, file)),
)

const declarationsByFile = new Map(rendererFiles.map(file => [
    file,
    [...fs.readFileSync(file, 'utf8').matchAll(DECLARATION_RE)].map(match => match[1]),
]))

const rendererConfigs = rendererFiles.map(file => ({
    files: [file],
    plugins: { 'no-unsanitized': noUnsanitized },
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
        globals: {
            ...globals.browser,
            bootstrap: 'readonly',
            ...Object.fromEntries(
                rendererFiles
                    .filter(other => other !== file)
                    .flatMap(other => declarationsByFile.get(other))
                    .map(name => [name, 'writable']),
            ),
        },
    },
    rules: {
        // Assigning a non-literal to innerHTML/outerHTML, or passing one to
        // insertAdjacentHTML. This is the rule that catches the XSS surface.
        'no-unsanitized/property': 'error',
        'no-unsanitized/method': 'error',

        // vars:'local' skips top-level declarations. In a classic script those
        // are globals, and ESLint lints one file at a time, so it cannot see
        // that cloneTemplate or loadPracticalSetup are used from another file.
        // Locals and arguments are still checked. Switch back to the default
        // 'all' once these files are modules and usage is visible via imports.
        'no-unused-vars': ['warn', { vars: 'local', argsIgnorePattern: '^_' }],
    },
}))

export default [
    { ignores: ['node_modules/**', 'dist/**', 'src/private/**'] },

    js.configs.recommended,

    // ── Main process ──────────────────────────────────────────────────────────
    {
        files: ['src/core/**/*.js', 'src/storage/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node },
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

    ...rendererConfigs,

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
