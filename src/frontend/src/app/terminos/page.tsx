import Link from "next/link";

export default function TerminosPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="text-xl font-bold font-display text-primary block text-center mb-8"
        >
          MindBridge
        </Link>
        <h1 className="text-2xl font-bold font-display text-foreground text-center mb-6">
          Términos y condiciones
        </h1>
        <div className="bg-surface border border-border rounded-2xl p-6 text-sm text-foreground leading-relaxed space-y-4">
          <p>
            Al registrarte en MindBridge aceptas los siguientes términos:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Propósito:</strong> MindBridge es una herramienta de triaje proactivo para el bienestar universitario. No es un servicio de emergencia ni sustituye la atención psicológica profesional.</li>
            <li><strong>Análisis NLP:</strong> Tus publicaciones serán analizadas automáticamente por un modelo de lenguaje para detectar indicadores de riesgo. Este análisis es decisión de apoyo, no un diagnóstico clínico.</li>
            <li><strong>Revelación de identidad:</strong> En caso de que el sistema detecte un nivel de riesgo alto, un psicólogo de bienestar institucional podrá conocer tu identidad para contactarte. Este proceso está regulado por la Ley 1581 de 2012.</li>
            <li><strong>Voluntariedad:</strong> El uso de la plataforma es voluntario. Puedes dejar de usarla en cualquier momento.</li>
            <li><strong>Marco legal:</strong> Este sistema opera bajo la normativa colombiana de protección de datos (Ley 1581) y la Resolución 309/2025 del Ministerio de Salud.</li>
            <li><strong>Complementariedad:</strong> MindBridge es complementario a los procesos institucionales de bienestar. No reemplaza ni sustituye los canales oficiales de atención.</li>
          </ol>
          <p className="text-xs text-muted pt-2">
            Versión v1.0 · Vigente desde junio 2026
          </p>
        </div>
        <p className="text-center mt-6 text-sm text-muted">
          <Link href="/registro" className="text-primary font-medium hover:underline">
            Volver al registro
          </Link>
        </p>
      </div>
    </main>
  );
}
