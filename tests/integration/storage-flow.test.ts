import { beforeEach, describe, expect, it, vi } from "vitest";

const storageObjects = new Map<string, Uint8Array>();

const mockCreateSignedUploadUrl = vi.fn(async (filePath: string) => {
  return {
    data: {
      signedUrl: `https://storage.example.test/write?path=${encodeURIComponent(filePath)}`,
    },
    error: null,
  };
});

const mockCreateSignedUrl = vi.fn(async (filePath: string) => {
  return {
    data: {
      signedUrl: `https://storage.example.test/read?path=${encodeURIComponent(filePath)}`,
    },
    error: null,
  };
});

const mockRemove = vi.fn(async (paths: string[]) => {
  for (const path of paths) {
    storageObjects.delete(path);
  }
  return { error: null };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUploadUrl: mockCreateSignedUploadUrl,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      })),
    },
  })),
}));

import {
  MAX_STORAGE_FILE_SIZE_BYTES,
  assertCanAccessStoragePath,
  assertFileUploadConstraints,
  generateDownloadSignedUrl,
  generateUploadSignedUrl,
  resetSupabaseClientForTests,
} from "@/lib/storage";
import type { AuthenticatedUserContext } from "@/types/auth";

describe("storage upload flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageObjects.clear();
    resetSupabaseClientForTests();

    vi.stubEnv("SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "mock-key");
    vi.stubEnv("SUPABASE_STORAGE_BUCKET", "demo-bucket");
  });

  it("simulates generating a signed upload URL and uploading a mock file via PUT", async () => {
    const storagePath = "proposals/student-1/1/proposal.pdf";
    const uploadUrl = await generateUploadSignedUrl(
      storagePath,
      "application/pdf",
    );

    const parsedUrl = new URL(uploadUrl);
    const uploadedPath = parsedUrl.searchParams.get("path");
    const mockFile = new TextEncoder().encode("mock proposal content");

    expect(uploadedPath).toBe(storagePath);

    if (!uploadedPath) {
      throw new Error("Signed URL did not contain a storage path.");
    }

    storageObjects.set(uploadedPath, mockFile);

    expect(storageObjects.has(storagePath)).toBe(true);

    const downloadUrl = await generateDownloadSignedUrl(storagePath);
    expect(downloadUrl).toContain("/read?");
  });

  it("rejects access to files outside the student's ownership", () => {
    const studentAuth: AuthenticatedUserContext = {
      uid: "firebase-student-1",
      userId: "student-1",
      firebaseUid: "firebase-student-1",
      role: "STUDENT",
      email: "student@example.com",
    };

    expect(() => {
      assertCanAccessStoragePath(
        studentAuth,
        "proposals/other-student/1/proposal.pdf",
      );
    }).toThrow("Document access denied.");
  });

  it("accepts a 50MB file and rejects a file larger than 50MB", () => {
    expect(() => {
      assertFileUploadConstraints({
        contentType: "application/pdf",
        fileSizeBytes: MAX_STORAGE_FILE_SIZE_BYTES,
        path: "theses/student-1/thesis.pdf",
      });
    }).not.toThrow();

    expect(() => {
      assertFileUploadConstraints({
        contentType: "application/pdf",
        fileSizeBytes: MAX_STORAGE_FILE_SIZE_BYTES + 1,
        path: "theses/student-1/thesis.pdf",
      });
    }).toThrow("File exceeds the 50MB upload limit.");
  });
});
