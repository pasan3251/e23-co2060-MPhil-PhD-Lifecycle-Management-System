import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("removed privileged security surfaces", () => {
  it("does not register the legacy Firebase claims mutation route", () => {
    expect(
      existsSync(
        join(process.cwd(), "src", "app", "api", "auth", "claims", "route.ts"),
      ),
    ).toBe(false);
  });
});
