import { NotificationEvent } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be defined BEFORE imports that use them (vi.mock hoisting)
// ---------------------------------------------------------------------------

vi.mock("@/lib/email", () => ({
  notifyApplicationStatusChanged: vi.fn().mockResolvedValue({ success: true }),
  notifyProposalStatusChange: vi.fn().mockResolvedValue({ success: true }),
  notifyProgressReportSubmitted: vi.fn().mockResolvedValue({ success: true }),
  notifyRegistrationExpiry: vi.fn().mockResolvedValue({ success: true }),
  notifyThesisArchived: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    notification: {
      create: vi.fn().mockResolvedValue({ id: "notif-1" }),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { notify } from "@/lib/notifications";
import {
  notifyApplicationStatusChanged,
  notifyProgressReportSubmitted,
  notifyProposalStatusChange,
  notifyRegistrationExpiry,
  notifyThesisArchived,
} from "@/lib/email";
import { prisma } from "@/lib/prisma/client";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NotificationService — event-to-template mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches APPLICATION_STATUS_CHANGED to correct email function", async () => {
    await notify({
      event: "APPLICATION_STATUS_CHANGED",
      recipientUserId: "user-1",
      to: "student@example.com",
      studentName: "Alice",
      newStatus: "ADMITTED",
      programTypeLabel: "MPhil",
    });

    expect(notifyApplicationStatusChanged).toHaveBeenCalledOnce();
    expect(notifyApplicationStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ newStatus: "ADMITTED" }),
    );
  });

  it("dispatches PROPOSAL_STATUS_CHANGED to correct email function", async () => {
    await notify({
      event: "PROPOSAL_STATUS_CHANGED",
      recipientUserId: "user-1",
      to: "student@example.com",
      studentName: "Alice",
      proposalTitle: "AI Ethics",
      statusLabel: "APPROVED",
    });

    expect(notifyProposalStatusChange).toHaveBeenCalledOnce();
    expect(notifyProposalStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ proposalTitle: "AI Ethics", statusLabel: "APPROVED" }),
    );
  });

  it("dispatches PROGRESS_REPORT_SUBMITTED to supervisor email function (REQ-FN-019)", async () => {
    await notify({
      event: "PROGRESS_REPORT_SUBMITTED",
      recipientUserId: "supervisor-user-1",
      to: "supervisor@example.com",
      supervisorName: "Dr. Smith",
      studentName: "Alice",
      studentId: "student-1",
      periodLabel: "Q1 2026",
    });

    expect(notifyProgressReportSubmitted).toHaveBeenCalledOnce();
    expect(notifyProgressReportSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({
        supervisorName: "Dr. Smith",
        periodLabel: "Q1 2026",
      }),
    );
  });

  it("dispatches REGISTRATION_EXPIRY_APPROACHING with 14-day default (REQ-FN-018)", async () => {
    await notify({
      event: "REGISTRATION_EXPIRY_APPROACHING",
      recipientUserId: "user-1",
      to: "student@example.com",
      studentName: "Alice",
      expirationDateLabel: "1 June 2026",
    });

    expect(notifyRegistrationExpiry).toHaveBeenCalledOnce();
    expect(notifyRegistrationExpiry).toHaveBeenCalledWith(
      expect.objectContaining({ daysRemaining: 14 }),
    );
  });

  it("dispatches THESIS_ARCHIVED to correct email function", async () => {
    await notify({
      event: "THESIS_ARCHIVED",
      recipientUserId: "user-1",
      to: "student@example.com",
      studentName: "Alice",
      thesisTitle: "AI Governance in Sri Lanka",
    });

    expect(notifyThesisArchived).toHaveBeenCalledOnce();
    expect(notifyThesisArchived).toHaveBeenCalledWith(
      expect.objectContaining({ thesisTitle: "AI Governance in Sri Lanka" }),
    );
  });

  it("writes an in-app Notification record for every dispatched event", async () => {
    await notify({
      event: "THESIS_ARCHIVED",
      recipientUserId: "user-1",
      to: "student@example.com",
      studentName: "Alice",
      thesisTitle: "AI Governance in Sri Lanka",
    });

    expect(prisma.notification.create).toHaveBeenCalledOnce();
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: NotificationEvent.THESIS_ARCHIVED,
          recipientId: "user-1",
        }),
      }),
    );
  });
});

describe("NotificationService — SMTP failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when SMTP delivery fails — still writes in-app notification", async () => {
    vi.mocked(notifyProgressReportSubmitted).mockResolvedValueOnce({
      success: false,
      error: "ECONNREFUSED",
    });

    await expect(
      notify({
        event: "PROGRESS_REPORT_SUBMITTED",
        recipientUserId: "supervisor-user-1",
        to: "supervisor@example.com",
        supervisorName: "Dr. Smith",
        studentName: "Alice",
        studentId: "student-1",
        periodLabel: "Q1 2026",
      }),
    ).resolves.toBeUndefined();

    // The in-app notification should still have been attempted
    expect(prisma.notification.create).toHaveBeenCalledOnce();
  });
});
