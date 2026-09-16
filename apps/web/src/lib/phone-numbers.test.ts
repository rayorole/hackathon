import assert from "node:assert/strict";
import { test } from "node:test";
import { phoneNumbers, phonePresentation } from "./phone-numbers";

test("separates the two TIPTOPVOETEN phone numbers", () => {
  assert.deepEqual(phoneNumbers("+3233268965 +32478911343"), ["+3233268965", "+32478911343"]);
});
test("preserves a single formatted number", () => {
  assert.deepEqual(phoneNumbers("03 326 89 65"), ["03 326 89 65"]);
  assert.deepEqual(phoneNumbers("+32 (0)3 326 89 65"), ["+32 (0)3 326 89 65"]);
});
test("deduplicates repeated numbers and handles explicit list separators", () => {
  assert.deepEqual(phoneNumbers("+32 3 326 89 65; +3233268965, 003233268965\n0478 91 13 43"), ["+32 3 326 89 65", "0478 91 13 43"]);
});

test("Belgian contacts get readable values and distinct labels", () => {
  assert.deepEqual(phonePresentation("+3233268965"), { label: "landline", value: "03 326 89 65" });
  assert.deepEqual(phonePresentation("+32478911343"), { label: "mobile", value: "0478 91 13 43" });
  assert.deepEqual(phonePresentation("+33123456789"), { label: "phone", value: "+33123456789" });
  assert.equal(phoneNumbers("03 326 89 65; +32 (0)3 326 89 65").length, 1);
});
