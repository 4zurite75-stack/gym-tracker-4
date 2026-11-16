import type { Equipment, Exercise, Mechanic, Muscle } from './types';

type SeedRow = [id: string, name: string, primary: Muscle, secondary: Muscle[], equipment: Equipment, mechanic: Mechanic];

const C: Mechanic = 'compuesto';
const A: Mechanic = 'aislamiento';

const ROWS: SeedRow[] = [
  // Pecho
  ['press-banca', 'Press banca', 'pecho', ['triceps', 'hombro_anterior'], 'barra', C],
  ['press-inclinado-barra', 'Press inclinado con barra', 'pecho', ['hombro_anterior', 'triceps'], 'barra', C],
  ['press-banca-mancuernas', 'Press banca con mancuernas', 'pecho', ['triceps', 'hombro_anterior'], 'mancuernas', C],
  ['press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'pecho', ['hombro_anterior', 'triceps'], 'mancuernas', C],
  ['press-pecho-maquina', 'Press de pecho en máquina', 'pecho', ['triceps', 'hombro_anterior'], 'maquina', C],
  ['fondos', 'Fondos en paralelas', 'pecho', ['triceps', 'hombro_anterior'], 'peso_corporal', C],
  ['flexiones', 'Flexiones', 'pecho', ['triceps', 'hombro_anterior'], 'peso_corporal', C],
  ['aperturas-polea', 'Cruces en polea', 'pecho', [], 'polea', A],
  ['pec-deck', 'Contractor de pecho (pec deck)', 'pecho', [], 'maquina', A],
  ['aperturas-mancuernas', 'Aperturas con mancuernas', 'pecho', [], 'mancuernas', A],
  // Espalda
  ['dominadas', 'Dominadas', 'dorsales', ['biceps', 'espalda_alta'], 'peso_corporal', C],
  ['jalon-pecho', 'Jalón al pecho', 'dorsales', ['biceps', 'espalda_alta'], 'polea', C],
  ['remo-barra', 'Remo con barra', 'espalda_alta', ['dorsales', 'biceps', 'lumbares'], 'barra', C],
  ['remo-mancuerna', 'Remo con mancuerna', 'dorsales', ['espalda_alta', 'biceps'], 'mancuernas', C],
  ['remo-polea-baja', 'Remo en polea baja', 'espalda_alta', ['dorsales', 'biceps'], 'polea', C],
  ['remo-pecho-apoyado', 'Remo con pecho apoyado (máquina)', 'espalda_alta', ['dorsales', 'biceps'], 'maquina', C],
  ['pullover-polea', 'Pullover en polea', 'dorsales', [], 'polea', A],
  ['peso-muerto', 'Peso muerto', 'isquios', ['gluteos', 'lumbares', 'espalda_alta'], 'barra', C],
  ['encogimientos', 'Encogimientos con mancuernas', 'espalda_alta', [], 'mancuernas', A],
  // Hombro
  ['press-militar', 'Press militar', 'hombro_anterior', ['triceps', 'hombro_lateral'], 'barra', C],
  ['press-hombro-mancuernas', 'Press de hombro con mancuernas', 'hombro_anterior', ['triceps', 'hombro_lateral'], 'mancuernas', C],
  ['press-hombro-maquina', 'Press de hombro en máquina', 'hombro_anterior', ['triceps', 'hombro_lateral'], 'maquina', C],
  ['elevaciones-laterales', 'Elevaciones laterales', 'hombro_lateral', [], 'mancuernas', A],
  ['elevaciones-laterales-polea', 'Elevaciones laterales en polea', 'hombro_lateral', [], 'polea', A],
  ['pajaros', 'Pájaros (aperturas inversas)', 'hombro_posterior', ['espalda_alta'], 'mancuernas', A],
  ['face-pull', 'Face pull', 'hombro_posterior', ['espalda_alta'], 'polea', A],
  ['reverse-pec-deck', 'Aperturas inversas en máquina', 'hombro_posterior', ['espalda_alta'], 'maquina', A],
  // Brazos
  ['curl-barra', 'Curl con barra', 'biceps', ['antebrazos'], 'barra', A],
  ['curl-mancuernas', 'Curl con mancuernas', 'biceps', ['antebrazos'], 'mancuernas', A],
  ['curl-martillo', 'Curl martillo', 'biceps', ['antebrazos'], 'mancuernas', A],
  ['curl-polea', 'Curl en polea', 'biceps', [], 'polea', A],
  ['curl-predicador', 'Curl predicador en máquina', 'biceps', [], 'maquina', A],
  ['extension-triceps-polea', 'Extensión de tríceps en polea', 'triceps', [], 'polea', A],
  ['extension-triceps-sobre-cabeza', 'Extensión de tríceps sobre la cabeza', 'triceps', [], 'polea', A],
  ['press-frances', 'Press francés', 'triceps', [], 'barra', A],
  ['press-cerrado', 'Press banca agarre cerrado', 'triceps', ['pecho', 'hombro_anterior'], 'barra', C],
  ['curl-muneca', 'Curl de muñeca', 'antebrazos', [], 'mancuernas', A],
  // Pierna
  ['sentadilla', 'Sentadilla', 'cuadriceps', ['gluteos', 'aductores', 'lumbares'], 'barra', C],
  ['sentadilla-frontal', 'Sentadilla frontal', 'cuadriceps', ['gluteos', 'espalda_alta'], 'barra', C],
  ['sentadilla-hack', 'Sentadilla hack', 'cuadriceps', ['gluteos'], 'maquina', C],
  ['prensa', 'Prensa de piernas', 'cuadriceps', ['gluteos', 'aductores'], 'maquina', C],
  ['sentadilla-bulgara', 'Sentadilla búlgara', 'cuadriceps', ['gluteos', 'aductores'], 'mancuernas', C],
  ['zancadas', 'Zancadas', 'cuadriceps', ['gluteos'], 'mancuernas', C],
  ['extension-cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', [], 'maquina', A],
  ['peso-muerto-rumano', 'Peso muerto rumano', 'isquios', ['gluteos', 'lumbares'], 'barra', C],
  ['curl-femoral-tumbado', 'Curl femoral tumbado', 'isquios', [], 'maquina', A],
  ['curl-femoral-sentado', 'Curl femoral sentado', 'isquios', [], 'maquina', A],
  ['hip-thrust', 'Hip thrust', 'gluteos', ['isquios'], 'barra', C],
  ['aductores-maquina', 'Aductores en máquina', 'aductores', [], 'maquina', A],
  ['abductores-maquina', 'Abductores en máquina', 'gluteos', [], 'maquina', A],
  ['gemelos-de-pie', 'Gemelos de pie', 'gemelos', [], 'maquina', A],
  ['gemelos-sentado', 'Gemelos sentado', 'gemelos', [], 'maquina', A],
  // Core
  ['crunch-polea', 'Crunch en polea', 'abdominales', [], 'polea', A],
  ['elevacion-piernas', 'Elevación de piernas colgado', 'abdominales', [], 'peso_corporal', A],
  ['plancha', 'Plancha', 'abdominales', [], 'peso_corporal', A],
  ['hiperextensiones', 'Hiperextensiones', 'lumbares', ['gluteos', 'isquios'], 'peso_corporal', A],
];

export function seedExercises(now = Date.now()): Exercise[] {
  return ROWS.map(([id, name, primary, secondary, equipment, mechanic]) => ({
    id: `ex-${id}`,
    name,
    primary,
    secondary,
    equipment,
    mechanic,
    notes: '',
    builtin: true,
    createdAt: now,
    updatedAt: now,
  }));
}
