import {
  NotificationDeliveryStatus,
  NotificationEvent,
} from "@prisma/client";
import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma/client";

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  recipientUserId: string;
  event: NotificationEvent;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

let cachedTransporter:
  | ReturnType<typeof nodemailer.createTransport>
  | undefined;

function getRequiredSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
    );
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from: process.env.SMTP_FROM ?? user,
  };
}

export function getEmailTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getRequiredSmtpConfig();

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

export function resetEmailTransporterForTests() {
  cachedTransporter = undefined;
}

async function writeNotificationLog(
  input: SendEmailInput,
  deliveryStatus: NotificationDeliveryStatus,
  failureReason?: string,
) {
  try {
    await prisma.notificationLog.create({
      data: {
        recipientId: input.recipientUserId,
        event: input.event,
        subject: input.subject,
        deliveryStatus,
        failureReason,
        metadata: {
          to: input.to,
        },
      },
    });
  } catch (error) {
    console.error("Failed to write NotificationLog entry.", error);
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transporter = getEmailTransporter();
  const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";

  try {
    const result = await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    await writeNotificationLog(input, NotificationDeliveryStatus.SENT);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const failureReason =
      error instanceof Error ? error.message : "Unknown SMTP transport error.";

    await writeNotificationLog(
      input,
      NotificationDeliveryStatus.FAILED,
      failureReason,
    );

    return {
      success: false,
      error: failureReason,
    };
  }
}

export function sendEmailInBackground(input: SendEmailInput): Promise<void> {
  return Promise.resolve().then(async () => {
    await sendEmail(input);
  });
}

export function buildRegistrationExpiryTemplate(input: {
  studentName: string;
  expirationDateLabel: string;
  daysRemaining?: number;
}): EmailTemplate {
  const daysRemaining = input.daysRemaining ?? 14;
  const subject = `Registration expiry reminder: ${daysRemaining} days remaining`;
  const text = [
    `Dear ${input.studentName},`,
    "",
    `Your registration will expire on ${input.expirationDateLabel}.`,
    `Please renew within the next ${daysRemaining} days to avoid a lapse.`,
  ].join("\n");
  const html = `
    <p>Dear ${input.studentName},</p>
    <p>Your registration will expire on <strong>${input.expirationDateLabel}</strong>.</p>
    <p>Please renew within the next <strong>${daysRemaining} days</strong> to avoid a lapse.</p>
  `;

  return { subject, html, text };
}

export function buildProposalStatusChangeTemplate(input: {
  studentName: string;
  proposalTitle: string;
  statusLabel: string;
  feedback?: string;
}): EmailTemplate {
  const subject = `Proposal status updated: ${input.statusLabel}`;
  const feedbackText = input.feedback
    ? `\n\nFeedback:\n${input.feedback}`
    : "";
  const feedbackHtml = input.feedback
    ? `<p><strong>Feedback:</strong><br />${input.feedback}</p>`
    : "";
  const text = [
    `Dear ${input.studentName},`,
    "",
    `Your proposal "${input.proposalTitle}" is now ${input.statusLabel}.`,
    feedbackText.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  const html = `
    <p>Dear ${input.studentName},</p>
    <p>Your proposal "<strong>${input.proposalTitle}</strong>" is now <strong>${input.statusLabel}</strong>.</p>
    ${feedbackHtml}
  `;

  return { subject, html, text };
}

export function buildProgressReportSubmittedTemplate(input: {
  supervisorName: string;
  studentName: string;
  periodLabel: string;
}): EmailTemplate {
  const subject = `Progress report submitted for ${input.periodLabel}`;
  const text = [
    `Dear ${input.supervisorName},`,
    "",
    `${input.studentName} has submitted a progress report for ${input.periodLabel}.`,
    "Please review and sign off the report in the system.",
  ].join("\n");
  const html = `
    <p>Dear ${input.supervisorName},</p>
    <p><strong>${input.studentName}</strong> has submitted a progress report for <strong>${input.periodLabel}</strong>.</p>
    <p>Please review and sign off the report in the system.</p>
  `;

  return { subject, html, text };
}

export function buildWelcomeAccountTemplate(input: {
  recipientName: string;
  roleLabel: string;
  temporaryPassword: string;
  loginUrl: string;
}): EmailTemplate {
  const subject = `Your ${input.roleLabel.toLowerCase()} account is ready`;
  const text = [
    `Dear ${input.recipientName},`,
    "",
    `An account has been created for you in the Postgraduate Lifecycle Management System as a ${input.roleLabel}.`,
    `Temporary password: ${input.temporaryPassword}`,
    `Login URL: ${input.loginUrl}`,
    "Please sign in and change your password as soon as possible.",
  ].join("\n");
  const html = `
    <p>Dear ${input.recipientName},</p>
    <p>An account has been created for you in the Postgraduate Lifecycle Management System as a <strong>${input.roleLabel}</strong>.</p>
    <p><strong>Temporary password:</strong> ${input.temporaryPassword}</p>
    <p><strong>Login URL:</strong> <a href="${input.loginUrl}">${input.loginUrl}</a></p>
    <p>Please sign in and change your password as soon as possible.</p>
  `;

  return { subject, html, text };
}

export function buildApplicationSubmittedTemplate(input: {
  administratorName: string;
  applicantName: string;
  applicantEmail: string;
  programTypeLabel: string;
  researchArea: string;
}): EmailTemplate {
  const subject = `New ${input.programTypeLabel} application submitted`;
  const text = [
    `Dear ${input.administratorName},`,
    "",
    `${input.applicantName} has submitted a new ${input.programTypeLabel} application.`,
    `Applicant email: ${input.applicantEmail}`,
    `Research area: ${input.researchArea}`,
    "Please review the application in the admissions workflow.",
  ].join("\n");
  const html = `
    <p>Dear ${input.administratorName},</p>
    <p><strong>${input.applicantName}</strong> has submitted a new <strong>${input.programTypeLabel}</strong> application.</p>
    <p><strong>Applicant email:</strong> ${input.applicantEmail}</p>
    <p><strong>Research area:</strong> ${input.researchArea}</p>
    <p>Please review the application in the admissions workflow.</p>
  `;

  return { subject, html, text };
}

export function buildProposalEvaluationSubmittedTemplate(input: {
  administratorName: string;
  supervisorName: string;
  studentName: string;
  proposalTitle: string;
  numericalScore: number;
}): EmailTemplate {
  const subject = `Proposal evaluation received: ${input.proposalTitle}`;
  const text = [
    `Dear ${input.administratorName},`,
    "",
    `${input.supervisorName} has submitted a proposal evaluation for ${input.studentName}.`,
    `Proposal title: ${input.proposalTitle}`,
    `Score: ${input.numericalScore}/100`,
    "You can review the submitted evaluation and aggregate score in the proposal workflow.",
  ].join("\n");
  const html = `
    <p>Dear ${input.administratorName},</p>
    <p><strong>${input.supervisorName}</strong> has submitted a proposal evaluation for <strong>${input.studentName}</strong>.</p>
    <p><strong>Proposal title:</strong> ${input.proposalTitle}</p>
    <p><strong>Score:</strong> ${input.numericalScore}/100</p>
    <p>You can review the submitted evaluation and aggregate score in the proposal workflow.</p>
  `;

  return { subject, html, text };
}

export function buildSupervisorAssignmentTemplate(input: {
  supervisorName: string;
  studentName: string;
  assignmentRoleLabel: string;
  assignedByName: string;
}): EmailTemplate {
  const subject = `New supervisor assignment: ${input.assignmentRoleLabel}`;
  const text = [
    `Dear ${input.supervisorName},`,
    "",
    `You have been assigned as ${input.assignmentRoleLabel.toLowerCase()} for ${input.studentName}.`,
    `Assigned by: ${input.assignedByName}`,
    "Please sign in to the Postgraduate Lifecycle Management System to review the student record.",
  ].join("\n");
  const html = `
    <p>Dear ${input.supervisorName},</p>
    <p>You have been assigned as <strong>${input.assignmentRoleLabel.toLowerCase()}</strong> for <strong>${input.studentName}</strong>.</p>
    <p><strong>Assigned by:</strong> ${input.assignedByName}</p>
    <p>Please sign in to the Postgraduate Lifecycle Management System to review the student record.</p>
  `;

  return { subject, html, text };
}

export function buildExaminerAssignmentTemplate(input: {
  examinerName: string;
  studentName: string;
  thesisTitle: string;
  assignedByName: string;
  secureDownloadUrl: string;
}): EmailTemplate {
  const subject = `New thesis examiner assignment: ${input.thesisTitle}`;
  const text = [
    `Dear ${input.examinerName},`,
    "",
    `You have been assigned as an examiner for ${input.studentName}'s thesis titled "${input.thesisTitle}".`,
    `Assigned by: ${input.assignedByName}`,
    `Secure thesis download link: ${input.secureDownloadUrl}`,
    "Please review the thesis using the secure link above.",
  ].join("\n");
  const html = `
    <p>Dear ${input.examinerName},</p>
    <p>You have been assigned as an examiner for <strong>${input.studentName}</strong>'s thesis titled <strong>${input.thesisTitle}</strong>.</p>
    <p><strong>Assigned by:</strong> ${input.assignedByName}</p>
    <p><a href="${input.secureDownloadUrl}">Open the secure thesis download link</a></p>
    <p>Please review the thesis using the secure link above.</p>
  `;

  return { subject, html, text };
}
export async function notifyRegistrationExpiry(input: {
  recipientUserId: string;
  to: string;
  studentName: string;
  expirationDateLabel: string;
  daysRemaining?: number;
}) {
  const template = buildRegistrationExpiryTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.REGISTRATION_EXPIRY_APPROACHING,
    ...template,
  });
}

export async function notifyProposalStatusChange(input: {
  recipientUserId: string;
  to: string;
  studentName: string;
  proposalTitle: string;
  statusLabel: string;
  feedback?: string;
}) {
  const template = buildProposalStatusChangeTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.PROPOSAL_STATUS_CHANGED,
    ...template,
  });
}

export async function notifyProgressReportSubmitted(input: {
  recipientUserId: string;
  to: string;
  supervisorName: string;
  studentName: string;
  periodLabel: string;
}) {
  const template = buildProgressReportSubmittedTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.PROGRESS_REPORT_SUBMITTED,
    ...template,
  });
}

export async function notifyWelcomeAccountCreated(input: {
  recipientUserId: string;
  to: string;
  recipientName: string;
  roleLabel: string;
  temporaryPassword: string;
  loginUrl: string;
}) {
  const template = buildWelcomeAccountTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.APPLICATION_STATUS_CHANGED,
    ...template,
  });
}

export async function notifyApplicationSubmittedToAdministrator(input: {
  recipientUserId: string;
  to: string;
  administratorName: string;
  applicantName: string;
  applicantEmail: string;
  programTypeLabel: string;
  researchArea: string;
}) {
  const template = buildApplicationSubmittedTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.APPLICATION_STATUS_CHANGED,
    ...template,
  });
}

export async function notifyProposalEvaluationSubmittedToAdministrator(input: {
  recipientUserId: string;
  to: string;
  administratorName: string;
  supervisorName: string;
  studentName: string;
  proposalTitle: string;
  numericalScore: number;
}) {
  const template = buildProposalEvaluationSubmittedTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.PROPOSAL_STATUS_CHANGED,
    ...template,
  });
}

export async function notifySupervisorAssigned(input: {
  recipientUserId: string;
  to: string;
  supervisorName: string;
  studentName: string;
  assignmentRoleLabel: string;
  assignedByName: string;
}) {
  const template = buildSupervisorAssignmentTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.APPLICATION_STATUS_CHANGED,
    ...template,
  });
}

export async function notifyExaminerAssignedToThesis(input: {
  recipientUserId: string;
  to: string;
  examinerName: string;
  studentName: string;
  thesisTitle: string;
  assignedByName: string;
  secureDownloadUrl: string;
}) {
  const template = buildExaminerAssignmentTemplate(input);

  return sendEmail({
    to: input.to,
    recipientUserId: input.recipientUserId,
    event: NotificationEvent.APPLICATION_STATUS_CHANGED,
    ...template,
  });
}
