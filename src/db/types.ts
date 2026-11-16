export type Muscle =
  | 'pecho'
  | 'dorsales'
  | 'espalda_alta'
  | 'hombro_anterior'
  | 'hombro_lateral'
  | 'hombro_posterior'
  | 'biceps'
  | 'triceps'
  | 'antebrazos'
  | 'cuadriceps'
  | 'isquios'
  | 'gluteos'
  | 'aductores'
  | 'gemelos'
  | 'abdominales'
  | 'lumbares';

export type Equipment = 'barra' | 'mancuernas' | 'maquina' | 'polea' | 'peso_corporal';
export type Mechanic = 'compuesto' | 'aislamiento';
export type SetType = 'warmup' | 'working';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  mechanic: Mechanic;
  notes: string;
  /** Incremento de peso para este ejercicio (kg). Si no hay, se usa el de Ajustes. */
  increment?: number;
  builtin?: boolean;
  /** Borrado lógico: se oculta de la biblioteca pero el historial lo conserva. */
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Target {
  repMin: number;
  repMax: number;
  rir: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  warmupSets: number;
  workingSets: number;
  target: Target;
  /** Descanso específico (s). Si no hay, se usa el de Ajustes. */
  restSec?: number;
}

export interface Routine {
  id: string;
  name: string;
  order: number;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  done: boolean;
  completedAt?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  target?: Target;
  restSec?: number;
  sets: WorkoutSet[];
}

export interface RestTimer {
  startedAt: number;
  endsAt: number;
  duration: number;
}

export interface Workout {
  id: string;
  name: string;
  routineId?: string;
  status: 'active' | 'done';
  startedAt: number;
  endedAt?: number;
  notes?: string;
  exercises: WorkoutExercise[];
  /** Índice multiEntry para buscar entrenos por ejercicio. */
  exerciseIds: string[];
  rest?: RestTimer | null;
}

export interface BodyMetric {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  hips?: number;
  neck?: number;
  createdAt: number;
}

export type PhotoAngle = 'frente' | 'perfil' | 'espalda';

export interface Photo {
  id: string;
  date: string; // YYYY-MM-DD
  angle: PhotoAngle;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
  createdAt: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}
