import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
test("source artwork is the verified upstream JPEG, not a substituted image", () => {
  const bytes = fs.readFileSync("generated-2.png");
  assert.equal(bytes.length, 525270);
  assert.deepEqual([...bytes.subarray(0, 3)], [255, 216, 255]);
  assert.equal(
    crypto
      .createHash("sha1")
      .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
      .digest("hex"),
    "695959f19193258f3929f875e5b776373dd81cae",
  );
});
