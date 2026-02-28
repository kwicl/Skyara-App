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

export const DETAILED_COSTS_REF = {
  SURFACE_BASE: 100,
  RACCORDEMENT_FIXED: 15000,
  FOUNDATION: {
    MO: 12000,
    PIERRES: 3000,
    GRAVIER: 3500,
    SABLE: 6000,
    CIMENT: 12300,
    FER: 10560,
    DIVERS: 2700, // PVC + Fil/Clous to match 50060
  },
  RDC: {
    GROS_OEUVRE: {
      MO: 24000,
      BRIQUES: 12320,
      GRAVIER: 3500,
      SABLE: 6000,
      CIMENT: 16080,
      FER: 10560,
      EAU_ELEC: 10000,
      PLANCHER: 10000,
    },
    FINITION: {
      PLATRE: 10400,
      ZELLIGE: 19500,
      MARBRE: 11000,
      PEINTURE: 8000,
      ALUMINIUM: 10500,
      SANITAIRES: 4000,
      BOIS: 8000,
      FERRONNERIE: 10000,
      CUISINE: 15000,
    }
  },
  FLOOR: {
    GROS_OEUVRE: {
      MO: 24000,
      BRIQUES: 13460,
      GRAVIER: 3500,
      SABLE: 6000,
      CIMENT: 16080,
      FER: 10560,
      EAU_ELEC: 12000,
      PLANCHER: 11000,
    },
    FINITION: {
      PLATRE: 11700,
      ZELLIGE: 19500,
      MARBRE: 11000,
      PEINTURE: 8000,
      ALUMINIUM: 14000,
      SANITAIRES: 4000,
      FERRONNERIE: 6000,
      BOIS: 10000,
      CUISINE: 15000,
    }
  },
  TERRASSE: {
    GROS_OEUVRE: {
      MO: 10000,
      BRIQUES: 5120,
      CIMENT: 4100,
      FER: 6160,
      SABLE: 6000,
    },
    FINITION: {
      ZELLIGE: 16500,
      PEINTURE: 8000,
      FERRONNERIE: 2500,
    }
  }
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
