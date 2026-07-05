/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentRepositoryPanel } from "@/components/documents/document-repository-panel";

const repositoryDocument = {
  id: "doc-1",
  documentType: "THESIS",
  fileName: "thesis.pdf",
  title: "Adaptive Systems Thesis",
  summary: "A thesis about adaptive systems.",
  tags: ["thesis", "current", "under-examination"],
  mimeType: "application/pdf",
  version: 1,
  isCurrentVersion: true,
  storagePath: "theses/student-1/1/thesis.pdf",
  createdAt: "2026-05-01T04:00:00.000Z",
};

describe("DocumentRepositoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders repository results and opens signed download URLs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [repositoryDocument],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          downloadUrl: "https://storage.example.test/read?path=thesis.pdf",
        }),
      });
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal("fetch", fetchMock);

    render(<DocumentRepositoryPanel role="admin" />);

    expect(await screen.findByText("Adaptive Systems Thesis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/documents/doc-1", {
        credentials: "include",
      });
      expect(openMock).toHaveBeenCalledWith(
        "https://storage.example.test/read?path=thesis.pdf",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("hides archive controls from non-admin users", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          documents: [repositoryDocument],
        }),
      }),
    );

    render(<DocumentRepositoryPanel role="student" />);

    expect(await screen.findByText("Adaptive Systems Thesis")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });
});
