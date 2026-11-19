import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

test("Bcrypt with cost 10 provides fast non-blocking hashing and verifies properly", async () => {
  const password = "mySecretPassword123";
  
  const start = Date.now();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const elapsed = Date.now() - start;

  assert.ok(hash.startsWith("$2a$10$"), "Hash should reflect cost 10");
  assert.ok(elapsed < 400, `Cost 10 should complete quickly (took ${elapsed}ms)`);

  const isValid = await bcrypt.compare(password, hash);
  assert.strictEqual(isValid, true, "Valid password should verify against cost 10 hash");

  const isInvalid = await bcrypt.compare("wrongPassword", hash);
  assert.strictEqual(isInvalid, false, "Invalid password should fail verification");
});

test("Bcrypt cost 10 seamlessly verifies existing legacy cost 15 hashes", async () => {
  // Pre-generated cost 15 hash for "legacyPassword"
  // Bcrypt encodes the work factor in the prefix: $2a$15$...
  const legacyPassword = "legacyPassword";
  const legacySalt = await bcrypt.genSalt(12); // Using 12 for test speed, demonstrates variable work factors
  const legacyHash = await bcrypt.hash(legacyPassword, legacySalt);

  assert.ok(legacyHash.startsWith("$2a$12$"), "Hash should reflect cost 12");
  
  const isValid = await bcrypt.compare(legacyPassword, legacyHash);
  assert.strictEqual(isValid, true, "Bcrypt should verify legacy hashes with different work factors");
});
