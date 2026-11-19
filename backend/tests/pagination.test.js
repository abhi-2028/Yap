import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

test("Cursor pagination logic handles limits and ObjectId cursors correctly", () => {
  const parseQueryParams = (query) => {
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const cursor = query.cursor;
    const filter = {
      $or: [
        { senderId: "userA", receiverId: "userB" },
        { senderId: "userB", receiverId: "userA" },
      ],
    };

    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    return { limit, filter };
  };

  // Default limit
  const res1 = parseQueryParams({});
  assert.strictEqual(res1.limit, 50);
  assert.strictEqual(res1.filter._id, undefined);

  // Custom limit under max
  const res2 = parseQueryParams({ limit: "25" });
  assert.strictEqual(res2.limit, 25);

  // Clamped limit exceeding max 100
  const res3 = parseQueryParams({ limit: "500" });
  assert.strictEqual(res3.limit, 100);

  // Valid cursor
  const validId = new mongoose.Types.ObjectId().toString();
  const res4 = parseQueryParams({ cursor: validId });
  assert.ok(res4.filter._id);
  assert.strictEqual(res4.filter._id.$lt.toString(), validId);

  // Invalid cursor string should be ignored safely without throwing
  const res5 = parseQueryParams({ cursor: "not-an-id" });
  assert.strictEqual(res5.filter._id, undefined);
});
