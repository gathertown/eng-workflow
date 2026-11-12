/** @type {import("jest").Config} */
const config = {
  displayName: "write-like-andrew",
  transform: {
    "^.+\\.ts$": ["@swc/jest", { jsc: { parser: { syntax: "typescript" }, target: "es2022" } }],
  },
}

export default config
