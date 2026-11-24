import assert from "node:assert/strict";
import { once } from "node:events";
import { describe, it } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import { adminLoginRateLimit } from "../../middleware/admin-login-rate-limit.middleware.js";
import { requireAdmin } from "../../middleware/admin-auth.middleware.js";

describe("administrator authentication middleware", () => {
  it("rejects dashboard requests without a session cookie", async () => {
    const app = express();
    app.use(cookieParser());
    app.get("/protected", requireAdmin, (_req, res) => res.json({ ok: true }));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      assert(address && typeof address !== "string");
      const response = await fetch(`http://127.0.0.1:${address.port}/protected`);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: {
          code: "ADMIN_AUTH_REQUIRED",
          message: "Please sign in to access the administrator portal.",
        },
      });
    } finally {
      const closed = once(server, "close");
      server.close();
      await closed;
    }
  });

  it("limits repeated administrator login attempts", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", adminLoginRateLimit, (_req, res) => res.status(204).end());
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      assert(address && typeof address !== "string");
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 11; attempt += 1) {
        const response = await fetch(`http://127.0.0.1:${address.port}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        statuses.push(response.status);
      }
      assert.deepEqual(statuses.slice(0, 10), Array(10).fill(204));
      assert.equal(statuses[10], 429);
    } finally {
      const closed = once(server, "close");
      server.close();
      await closed;
    }
  });
});
