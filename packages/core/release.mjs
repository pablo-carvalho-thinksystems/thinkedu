export const CURRENT_VERSION = "0.1.0";
export function compareVersions(a, b) {
  const parse = (v) => {
    if (typeof v !== "string" || !/^\d+\.\d+\.\d+$/.test(v))
      throw Error("Versão inválida.");
    return v.split(".").map(Number);
  };
  const left = parse(a),
    right = parse(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}
export function releasePolicy(input = {}, platform = "ios") {
  const off = {
    enabled: false,
    latestVersion: CURRENT_VERSION,
    latestBuild: 1,
    minimumVersion: "0.1.0",
    storeUrl: "",
    releaseNotes: "",
  };
  try {
    if (!["ios", "android"].includes(platform) || input.enabled !== true)
      return off;
    compareVersions(input.latestVersion, input.minimumVersion || "0.1.0");
    if (
      compareVersions(input.latestVersion, input.minimumVersion || "0.1.0") < 0
    )
      return off;
    if (!Number.isSafeInteger(input.latestBuild) || input.latestBuild < 1)
      return off;
    const url = new URL(input.storeUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return off;
    const valid =
      platform === "ios"
        ? url.hostname === "apps.apple.com" && /\/id\d+$/.test(url.pathname)
        : url.hostname === "play.google.com" &&
          url.pathname === "/store/apps/details" &&
          url.searchParams.get("id") === "com.thinksystems.thinkedu";
    if (!valid) return off;
    return {
      ...off,
      ...input,
      enabled: true,
      minimumVersion: input.minimumVersion || "0.1.0",
      releaseNotes: String(input.releaseNotes || "").slice(0, 2000),
    };
  } catch {
    return off;
  }
}
export function updateAvailable(version, build, policy) {
  if (!policy.enabled) return null;
  try {
    const compare = compareVersions(policy.latestVersion, version);
    if (compare < 0 || (compare === 0 && policy.latestBuild <= Number(build)))
      return null;
    return {
      ...policy,
      required: compareVersions(version, policy.minimumVersion) < 0,
    };
  } catch {
    return null;
  }
}
