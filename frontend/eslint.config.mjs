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
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import regexp from 'eslint-plugin-regexp';
import preferArrow from 'eslint-plugin-prefer-arrow';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    ignores: ['dist/', 'playwright-report/', 'node_modules/', '*.config.js', '*.config.mjs'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      jsdoc,
      unicorn: unicorn,
      sonarjs: sonarjs,
      security: security,
      promise: promise,
      import: importPlugin,
      'eslint-comments': comments,
      regexp: regexp,
      'prefer-arrow': preferArrow,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json'],
        },
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'security/detect-object-injection': 'error',
      'unicorn/prefer-spread': 'error',
      'sonarjs/no-duplicate-string': 'error',
      'promise/always-return': 'error',
      'promise/no-nesting': 'error',
      'import/order': [
        'error',
        { groups: ['builtin', 'external', 'internal', 'parent', 'sibling'] },
      ],
      'prefer-arrow/prefer-arrow-functions': 'error',
      'regexp/no-empty-group': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      curly: ['error', 'all'],
      'prefer-template': 'error',
      indent: ['error', 2],
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'quote-props': ['error', 'as-needed'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
          },
        },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.js',
      '*.config.mjs',
      'tailwind.config.js',
      'postcss.config.js',
      'vite.config.js',
    ],
  },
];
