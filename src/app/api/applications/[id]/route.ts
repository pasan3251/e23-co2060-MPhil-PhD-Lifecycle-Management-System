import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { createServerErrorResponse } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma/client";

type RouteParams = {
  id: string;
};

export const GET = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    try {
      const applicationId = context.params?.id;

      if (!applicationId) {
        return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
      }

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          documents: true,
        },
      });

      if (!application) {
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
      }

      return NextResponse.json({ application });
    } catch (error) {
      return createServerErrorResponse({
        error,
        message: "Unable to retrieve application details.",
        route: `/api/applications/${context.params?.id ?? "unknown"}`,
        method: "GET",
      });
    }
  },
  [UserRole.ADMINISTRATOR],
);
