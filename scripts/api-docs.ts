import { openApiDocument } from "../src/lib/openapi";

console.log(`OpenAPI document contains ${Object.keys(openApiDocument.paths).length} paths.`);
console.log("Run npm run dev and open http://localhost:3000/api-docs");
