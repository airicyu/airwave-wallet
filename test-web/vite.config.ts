import { Buffer } from "node:buffer";
import { defineConfig, type Plugin } from "vite";

function solanaRpcProxy(): Plugin {
  return {
    name: "solana-rpc-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/solana-rpc") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const target = req.headers["x-solana-rpc"];
        if (typeof target !== "string" || !/^https:\/\//i.test(target)) {
          res.statusCode = 400;
          res.end("RPC URL must be https");
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on("end", () => {
          void fetch(target, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: Buffer.concat(chunks),
          })
            .then(async (upstream) => {
              const text = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader("content-type", "application/json");
              res.end(text);
            })
            .catch((error: unknown) => {
              res.statusCode = 502;
              res.end(error instanceof Error ? error.message : String(error));
            });
        });
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/openrouter": {
        target: "https://openrouter.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openrouter/, ""),
      },
    },
  },
  plugins: [solanaRpcProxy()],
});
