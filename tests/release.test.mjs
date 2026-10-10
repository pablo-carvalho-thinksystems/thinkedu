import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  releasePolicy,
  updateAvailable,
} from "../packages/core/release.mjs";
const input = {
  enabled: true,
  latestVersion: "1.10.0",
  latestBuild: 12,
  minimumVersion: "1.0.0",
  storeUrl: "https://apps.apple.com/br/app/thinkedu/id123456",
};
test("versões são comparadas numericamente e builds identificam correções", () => {
  assert.equal(compareVersions("1.10.0", "1.2.0"), 1);
  const p = releasePolicy(input);
  assert.equal(updateAvailable("1.10.0", 11, p).required, false);
  assert.equal(updateAvailable("1.10.0", 12, p), null);
  assert.equal(updateAvailable("2.0.0", 1, p), null);
  assert.equal(updateAvailable("0.9.0", 1, p).required, true);
});
test("sem links oficiais ou configuração válida o aviso fica desativado", () => {
  for (const url of [
    "",
    "https://example.com/id123",
    "http://apps.apple.com/id123",
    "https://apps.apple.com.evil.com/id123",
  ])
    assert.equal(releasePolicy({ ...input, storeUrl: url }).enabled, false);
  assert.equal(releasePolicy().enabled, false);
  assert.equal(
    releasePolicy({ ...input, minimumVersion: "2.0.0" }).enabled,
    false,
  );
  assert.equal(releasePolicy({ ...input, latestBuild: -1 }).enabled, false);
  assert.equal(
    releasePolicy(
      {
        ...input,
        storeUrl:
          "https://play.google.com/store/apps/details?id=com.thinksystems.thinkedu",
      },
      "android",
    ).enabled,
    true,
  );
});
