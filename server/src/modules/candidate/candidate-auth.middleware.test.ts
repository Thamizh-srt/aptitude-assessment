import assert from "node:assert/strict";
import { once } from "node:events";
import { describe, it } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import { errorHandler } from "../../middleware/error.middleware.js";
import { requireClientOrigin } from "../../middleware/candidate-auth.middleware.js";
import { env } from "../../lib/env.js";
import { assessmentRouter } from "../assessment/assessment.routes.js";

describe("candidate assessment authentication", () => {
  it("rejects assessment access without a verified candidate session", async () => {
    const app = express();
    app.use(cookieParser());
    app.use("/api/assessment", assessmentRouter);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      assert(address && typeof address !== "string");
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/assessment/0123456789abcdef01234567/instructions`,
      );
      assert.equal(response.status, 401);
      assert.equal(
        (await response.json()).error.code,
        "CANDIDATE_AUTH_REQUIRED",
      );
    } finally {
      const closed = once(server, "close");
      server.close();
      await closed;
    }
  });

  it("rejects state-changing requests from an unconfigured origin", async () => {
    const app = express();
    app.post("/mutate", requireClientOrigin, (_req, res) => res.sendStatus(204));
    app.use(errorHandler);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      assert(address && typeof address !== "string");
      const response = await fetch(`http://127.0.0.1:${address.port}/mutate`, {
        method: "POST",
        headers: { Origin: "https://untrusted.example" },
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error.code, "ORIGIN_NOT_ALLOWED");

      const allowedResponse = await fetch(
        `http://127.0.0.1:${address.port}/mutate`,
        { method: "POST", headers: { Origin: env.CLIENT_ORIGIN } },
      );
      assert.equal(allowedResponse.status, 204);
    } finally {
      const closed = once(server, "close");
      server.close();
      await closed;
    }
  });
});
