import test from "node:test";
import assert from "node:assert/strict";
import {
  addSocketSession,
  removeSocketSession,
  getAllOnlineUserIds,
} from "../src/lib/redis.js";
import { getReceiverRoom } from "../src/lib/socket.js";

test("getReceiverRoom formats room name consistently for multi-device delivery", () => {
  const room = getReceiverRoom("user123");
  assert.strictEqual(room, "user:user123");
});

test("addSocketSession and removeSocketSession manage multi-tab presence without race conditions", async () => {
  const userId = "testUser_999";
  const socketTab1 = "socket_tab_1";
  const socketTab2 = "socket_tab_2";

  // Tab 1 connects -> First connection
  const r1 = await addSocketSession(userId, socketTab1);
  assert.strictEqual(r1.isFirstConnection, true, "First tab should register as first connection");

  // Tab 2 connects -> Not first connection
  const r2 = await addSocketSession(userId, socketTab2);
  assert.strictEqual(r2.isFirstConnection, false, "Second tab should not trigger first connection");

  // Tab 1 disconnects -> Not last connection (Tab 2 is still open)
  const r3 = await removeSocketSession(userId, socketTab1);
  assert.strictEqual(r3.isLastConnection, false, "Disconnecting tab 1 should keep user online");

  // Tab 2 disconnects -> Last connection
  const r4 = await removeSocketSession(userId, socketTab2);
  assert.strictEqual(r4.isLastConnection, true, "Disconnecting tab 2 should mark user offline");
});
