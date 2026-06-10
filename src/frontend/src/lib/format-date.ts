const dateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

const shortDateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "America/Bogota",
});

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return dateFormat.format(d);
  } catch {
    return "—";
  }
}

export function formatDateShort(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return shortDateFormat.format(d);
  } catch {
    return "—";
  }
}
