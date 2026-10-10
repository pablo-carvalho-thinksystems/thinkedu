export const CURRENT_VERSION: string;
export interface ReleasePolicy {
  enabled: boolean;
  latestVersion: string;
  latestBuild: number;
  minimumVersion: string;
  storeUrl: string;
  releaseNotes: string;
}
export function compareVersions(a: string, b: string): number;
export function releasePolicy(
  input?: Partial<ReleasePolicy>,
  platform?: string,
): ReleasePolicy;
export function updateAvailable(
  version: string,
  build: string | number,
  policy: ReleasePolicy,
): (ReleasePolicy & { required: boolean }) | null;
