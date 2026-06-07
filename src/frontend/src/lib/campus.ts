export const CAMPUSES = [
  { value: "CLAUSTRO_SAN_AGUSTIN", label: "Claustro de San Agustín" },
  { value: "ZARAGOCILLA", label: "Campus de Zaragocilla" },
  { value: "PIEDRA_BOLIVAR", label: "Campus de Piedra de Bolívar" },
  { value: "CLAUSTRO_LA_MERCED", label: "Claustro de la Merced" },
  { value: "CLAUSTRO_SANTO_DOMINGO", label: "Claustro de Santo Domingo" },
  { value: "EL_CARMEN_DE_BOLIVAR", label: "El Carmen de Bolívar" },
  { value: "MAGANGUE", label: "Magangué" },
  { value: "SAN_JUAN_NEPOMUCENO", label: "San Juan Nepomuceno" },
  { value: "SANTA_CRUZ_DE_MOMPOS", label: "Santa Cruz de Mompós" },
  { value: "CERETE", label: "Cereté" },
  { value: "LORICA", label: "Lorica" },
] as const;

export type CampusValue = (typeof CAMPUSES)[number]["value"];
