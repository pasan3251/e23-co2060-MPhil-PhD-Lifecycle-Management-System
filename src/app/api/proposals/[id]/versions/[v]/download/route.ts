import { NextResponse, type NextRequest } from "next/server";
import { checkAccess, AccessError } from "@/lib/proposals/versions";
import { generateDownloadSignedUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma/client";
import { withAuth, type WithAuthContext } from "@/lib/firebase/with-auth";

export const GET = withAuth(
  async (request: NextRequest, context: WithAuthContext<{ id: string, v: string }>) => {
    try {
      await checkAccess(context.params!.id, context.auth.userId, context.auth.role);

      const versionInt = parseInt(context.params!.v, 10);
      if (isNaN(versionInt)) {
         return NextResponse.json({ error: "Invalid version number." }, { status: 400 });
      }

      const document = await prisma.document.findFirst({
        where: {
           researchProposalId: context.params!.id,
           version: versionInt,
        }
      });

      if (!document) {
        return NextResponse.json({ error: "Document version not found." }, { status: 404 });
      }

      const signedUrl = await generateDownloadSignedUrl(document.storagePath);
      
      return NextResponse.json({ signedUrl }, { status: 200 });
    } catch (error) {
      if (error instanceof AccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);

export const DELETE = withAuth(
  async (request: NextRequest, context: WithAuthContext<{ id: string, v: string }>) => {
     if (context.auth.role !== "ADMINISTRATOR") {
        return NextResponse.json({ error: "Only administrators can delete documents." }, { status: 403 });
     }
     
     // REQ-FN-017: Delete document
     const versionInt = parseInt(context.params!.v, 10);
     const document = await prisma.document.findFirst({
       where: { researchProposalId: context.params!.id, version: versionInt },
     });

     if (!document) {
       return NextResponse.json({ error: "Document not found" }, { status: 404 });
     }

     await prisma.document.update({
       where: { id: document.id },
       data: { isDeleted: true },
     });

     return NextResponse.json({ ok: true });
  }
);
