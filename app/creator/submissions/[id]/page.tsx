import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getCollaborationSubmissionDetail } from "@/lib/supabase/queries";
import { SubmissionForm } from "./submission-form";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("creator", `/creator/submissions/${id}`);
  const collaboration = await getCollaborationSubmissionDetail(id);
  if (!collaboration) notFound();

  return <SubmissionForm collaboration={collaboration} />;
}
