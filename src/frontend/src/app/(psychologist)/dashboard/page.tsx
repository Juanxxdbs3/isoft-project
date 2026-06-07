import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold font-display text-foreground mb-2">Panel del Psicólogo</h1>
      <p className="text-sm text-muted mb-8">
        Gestiona alertas, casos y comunicación con estudiantes.
      </p>
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <p className="text-muted text-sm">
          Esta sección estará disponible próximamente.
        </p>
        <Link href="/foro" className="inline-block mt-4 text-sm text-primary font-medium hover:underline">
          Volver al foro
        </Link>
      </div>
    </div>
  );
}
