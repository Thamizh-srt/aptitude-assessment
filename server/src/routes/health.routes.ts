import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "aptitude-assessment-api" });
});

healthRouter.get("/health/db", async (_req, res, next) => {
  try {
    await mongoose.connection.db?.admin().ping();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});
