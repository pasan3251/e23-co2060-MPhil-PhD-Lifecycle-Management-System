import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    researchProposal: { findUnique: vi.fn() },
    supervisor: { findUnique: vi.fn() },
    supervisorAssignment: { findUnique: vi.fn() },
    document: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  },
}));

import { checkAccess, AccessError } from "@/lib/proposals/versions";
import { UserRole } from "@prisma/client";

describe("Proposal Access Control (Unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should block EXAMINERs with a 403 Forbidden", async () => {
    await expect(
      checkAccess("prop-1", "user-examiner", UserRole.EXAMINER)
    ).rejects.toThrowError(AccessError);
    
    await expect(
      checkAccess("prop-1", "user-examiner", UserRole.EXAMINER)
    ).rejects.toThrow("Examiners are not permitted to access research proposals.");
  });
});
