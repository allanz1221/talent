export interface DateDMY {
  dia: string;
  mes: string;
  año: string;
}

export interface StudentData {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: 'M' | 'F' | '';
  fechaNacimiento: DateDMY;
  escuela: string;
  turno: 'Matutino' | 'Vespertino' | '';
  direccion: {
    colonia: string;
    numeroExterior: string;
    numeroInterior: string;
  };
  // New Fields from User Request (May 2026 / Image)
  profesorEducacionFisica: string;
  practicaDeporte: 'Sí' | 'No' | '';
  deporteCual: string;
  entrenadorNombre: string;
  cumplioCalentamiento: 'Sí' | 'No' | '';
  measurement?: {
    lugar: string;
    fecha: DateDMY;
  };
}

export interface SavedStudent extends StudentData {
  id: string;
  results: TestResults;
  evaluation: EvaluationResult | null;
}

export interface TestResults {
  peso: string; // kg
  estatura: string; // cm
  flexibilidad: string; // cm
  velocidad: string; // s
  lagartijas: string; // reps
  abdominales: string; // reps
  salto: string; // cm
  resistencia: string; // min.seg (e.g. 4.20)
}

export interface EvaluationResult {
  percentiles: {
    velocidad: number;
    lagartijas: number;
    abdominales: number;
    salto: number;
    resistencia: number;
  };
  totalPoints: number;
  classification: string;
  isTalentInHeight: boolean;
  recommendedSports: string[];
}
