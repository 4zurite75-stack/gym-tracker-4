import type { Equipment, Mechanic, Muscle, PhotoAngle } from './types';

export const MUSCLES: Muscle[] = [
  'pecho',
  'dorsales',
  'espalda_alta',
  'hombro_anterior',
  'hombro_lateral',
  'hombro_posterior',
  'biceps',
  'triceps',
  'antebrazos',
  'cuadriceps',
  'isquios',
  'gluteos',
  'aductores',
  'gemelos',
  'abdominales',
  'lumbares',
];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  pecho: 'Pecho',
  dorsales: 'Dorsales',
  espalda_alta: 'Espalda alta',
  hombro_anterior: 'Hombro anterior',
  hombro_lateral: 'Hombro lateral',
  hombro_posterior: 'Hombro posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazos: 'Antebrazos',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquiotibiales',
  gluteos: 'Glúteos',
  aductores: 'Aductores',
  gemelos: 'Gemelos',
  abdominales: 'Abdominales',
  lumbares: 'Lumbares',
};

export const EQUIPMENT: Equipment[] = ['barra', 'mancuernas', 'maquina', 'polea', 'peso_corporal'];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barra: 'Barra',
  mancuernas: 'Mancuernas',
  maquina: 'Máquina',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
};

export const MECHANIC_LABEL: Record<Mechanic, string> = {
  compuesto: 'Compuesto',
  aislamiento: 'Aislamiento',
};

export const ANGLE_LABEL: Record<PhotoAngle, string> = {
  frente: 'Frente',
  perfil: 'Perfil',
  espalda: 'Espalda',
};
