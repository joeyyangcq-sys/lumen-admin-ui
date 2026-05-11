import { FIXTURE_PREFIX } from "./env";
import { gateway } from "./gateway-client";

/**
 * Belt-and-braces cleanup — every test should clean up after itself, but if
 * one of them aborted half-way, this guarantees we don't leak fixtures into
 * subsequent runs.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    await gateway.cleanupFixtures(FIXTURE_PREFIX);
  } catch (err) {
    // Don't fail the whole suite over teardown — surface the warning instead.
    process.stderr.write(
      `[e2e] global-teardown cleanup failed: ${(err as Error).message}\n`,
    );
  }
}
