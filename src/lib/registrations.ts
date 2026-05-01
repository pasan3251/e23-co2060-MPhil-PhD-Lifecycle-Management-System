import {
  RegistrationStatus,
  UserRole,
  type User,
} from "@prisma/client";

import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma/client";
import type { AuthenticatedUserContext } from "@/types/auth";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export class RegistrationError extends Error {
  status: 400 | 403 | 404 | 409;

  constructor(message: string, status: 400 | 403 | 404 | 409 = 400) {
    super(message);
    this.name = "RegistrationError";
    this.status = status;
  }
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number) {
  return new Date(startOfUtcDay(date).getTime() + days * DAY_IN_MS);
}

function buildRegistrationWindow(startDate = new Date()) {
  const normalizedStartDate = new Date(startDate);
  const expirationDate = new Date(normalizedStartDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  return {
    startDate: normalizedStartDate,
    expirationDate,
  };
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isExactlyDaysBeforeExpiration(
  expirationDate: Date,
  now = new Date(),
  days = 14,
) {
  const today = startOfUtcDay(now);
  const expiryDay = startOfUtcDay(expirationDate);
  const differenceInDays = Math.round(
    (expiryDay.getTime() - today.getTime()) / DAY_IN_MS,
  );

  return differenceInDays === days;
}

export async function lapseExpiredRegistrations(referenceDate = new Date()) {
  const result = await prisma.registration.updateMany({
    where: {
      status: RegistrationStatus.ACTIVE,
      expirationDate: {
        lt: referenceDate,
      },
    },
    data: {
      status: RegistrationStatus.LAPSED,
    },
  });

  return result.count;
}

export async function sendRegistrationAdvanceReminders(referenceDate = new Date()) {
  const reminderStart = addUtcDays(referenceDate, 14);
  const reminderEnd = addUtcDays(referenceDate, 15);

  const registrations = await prisma.registration.findMany({
    where: {
      status: RegistrationStatus.ACTIVE,
      expirationDate: {
        gte: reminderStart,
        lt: reminderEnd,
      },
      student: {
        isArchived: false,
        user: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      expirationDate: true,
      student: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  await Promise.all(
    registrations
      .filter((registration) => registration.student.user.email)
      .map((registration) =>
        notify({
          event: "REGISTRATION_EXPIRY_APPROACHING",
          recipientUserId: registration.student.user.id,
          to: registration.student.user.email,
          studentName: registration.student.user.displayName,
          expirationDateLabel: formatDateLabel(registration.expirationDate),
          daysRemaining: 14,
        }),
      ),
  );

  return registrations.length;
}

export async function runRegistrationMaintenance(referenceDate = new Date()) {
  const [lapsedCount, reminderCount] = await Promise.all([
    lapseExpiredRegistrations(referenceDate),
    sendRegistrationAdvanceReminders(referenceDate),
  ]);

  return {
    lapsedCount,
    reminderCount,
  };
}

export async function renewRegistration(
  registrationId: string,
  auth: AuthenticatedUserContext,
) {
  const registration = await prisma.registration.findUnique({
    where: {
      id: registrationId,
    },
    select: {
      id: true,
      status: true,
      studentId: true,
      expirationDate: true,
      student: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!registration) {
    throw new RegistrationError("Registration not found.", 404);
  }

  const isAdmin = auth.role === "ADMINISTRATOR";
  const isOwner = registration.student.userId === auth.userId;

  if (!isAdmin && !isOwner) {
    throw new RegistrationError("You cannot renew this registration.", 403);
  }

  const activeRegistration = await prisma.registration.findFirst({
    where: {
      studentId: registration.studentId,
      status: RegistrationStatus.ACTIVE,
      expirationDate: {
        gte: new Date(),
      },
      id: {
        not: registration.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (activeRegistration) {
    throw new RegistrationError(
      "This student already has an active registration.",
      409,
    );
  }

  const baseDate =
    registration.expirationDate > new Date()
      ? registration.expirationDate
      : new Date();
  const { startDate, expirationDate } = buildRegistrationWindow(baseDate);

  return prisma.$transaction(async (tx) => {
    await tx.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        status:
          registration.status === RegistrationStatus.ACTIVE
            ? RegistrationStatus.ARCHIVED
            : registration.status,
      },
    });

    return tx.registration.create({
      data: {
        studentId: registration.studentId,
        startDate,
        expirationDate,
        status: RegistrationStatus.ACTIVE,
      },
    });
  });
}

export async function assertStudentHasActiveRegistration(
  auth: AuthenticatedUserContext,
) {
  if (auth.role !== "STUDENT") {
    throw new RegistrationError(
      "Only students can access this progress report route.",
      403,
    );
  }

  const student = await prisma.student.findUnique({
    where: {
      userId: auth.userId,
    },
    select: {
      id: true,
      registrations: {
        where: {
          status: RegistrationStatus.ACTIVE,
          expirationDate: {
            gte: new Date(),
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!student?.registrations.length) {
    throw new RegistrationError(
      "Your registration is lapsed. Renew it before submitting progress reports.",
      403,
    );
  }

  return student;
}

export function isAdministratorUser(user: Pick<User, "role">) {
  return user.role === UserRole.ADMINISTRATOR;
}
