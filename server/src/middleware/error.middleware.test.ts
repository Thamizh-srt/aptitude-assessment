import assert from "node:assert/strict";
import { once } from "node:events";
import { describe, it } from "node:test";
import express from "express";
import mongoose from "mongoose";
import { errorHandler } from "./error.middleware.js";

describe("centralized error handling", () => {
  it("explains that transaction operations require a MongoDB replica set", async () => {
    const app = express();
    app.get("/transaction", (_req, _res, next) => {
      next(
        new mongoose.mongo.MongoServerError({
          message: "Transaction numbers are only allowed on a replica set member or mongos",
          code: 20,
        }),
      );
    });
    app.use(errorHandler);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      assert(address && typeof address !== "string");
      const response = await fetch(`http://127.0.0.1:${address.port}/transaction`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: {
          code: "MONGODB_REPLICA_SET_REQUIRED",
          message:
            "This operation requires MongoDB transactions. Configure a replica-set deployment such as MongoDB Atlas.",
        },
      });
    } finally {
      const closed = once(server, "close");
      server.close();
      await closed;
    }
  });
});
