import { NextRequest } from "next/server";
import { AcademicStatus, ProgramType, ThesisStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/auth", () => ({
  authenticateBearerRequest: vi.fn(),
  AuthError: class AuthError extends Error {
    status: 401 | 403;

    constructor(message: string, status: 401 | 403) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    thesis: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { GET as getStudentsReport } from "@/app/api/admin/reports/students/route";
import { GET as getThesisPipelineReport } from "@/app/api/admin/reports/thesis-pipeline/route";
import { GET as getGraduationsReport } from "@/app/api/admin/reports/graduations/route";
import { authenticateBearerRequest } from "@/lib/firebase/auth";
import { prisma } from "@/lib/prisma/client";

const adminAuth = {
  uid: "firebase-admin-1",
  userId: "user-admin-1",
  firebaseUid: "firebase-admin-1",
  role: "ADMINISTRATOR",
  email: "admin@example.com",
};

function makeRequest(url: string) {
  return new NextRequest(url, {
    headers: {
      authorization: "Bearer admin-token",
    },
  }) as never;
}

describe("admin system report routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateBearerRequest).mockResolvedValue(adminAuth as never);

    vi.mocked(prisma.student.findMany).mockResolvedValue([
      {
        id: "student-1",
        programType: ProgramType.MPHIL,
        academicStatus: AcademicStatus.ACTIVE,
        enrollmentDate: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        user: {
          displayName: "Student One",
          email: "student1@example.com",
        },
        supervisorAssignments: [
          {
            supervisorId: "supervisor-1",
            supervisor: {
              user: {
                displayName: "Dr. Primary",
              },
            },
          },
        ],
        theses: [
          {
            status: ThesisStatus.SUBMITTED,
            title: "Adaptive Systems",
            updatedAt: new Date("2026-05-01T00:00:00.000Z"),
          },
        ],
      },
    ] as never);
    vi.mocked(prisma.student.count).mockResolvedValue(1 as never);

    vi.mocked(prisma.thesis.findMany).mockResolvedValue([
      {
        id: "thesis-1",
        title: "Adaptive Systems",
        status: ThesisStatus.UNDER_EXAMINATION,
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        student: {
          id: "student-1",
          programType: ProgramType.MPHIL,
          user: {
            displayName: "Student One",
            email: "student1@example.com",
          },
          supervisorAssignments: [
            {
              supervisorId: "supervisor-1",
              supervisor: {
                user: {
                  displayName: "Dr. Primary",
                },
              },
            },
          ],
        },
      },
    ] as never);
    vi.mocked(prisma.thesis.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.thesis.groupBy).mockResolvedValue([
      {
        status: ThesisStatus.UNDER_EXAMINATION,
        _count: { _all: 1 },
      },
    ] as never);
  });

  it("returns csv export with expected headers for the students report", async () => {
    const response = await getStudentsReport(
      makeRequest("http://localhost/api/admin/reports/students?format=csv"),
    );

    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv).toContain("Student ID,Student Name,Email,Program Type");
    expect(csv).toContain("student-1,Student One,student1@example.com");
  });

  it("returns paginated thesis pipeline data sorted for table use", async () => {
    const response = await getThesisPipelineReport(
      makeRequest("http://localhost/api/admin/reports/thesis-pipeline?page=1&limit=50"),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination).toMatchObject({
      page: 1,
      limit: 50,
      total: 1,
      pageCount: 1,
    });
    expect(data.stageCounts.UNDER_EXAMINATION).toBe(1);
  });

  it("returns graduated students from the graduations report", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValueOnce([
      {
        id: "student-9",
        programType: ProgramType.PHD,
        academicStatus: AcademicStatus.GRADUATED,
        enrollmentDate: new Date("2020-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        user: {
          displayName: "Graduate One",
          email: "grad@example.com",
        },
        theses: [
          {
            title: "Final Thesis",
            updatedAt: new Date("2026-05-01T00:00:00.000Z"),
          },
        ],
      },
    ] as never);

    const response = await getGraduationsReport(
      makeRequest("http://localhost/api/admin/reports/graduations"),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.rows[0]).toMatchObject({
      studentId: "student-9",
      academicStatus: "GRADUATED",
    });
  });

  it("serves concurrent student report requests without blocking", async () => {
    const [first, second] = await Promise.all([
      getStudentsReport(makeRequest("http://localhost/api/admin/reports/students")),
      getStudentsReport(makeRequest("http://localhost/api/admin/reports/students?programType=MPHIL")),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(prisma.student.findMany).toHaveBeenCalledTimes(2);
  });

  it("keeps report generation under 3 seconds for a 500-row dataset", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValueOnce(
      Array.from({ length: 50 }, (_, index) => ({
        id: `student-${index}`,
        programType: ProgramType.MPHIL,
        academicStatus: AcademicStatus.ACTIVE,
        enrollmentDate: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        user: {
          displayName: `Student ${index}`,
          email: `student${index}@example.com`,
        },
        supervisorAssignments: [],
        theses: [],
      })) as never,
    );
    vi.mocked(prisma.student.count).mockResolvedValueOnce(500 as never);

    const start = Date.now();
    const response = await getStudentsReport(
      makeRequest("http://localhost/api/admin/reports/students?page=1&limit=50"),
    );
    const durationMs = Date.now() - start;

    expect(response.status).toBe(200);
    expect(durationMs).toBeLessThan(3000);
  });
});
