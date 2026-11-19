import test from "node:test";
import assert from "node:assert/strict";
import Message from "../src/models/Message.model.js";

test("Message Model Schema has expected compound indexes", () => {
  const indexes = Message.schema.indexes();
  
  // Verify that indexes array exists
  assert.ok(Array.isArray(indexes), "Indexes should be an array");

  // Check for { senderId: 1, receiverId: 1, createdAt: -1 }
  const hasSenderReceiverCompound = indexes.some(
    ([fields]) =>
      fields.senderId === 1 &&
      fields.receiverId === 1 &&
      fields.createdAt === -1
  );
  assert.ok(
    hasSenderReceiverCompound,
    "Expected compound index { senderId: 1, receiverId: 1, createdAt: -1 } to exist"
  );

  // Check for { receiverId: 1, senderId: 1, createdAt: -1 }
  const hasReceiverSenderCompound = indexes.some(
    ([fields]) =>
      fields.receiverId === 1 &&
      fields.senderId === 1 &&
      fields.createdAt === -1
  );
  assert.ok(
    hasReceiverSenderCompound,
    "Expected compound index { receiverId: 1, senderId: 1, createdAt: -1 } to exist"
  );

  // Check for single field + createdAt indexes
  const hasSenderCreatedIndex = indexes.some(
    ([fields]) => fields.senderId === 1 && fields.createdAt === -1
  );
  assert.ok(hasSenderCreatedIndex, "Expected index { senderId: 1, createdAt: -1 } to exist");

  const hasReceiverCreatedIndex = indexes.some(
    ([fields]) => fields.receiverId === 1 && fields.createdAt === -1
  );
  assert.ok(hasReceiverCreatedIndex, "Expected index { receiverId: 1, createdAt: -1 } to exist");
});
