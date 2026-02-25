/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum LevelType {
  FOUNDATION = 'FOUNDATION',
  RDC = 'RDC',
  FLOOR = 'FLOOR',
  SOUS_SOL = 'SOUS_SOL'
}

export interface Level {
  id: string;
  type: LevelType;
  name: string;
  surface: number;
  grosOeuvrePrice: number;
  finitionPrice: number;
}

export interface ProjectState {
  terrainArea: number;
  cos: number;
  facades: 1 | 2;
  levels: Level[];
  unitPrices: {
    grosOeuvre: number;
    finition: number;
    mainDoeuvre: number;
    platre: number;
    carrelage: number;
    peinture: number;
  };
  landPricePerM2: number;
  notaryFees: number;
  miscFeesPercentage: number;
  miscFeesFixed: number;
  salePricePerM2: number;
  deductionStairsM2: number;
  deductionWallsM2: number;
  stateTaxPercentage: number;
  encorbellementM2: number;
}
