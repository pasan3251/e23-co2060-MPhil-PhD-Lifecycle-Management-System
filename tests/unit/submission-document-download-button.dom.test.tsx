/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubmissionDocumentDownloadButton } from "@/components/student/submission-document-download-button";

describe("SubmissionDocumentDownloadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a signed download URL for a submitted document", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        downloadUrl: "https://storage.example.test/read?path=proposal.pdf",
      }),
    });
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SubmissionDocumentDownloadButton
        documentId="doc-1"
        fileName="proposal.pdf"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /download proposal\.pdf/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/documents/doc-1", {
        credentials: "include",
      });
      expect(openMock).toHaveBeenCalledWith(
        "https://storage.example.test/read?path=proposal.pdf",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("shows the download error returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "You do not have permission to access this document.",
        }),
      }),
    );

    render(
      <SubmissionDocumentDownloadButton
        documentId="doc-2"
        fileName="blocked.pdf"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /download blocked\.pdf/i }));

    expect(
      await screen.findByText("You do not have permission to access this document."),
    ).toBeInTheDocument();
  });
});
