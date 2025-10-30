// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import promise from 'eslint-plugin-promise';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-n';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import regexp from 'eslint-plugin-regexp';
import preferArrow from 'eslint-plugin-prefer-arrow';
import packageJson from 'eslint-plugin-package-json';
import jsoncParser from 'jsonc-eslint-parser';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  js.configs.recommended,
  {
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
    },
  },

  // Allgemeine Konfig für JS-Dateien
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      jsdoc,
      unicorn: unicorn,
      sonarjs: sonarjs,
      security: security,
      promise: promise,
      import: importPlugin,
      n: nodePlugin,
      'eslint-comments': comments,
      regexp: regexp,
      'prefer-arrow': preferArrow,
    },
    settings: {
      'import/node-version': '24.10.0',
      react: { version: 'detect' },
    },
    rules: {
      'security/detect-object-injection': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/no-process-exit': 'off',
      'sonarjs/no-duplicate-string': 'error',
      'promise/always-return': 'error',
      'promise/no-nesting': 'error',
      'import/no-unresolved': [
        'error',
        { ignore: ['@stylistic/eslint-plugin-js', 'eslint-plugin-jest', 'eslint/config'] },
      ],
      'import/order': [
        'error',
        { groups: ['builtin', 'external', 'internal', 'parent', 'sibling'] },
      ],
      'n/no-sync': 'error',
      'n/prefer-promises/fs': 'error',
      'prefer-arrow/prefer-arrow-functions': 'error',
      'regexp/no-empty-group': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'no-magic-numbers': ['error', { ignore: [0, 1, -1, 2] }],
      curly: ['error', 'all'],
      'prefer-template': 'error',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      indent: ['error', 2],
      semi: ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false, // optional
          },
        },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
    },
  },

  // React/Frontend-Dateien
  {
    files: ['**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      'react/prop-types': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx'] }],
      'react-hooks/exhaustive-deps': 'warn',
      indent: ['error', 2],
      semi: ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
    },
  },

  // package.json
  {
    files: ['package.json'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: { 'package-json': packageJson },
    rules: { ...packageJson.configs.recommended.rules },
  },
];
