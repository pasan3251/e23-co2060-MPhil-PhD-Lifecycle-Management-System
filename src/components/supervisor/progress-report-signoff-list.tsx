"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load reports");
  return response.json();
}

type PendingProgressReport = {
  id: string;
  periodLabel: string;
  narrative: string;
  createdAt: string | Date;
  documents: Array<{
    id: string;
    fileName: string;
    storagePath: string;
  }>;
  student: {
    id: string;
    displayName: string;
    email: string;
  };
};

export function ProgressReportSignoffList() {
  const { data, error, mutate, isLoading } = useSWR("/api/supervisor/progress-reports", fetcher);
  const [signingId, setSigningId] = useState<string | null>(null);

  async function handleSign(reportId: string) {
    setSigningId(reportId);
    try {
      const response = await fetch(`/api/supervisor/progress-reports/${reportId}/sign`, {
        method: "POST",
      });
      if (response.ok) {
        mutate();
      } else {
        const payload = await response.json();
        alert(payload.error || "Failed to sign report");
      }
    } catch (err) {
      alert("A network error occurred");
    } finally {
      setSigningId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        <div className="h-32 animate-pulse rounded-md border bg-muted" />
        <div className="h-32 animate-pulse rounded-md border bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive-foreground text-sm font-medium">
        Error loading reports.
      </div>
    );
  }

  const reports = (data?.reports || []) as PendingProgressReport[];

  if (reports.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-dashed p-12 text-center">
        <p className="text-lg font-bold">No reports pending</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No progress reports need your sign-off.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                  {report.periodLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Submitted {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <CardTitle>{report.student.displayName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{report.student.email}</p>
            </div>
            <Button
              onClick={() => handleSign(report.id)}
              disabled={signingId === report.id}
              className="shrink-0"
            >
              {signingId === report.id ? "Signing..." : "Sign Off"}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {report.narrative}
            </p>
            {report.documents.length > 0 && (
              <p className="mt-3 break-all text-xs text-muted-foreground">
                Attached PDF: {report.documents.map((document) => document.fileName).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
