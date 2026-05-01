import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminBucket: vi.fn().mockReturnValue({
    file: vi.fn().mockReturnValue({
      getSignedUrl: vi.fn().mockResolvedValue(["https://mock-download-url.com"]),
    }),
  }),
}));

vi.mock("@/lib/firebase/with-auth", () => ({
  withAuth: (handler: any) => async (req: any, ctx: any) => {
    return handler(req, { ...ctx, auth: { role: req.headers.get("role") || UserRole.ADMINISTRATOR, userId: "test-user" } });
  }
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    researchProposal: { findUnique: vi.fn() },
    document: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { GET, DELETE } from "@/app/api/proposals/[id]/versions/[v]/download/route";
import { prisma } from "@/lib/prisma/client";

describe("Proposal Version Control Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows authorized users to download previous versions (REQ-FN-016)", async () => {
    vi.mocked(prisma.researchProposal.findUnique).mockResolvedValue({ id: "prop-1" } as never);
    vi.mocked(prisma.document.findFirst).mockResolvedValue({ storagePath: "proposals/student-1/1/doc.pdf", isCurrentVersion: false } as never);

    const req = new Request("http://localhost/api", { headers: new Headers({ "role": UserRole.ADMINISTRATOR }) });
    const res = await GET(req, { params: { id: "prop-1", v: "1" } } as any);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.signedUrl).toBe("https://mock-download-url.com");
  });

  it("returns 403 Forbidden when a non-admin attempts to delete a version (REQ-FN-017)", async () => {
    const req = new Request("http://localhost/api", { headers: new Headers({ "role": UserRole.STUDENT }) });
    const res = await DELETE(req, { params: { id: "prop-1", v: "1" } } as any);
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Only administrators can delete documents.");
  });
});
