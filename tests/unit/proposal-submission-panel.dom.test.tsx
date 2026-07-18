/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProposalSubmissionPanel } from "@/components/proposals/proposal-submission-panel";

describe("ProposalSubmissionPanel one-file guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("presents a single-file picker and rejects a synthetic multi-file selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        proposal: null,
        canSubmitNewVersion: true,
        submissionBlockedReason: null,
        hasActiveRegistration: true,
        applicationId: "application-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ProposalSubmissionPanel />);
    const input = (await screen.findByText(
      /Upload one PDF, or one ZIP containing the complete proposal package/i,
    ))
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    expect(input).toBeInTheDocument();
    expect(input).not.toHaveAttribute("multiple");

    fireEvent.change(input, {
      target: {
        files: [
          new File(["proposal"], "proposal.pdf", { type: "application/pdf" }),
          new File(["appendix"], "appendix.zip", { type: "application/zip" }),
        ],
      },
    });

    expect(
      await screen.findByText("Upload one proposal document per submission."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('input[type="file"]')).not.toHaveAttribute(
      "multiple",
    );
  });

  it("locks file replacement while a proposal submission is in flight", async () => {
    let resolveSubmission: ((value: unknown) => void) | undefined;
    const submissionResponse = new Promise((resolve) => {
      resolveSubmission = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          proposal: null,
          canSubmitNewVersion: true,
          submissionBlockedReason: null,
          hasActiveRegistration: true,
          applicationId: "application-1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signedUrl: "https://storage.example.test/proposal",
          storagePath: "proposals/student-1/1/proposal.pdf",
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockImplementationOnce(() => submissionResponse);
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ProposalSubmissionPanel />);
    await screen.findByText(/complete proposal package/i);
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["proposal"], "proposal.pdf", { type: "application/pdf" }),
        ],
      },
    });
    expect(await screen.findByText("proposal.pdf")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Research title..."), {
      target: { value: "Adaptive Thesis Supervision" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Summarize your research methodology and impact...",
      ),
      { target: { value: "A complete proposal submission." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit Proposal" }));

    await waitFor(() => expect(fileInput).toBeDisabled());
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["replacement"], "replacement.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });

    expect(screen.getByText("proposal.pdf")).toBeInTheDocument();
    expect(screen.queryByText("replacement.pdf")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);

    resolveSubmission?.({
      ok: false,
      json: async () => ({ error: "Test submission stopped." }),
    });
    expect(await screen.findByText("Test submission stopped.")).toBeInTheDocument();
  });
});
