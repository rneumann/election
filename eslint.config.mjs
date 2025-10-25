// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([

  js.configs.recommended,

  pluginReact.configs.flat.recommended,


  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, 
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "react/react-in-jsx-scope": "off", 
      "react/prop-types": "off", 
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);
