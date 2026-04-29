import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { renewRegistration, RegistrationError } from "@/lib/registrations";
import { withAuth } from "@/lib/firebase/with-auth";

type RouteParams = {
  id: string;
};

export const POST = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const registration = await renewRegistration(
        context.params?.id ?? "",
        context.auth,
      );

      return NextResponse.json(
        {
          registration: {
            id: registration.id,
            status: registration.status,
            startDate: registration.startDate,
            expirationDate: registration.expirationDate,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof RegistrationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to renew the registration." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT, UserRole.ADMINISTRATOR],
);
