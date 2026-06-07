const ACADEMIC_PROGRAMS = new Set([
  "688", "047", "044", "024", "049", "662", "039", "050", "045", "041",
  "043", "054", "046", "048", "021", "011", "022", "023", "020", "051",
  "052", "727", "019", "053", "687", "697", "042", "187", "852", "760",
  "749", "191", "148", "824", "136", "980", "805", "812", "469", "355",
  "263", "170", "761", "762", "827", "825", "122", "821", "804", "229",
  "759", "129", "817", "685", "820", "127",
]);

const STUDENT_CODE_REGEX = /^\d{10}$/;

export interface ParsedStudentCode {
  program: string;
  entryPeriod: string;
  specialCommunity: string;
  admissionPosition: string;
}

export function parseStudentCode(code: string): ParsedStudentCode | null {
  if (!STUDENT_CODE_REGEX.test(code)) return null;
  return {
    program: code.substring(0, 3),
    entryPeriod: code.substring(3, 6),
    specialCommunity: code.substring(6, 7),
    admissionPosition: code.substring(7, 10),
  };
}

export function validateStudentCode(code: string): string | null {
  if (!STUDENT_CODE_REGEX.test(code)) {
    return "El código estudiantil debe tener exactamente 10 dígitos";
  }

  const program = code.substring(0, 3);
  if (!ACADEMIC_PROGRAMS.has(program)) {
    return `El programa académico "${program}" no es válido`;
  }

  const entryPeriod = code.substring(3, 6);
  const lastEntryDigit = entryPeriod[2];
  if (lastEntryDigit !== "1" && lastEntryDigit !== "2") {
    return "El período de ingreso debe terminar en 1 o 2 (semestre)";
  }

  const specialCommunity = code[6];
  if (specialCommunity !== "0" && specialCommunity !== "1") {
    return "El dígito de comunidad especial debe ser 0 o 1";
  }

  const admissionPosition = code.substring(7, 10);
  const posNum = parseInt(admissionPosition, 10);
  if (isNaN(posNum) || posNum < 1 || posNum > 999) {
    return "La posición de admisión debe estar entre 001 y 999";
  }

  return null;
}

export type StudentCodeValidationResult =
  | { success: true; data: ParsedStudentCode }
  | { success: false; error: string };

export function validateAndParseStudentCode(
  code: string,
): StudentCodeValidationResult {
  const error = validateStudentCode(code);
  if (error) {
    return { success: false, error };
  }

  const parsed = parseStudentCode(code);
  if (!parsed) {
    return { success: false, error: "El código estudiantil debe tener exactamente 10 dígitos" };
  }

  return { success: true, data: parsed };
}
