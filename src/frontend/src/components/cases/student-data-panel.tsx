import { campusTranslation } from "../../lib/i18n/risk";

interface StudentDataPanelProps {
  campus: string;
  student_code: string;
  complementary_data: {
    nombre_completo: string | null;
    programa: string | null;
    semestre: number | null;
    correo_contacto: string | null;
  } | null;
}

export function StudentDataPanel({
  campus,
  student_code,
  complementary_data,
}: StudentDataPanelProps) {
  const campusLabel = campusTranslation[campus] || campus || "—";

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Estudiante</h3>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted">Sede</span>
          <p className="text-foreground font-medium">{campusLabel}</p>
        </div>
        <div>
          <span className="text-muted">Código</span>
          <p className="text-foreground font-medium font-mono">{student_code || "—"}</p>
        </div>
      </div>

      {complementary_data ? (
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
          <div className="col-span-2">
            <span className="text-muted">Nombre</span>
            <p className="text-foreground font-medium">
              {complementary_data.nombre_completo || "—"}
            </p>
          </div>
          <div>
            <span className="text-muted">Programa</span>
            <p className="text-foreground font-medium">
              {complementary_data.programa || "—"}
            </p>
          </div>
          <div>
            <span className="text-muted">Semestre</span>
            <p className="text-foreground font-medium">
              {complementary_data.semestre != null ? String(complementary_data.semestre) : "—"}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-muted">Correo</span>
            <p className="text-foreground font-medium">
              {complementary_data.correo_contacto || "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted pt-2 border-t border-border">
          Datos complementarios no disponibles
        </p>
      )}
    </div>
  );
}
