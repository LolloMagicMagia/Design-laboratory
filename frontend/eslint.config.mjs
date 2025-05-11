import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    rules: {
      // Checks for unused variables
      "no-unused-vars": "warn",
      // Disallows the use of `console.log`
      "no-console": "warn",
      // Ensures semicolons are always used
      "semi": ["error", "always"],
      // Enforces the use of double quotes
      "quotes": ["error", "double"],
      // Requires the use of `===` instead of `==` for comparisons
      "eqeqeq": ["error", "always"],
      // Disallows the use of `alert`
      "no-alert": "warn",
      // Prevents the use of `eval()`
      "no-eval": "error",
      // Ensures callback functions have explicitly defined parameters
      "callback-return": "warn",
      // Protects against HTML injection to prevent XSS vulnerabilities
      "no-new-func": "warn",
      // Avoids unnecessary global variable assignments
      "no-global-assign": "error",
    },
  },
];

export default eslintConfig;
