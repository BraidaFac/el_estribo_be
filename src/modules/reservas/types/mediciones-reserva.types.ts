/** Forma persistida en `mediciones_json` (todas las medidas en cm, nullable). */
export type MedidasSacoJson = {
  pecho: number | null;
  hombros: number | null;
  largoSaco: number | null;
  largoManga: number | null;
  cintura: number | null;
  espalda: number | null;
};

export type MedidasPantalonJson = {
  cintura: number | null;
  cadera: number | null;
  largoPiernaInterno: number | null;
  largoTotal: number | null;
  tiro: number | null;
  musloYPierna: number | null;
  bota: number | null;
};

export type MedicionesReservaJson = {
  saco: MedidasSacoJson;
  pantalon: MedidasPantalonJson;
};

export function medicionesReservaVacias(): MedicionesReservaJson {
  return {
    saco: {
      pecho: null,
      hombros: null,
      largoSaco: null,
      largoManga: null,
      cintura: null,
      espalda: null,
    },
    pantalon: {
      cintura: null,
      cadera: null,
      largoPiernaInterno: null,
      largoTotal: null,
      tiro: null,
      musloYPierna: null,
      bota: null,
    },
  };
}
