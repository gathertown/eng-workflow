/**
 * Standalone Jest config, so felix-loop's pure-function tests run with only this package's
 * devDependencies.
 */

/** @type {import("jest").Config} */
const config = {
  displayName: "felix-loop",
  transform: {
    "^.+\\.tsx?$": ["@swc/jest", { jsc: { parser: { syntax: "typescript" }, target: "es2022" } }],
  },
}

export default config
