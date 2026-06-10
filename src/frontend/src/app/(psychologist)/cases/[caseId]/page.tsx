interface CaseDetailPageProps {
  params: Promise<{ caseId: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;

  return (
    <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
      <p className="text-sm text-muted">
        Detalle del caso {caseId} — en construcción
      </p>
    </div>
  );
}
