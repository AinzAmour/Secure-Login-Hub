import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const apiZodIndex = resolve(root, "lib", "api-zod", "src", "index.ts");

writeFileSync(
  apiZodIndex,
  `export * from "./generated/api";\n`,
);
