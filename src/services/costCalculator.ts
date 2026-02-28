import { DETAILED_COSTS_REF } from '../constants';
import { LevelType } from '../types';

export interface CostBreakdown {
  grosOeuvre: number;
  finition: number;
  total: number;
  details: {
    mo: number;
    materials: number;
    equipment: number;
    finishing: number;
  };
  categories: { name: string; value: number }[];
}

export const calculateLevelCost = (type: LevelType, surface: number, baseSurface: number): CostBreakdown => {
  const ratio = surface / DETAILED_COSTS_REF.SURFACE_BASE;
  
  let go = 0;
  let fin = 0;
  let mo = 0;
  let materials = 0;
  let equipment = 0;
  let finishing = 0;
  const categories: { name: string; value: number }[] = [];

  const addCategory = (name: string, value: number) => {
    if (value > 0) categories.push({ name, value });
  };

  switch (type) {
    case LevelType.FOUNDATION: {
      const ref = DETAILED_COSTS_REF.FOUNDATION;
      mo = ref.MO * ratio;
      materials = (ref.PIERRES + ref.GRAVIER + ref.SABLE + ref.CIMENT + ref.FER + ref.DIVERS) * ratio;
      go = mo + materials;
      addCategory('Main d\'œuvre', mo);
      addCategory('Matériaux (Ciment, Fer, Pierres...)', materials);
      break;
    }
    case LevelType.RDC: {
      const refGO = DETAILED_COSTS_REF.RDC.GROS_OEUVRE;
      const refFIN = DETAILED_COSTS_REF.RDC.FINITION;
      mo = refGO.MO * ratio;
      materials = (refGO.BRIQUES + refGO.GRAVIER + refGO.SABLE + refGO.CIMENT + refGO.FER + refGO.PLANCHER) * ratio;
      equipment = refGO.EAU_ELEC * ratio;
      finishing = (refFIN.PLATRE + refFIN.ZELLIGE + refFIN.MARBRE + refFIN.PEINTURE + refFIN.ALUMINIUM + refFIN.SANITAIRES + refFIN.BOIS + refFIN.FERRONNERIE + refFIN.CUISINE) * ratio;
      go = mo + materials + equipment;
      fin = finishing;
      addCategory('Main d\'œuvre', mo);
      addCategory('Matériaux Gros Œuvre', materials);
      addCategory('Eau & Électricité', equipment);
      addCategory('Finitions (Zellige, Peinture...)', finishing);
      break;
    }
    case LevelType.FLOOR: {
      const refGO = DETAILED_COSTS_REF.FLOOR.GROS_OEUVRE;
      const refFIN = DETAILED_COSTS_REF.FLOOR.FINITION;
      mo = refGO.MO * ratio;
      materials = (refGO.BRIQUES + refGO.GRAVIER + refGO.SABLE + refGO.CIMENT + refGO.FER + refGO.PLANCHER) * ratio;
      equipment = refGO.EAU_ELEC * ratio;
      finishing = (refFIN.PLATRE + refFIN.ZELLIGE + refFIN.MARBRE + refFIN.PEINTURE + refFIN.ALUMINIUM + refFIN.SANITAIRES + refFIN.BOIS + refFIN.FERRONNERIE + refFIN.CUISINE) * ratio;
      go = mo + materials + equipment;
      fin = finishing;
      addCategory('Main d\'œuvre', mo);
      addCategory('Matériaux Gros Œuvre', materials);
      addCategory('Eau & Électricité', equipment);
      addCategory('Finitions (Zellige, Peinture...)', finishing);
      break;
    }
    case LevelType.SOUS_SOL: {
      // Use RDC as proxy for Sous-Sol if not specified, but usually Sous-Sol is more expensive in GO
      const refGO = DETAILED_COSTS_REF.RDC.GROS_OEUVRE;
      mo = refGO.MO * 1.2 * ratio;
      materials = (refGO.BRIQUES + refGO.GRAVIER + refGO.SABLE + refGO.CIMENT + refGO.FER + refGO.PLANCHER) * 1.2 * ratio;
      go = mo + materials;
      addCategory('Main d\'œuvre', mo);
      addCategory('Matériaux', materials);
      break;
    }
  }

  // Special case for Terrasse (often named floor but type is floor)
  // We should probably check the name or have a specific type. 
  // For now, let's assume the last level is Terrasse if it's named so.

  return {
    grosOeuvre: go,
    finition: fin,
    total: go + fin,
    details: { mo, materials, equipment, finishing },
    categories
  };
};

export const calculateTerrasseCost = (surface: number): CostBreakdown => {
  const ratio = surface / DETAILED_COSTS_REF.SURFACE_BASE;
  const refGO = DETAILED_COSTS_REF.TERRASSE.GROS_OEUVRE;
  const refFIN = DETAILED_COSTS_REF.TERRASSE.FINITION;
  
  const mo = refGO.MO * ratio;
  const materials = (refGO.BRIQUES + refGO.CIMENT + refGO.FER + refGO.SABLE) * ratio;
  const finishing = (refFIN.ZELLIGE + refFIN.PEINTURE + refFIN.FERRONNERIE) * ratio;
  
  const categories = [
    { name: 'Main d\'œuvre', value: mo },
    { name: 'Matériaux Gros Œuvre', value: materials },
    { name: 'Finitions Terrasse', value: finishing }
  ];

  return {
    grosOeuvre: mo + materials,
    finition: finishing,
    total: mo + materials + finishing,
    details: { mo, materials, equipment: 0, finishing },
    categories
  };
};
