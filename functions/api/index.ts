/**
 * Welcome to Cloudflare Workers!
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createPlaceholders } from "../controllers/create-placeholders";
import { updateMetadatas } from "../controllers/update-metadatas";

const methodNotAllowed = (allowedMethods: string[]) => {
  return new Response(
    JSON.stringify({ result: "Method not allowed", allowedMethods }),
    { status: 405, headers: { "Content-Type": "application/json" } },
  );
};

export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/create-placeholders": {
        if (request.method !== "POST") {
          return methodNotAllowed(["POST"]);
        }
        return createPlaceholders(request, env);
      }

      case "/update-metadatas": {
        if (request.method !== "PUT") {
          return methodNotAllowed(["PUT"]);
        }
        return updateMetadatas(request, env);
      }

      default:
        return new Response(JSON.stringify({ result: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
    }
  },
};
