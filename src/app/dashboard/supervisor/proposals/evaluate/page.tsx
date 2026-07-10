import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SupervisorProposalMonitoringPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Monitor Proposals</CardTitle>
          <CardDescription>
            Supervisors can view assigned students and submitted documents, but proposal reviews are handled by examiners and administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/supervisor/students">Open Student Roster</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
