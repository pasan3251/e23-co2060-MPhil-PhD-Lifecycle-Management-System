"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentDownloadResponse = {
  downloadUrl?: string;
  error?: string;
};

type SubmissionDocumentDownloadButtonProps = {
  documentId: string;
  fileName: string;
  className?: string;
};

export function SubmissionDocumentDownloadButton({
  documentId,
  fileName,
  className,
}: SubmissionDocumentDownloadButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setIsOpening(true);

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as DocumentDownloadResponse;

      if (!response.ok || !payload.downloadUrl) {
        throw new Error(payload.error ?? "Unable to prepare the document download.");
      }

      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open document download.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleDownload()}
        disabled={isOpening}
        aria-label={`Download ${fileName}`}
      >
        <Download className="mr-2 h-4 w-4" />
        {isOpening ? "Opening..." : "Download"}
      </Button>
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
