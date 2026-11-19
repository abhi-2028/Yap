import test from "node:test";
import assert from "node:assert/strict";
import {
  signupSchema,
  loginSchema,
  sendMessageSchema,
} from "../src/middleware/validate.middleware.js";

test("signupSchema validates correct data and rejects invalid inputs", () => {
  const valid = signupSchema.safeParse({
    fullName: "Alice Doe",
    email: "Alice@example.COM",
    password: "securepassword123",
  });
  assert.strictEqual(valid.success, true);
  assert.strictEqual(valid.data.email, "alice@example.com"); // Normalizes lowercase

  const invalidEmail = signupSchema.safeParse({
    fullName: "Alice",
    email: "notanemail",
    password: "123456",
  });
  assert.strictEqual(invalidEmail.success, false);

  const shortPassword = signupSchema.safeParse({
    fullName: "Alice",
    email: "alice@example.com",
    password: "123",
  });
  assert.strictEqual(shortPassword.success, false);
});

test("sendMessageSchema validates that either text or image must be provided", () => {
  // Text only
  const res1 = sendMessageSchema.safeParse({ text: "Hello world" });
  assert.strictEqual(res1.success, true);

  // Image only
  const res2 = sendMessageSchema.safeParse({ image: "data:image/png;base64,..." });
  assert.strictEqual(res2.success, true);

  // Neither provided
  const res3 = sendMessageSchema.safeParse({ text: "", image: "" });
  assert.strictEqual(res3.success, false);

  // Empty payload
  const res4 = sendMessageSchema.safeParse({});
  assert.strictEqual(res4.success, false);
});
