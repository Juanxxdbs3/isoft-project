const ACADEMIC_PROGRAMS = new Set([
  "688", "047", "044", "024", "049", "662", "039", "050", "045", "041",
  "043", "054", "046", "048", "021", "011", "022", "023", "020", "051",
  "052", "727", "019", "053", "687", "697", "042", "187", "852", "760",
  "749", "191", "148", "824", "136", "980", "805", "812", "469", "355",
  "263", "170", "761", "762", "827", "825", "122", "821", "804", "229",
  "759", "129", "817", "685", "820", "127",
]);

const STUDENT_CODE_REGEX = /^\d{10}$/;

export function validateStudentCode(code: string): string | null {
  if (!STUDENT_CODE_REGEX.test(code)) {
    return "El código estudiantil debe tener exactamente 10 dígitos";
  }

  const program = code.substring(0, 3);
  if (!ACADEMIC_PROGRAMS.has(program)) {
    return `El programa académico "${program}" no es válido`;
  }

  return null;
}
