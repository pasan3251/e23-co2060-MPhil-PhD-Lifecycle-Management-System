import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { scheduleViva, VivaWorkflowError } from "@/lib/vivas";

export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();
      const viva = await scheduleViva(body, context.auth);

      return NextResponse.json(viva, { status: 201 });
    } catch (error) {
      if (error instanceof VivaWorkflowError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      console.error("Failed to schedule viva:", error);
      return NextResponse.json(
        { error: "Unable to schedule viva." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
