/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_PRICES = {
  GROS_OEUVRE: 1100, // DH/m2
  FINITION: 1100,    // DH/m2
  MAIN_DOEUVRE: 250, // DH/m2
  FONDATION_FORFAIT: 500, // DH/m2 terrain
  PLATRE: 100,       // DH/m2
  CARRELAGE: 200,    // DH/m2
  PEINTURE: 80       // DH/m2
};

export const SURFACE_RULES = {
  DEDUCTION_1_FACADE: 16,
  DEDUCTION_2_FACADES: 9,
  ENCORBELLEMENT: 6.5 // Average of 5.6 - 7
};

export const INITIAL_LEVELS = [
  { id: 'foundation', type: 'FOUNDATION', name: 'Fondations' },
  { id: 'rdc', type: 'RDC', name: 'Rez-de-chaussée' },
  { id: 'floor1', type: 'FLOOR', name: '1er Étage' },
  { id: 'floor2', type: 'FLOOR', name: '2ème Étage' },
  { id: 'terrasse', type: 'FLOOR', name: 'Terrasse' }
];

export const DEFAULT_INVESTMENT = {
  LAND_PRICE: 5000,
  NOTARY_FEES: 50000,
  MISC_FEES_PERCENT: 5,
  SALE_PRICE: 12000,
  STAIRS_DEDUCTION_M2: 12,
  WALLS_DEDUCTION_M2: 8,
  STATE_TAX: 20
};
