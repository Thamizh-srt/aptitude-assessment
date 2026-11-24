import { randomBytes } from "node:crypto";

export function createPublicId() {
  return randomBytes(16).toString("hex");
}
