/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  Download, 
  AlertTriangle, 
  Home, 
  Layers, 
  Settings2, 
  TrendingUp,
  Info,
  ChevronRight,
  Building2,
  DollarSign,
  Briefcase,
  Percent,
  Calculator,
  ArrowRightLeft,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Level, LevelType, ProjectState } from './types';
import { DETAILED_COSTS_REF, DEFAULT_PRICES, SURFACE_RULES, DEFAULT_INVESTMENT } from './constants';
import { calculateLevelCost, calculateTerrasseCost } from './services/costCalculator';
import { generatePDF } from './utils/pdfExport';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<ProjectState>({
    terrainArea: 100,
    cos: 2.1,
    facades: 1,
    levels: [
      { id: 'foundation', type: LevelType.FOUNDATION, name: 'Fondations', surface: 100, grosOeuvrePrice: 500, finitionPrice: 0 },
      { id: 'rdc', type: LevelType.RDC, name: 'Rez-de-chaussée', surface: 84, grosOeuvrePrice: 1100, finitionPrice: 1100 },
      { id: 'floor1', type: LevelType.FLOOR, name: '1er Étage', surface: 90.5, grosOeuvrePrice: 1100, finitionPrice: 1100 },
      { id: 'floor2', type: LevelType.FLOOR, name: '2ème Étage', surface: 90.5, grosOeuvrePrice: 1100, finitionPrice: 1100 },
      { id: 'terrasse', type: LevelType.FLOOR, name: 'Terrasse', surface: 100, grosOeuvrePrice: 500, finitionPrice: 500 },
    ],
    unitPrices: {
      grosOeuvre: DEFAULT_PRICES.GROS_OEUVRE,
      finition: DEFAULT_PRICES.FINITION,
      mainDoeuvre: DEFAULT_PRICES.MAIN_DOEUVRE,
      platre: DEFAULT_PRICES.PLATRE,
      carrelage: DEFAULT_PRICES.CARRELAGE,
      peinture: DEFAULT_PRICES.PEINTURE,
    },
    landPricePerM2: DEFAULT_INVESTMENT.LAND_PRICE,
    notaryFees: DEFAULT_INVESTMENT.NOTARY_FEES,
    miscFeesPercentage: DEFAULT_INVESTMENT.MISC_FEES_PERCENT,
    miscFeesFixed: 5000,
    salePricePerM2: DEFAULT_INVESTMENT.SALE_PRICE,
    deductionStairsM2: DEFAULT_INVESTMENT.STAIRS_DEDUCTION_M2,
    deductionWallsM2: DEFAULT_INVESTMENT.WALLS_DEDUCTION_M2,
    stateTaxPercentage: DEFAULT_INVESTMENT.STATE_TAX,
    encorbellementM2: SURFACE_RULES.ENCORBELLEMENT,
  });

  // Recalculate surfaces based on rules
  const calculatedLevels = useMemo(() => {
    const deduction = state.facades === 1 ? SURFACE_RULES.DEDUCTION_1_FACADE : SURFACE_RULES.DEDUCTION_2_FACADES;
    
    return state.levels.map(level => {
      let surface = state.terrainArea;
      if (level.type === LevelType.RDC) {
        surface = state.terrainArea - deduction;
      } else if (level.type === LevelType.FLOOR) {
        surface = (state.terrainArea - deduction) + state.encorbellementM2;
      } else if (level.type === LevelType.SOUS_SOL) {
        surface = state.terrainArea;
      }
      
      const sellableSurface = level.type === LevelType.FOUNDATION ? 0 : Math.max(0, surface - state.deductionStairsM2 - state.deductionWallsM2);

      return { ...level, surface, sellableSurface };
    });
  }, [state.terrainArea, state.facades, state.levels, state.deductionStairsM2, state.deductionWallsM2, state.encorbellementM2]);

  const totals = useMemo(() => {
    let grosOeuvre = 0;
    let finition = 0;
    let totalSurface = 0;
    let totalSellableSurface = 0;
    const allCategories: Record<string, number> = {};

    calculatedLevels.forEach(level => {
      let cost;
      if (level.name.toLowerCase().includes('terrasse')) {
        cost = calculateTerrasseCost(state.terrainArea);
      } else {
        cost = calculateLevelCost(level.type, state.terrainArea, DETAILED_COSTS_REF.SURFACE_BASE);
      }

      grosOeuvre += cost.grosOeuvre;
      finition += cost.finition;
      
      if (level.type !== LevelType.FOUNDATION && !level.name.toLowerCase().includes('terrasse')) {
        totalSurface += level.surface;
      }

      cost.categories.forEach(cat => {
        allCategories[cat.name] = (allCategories[cat.name] || 0) + cat.value;
      });
      
      totalSellableSurface += (level as any).sellableSurface || 0;
    });

    // Add fixed connection cost
    grosOeuvre += DETAILED_COSTS_REF.RACCORDEMENT_FIXED;
    allCategories['Raccordement Eau/Élec'] = DETAILED_COSTS_REF.RACCORDEMENT_FIXED;

    const constructionCost = grosOeuvre + finition;
    const landCost = state.terrainArea * state.landPricePerM2;
    const miscFeesPercentValue = constructionCost * (state.miscFeesPercentage / 100);
    const totalInvestment = landCost + state.notaryFees + constructionCost + miscFeesPercentValue + state.miscFeesFixed;
    
    const totalRevenue = totalSellableSurface * state.salePricePerM2;
    const grossProfit = totalRevenue - totalInvestment;
    const stateTax = grossProfit > 0 ? grossProfit * (state.stateTaxPercentage / 100) : 0;
    const netProfit = grossProfit - stateTax;
    const marginPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Material Estimations (Standard Moroccan R+2 Ratios)
    const estSteel = totalSurface * 38; // ~38kg/m2
    const estCement = totalSurface * 3.2; // ~3.2 bags/m2
    const estBricks = totalSurface * 48; // ~48 units/m2
    const estConcrete = totalSurface * 0.32; // ~0.32 m3/m2

    const numEtages = state.levels.filter(l => l.type === LevelType.FLOOR && l.name.includes('Étage')).length;

    const totalMO = (
      (DETAILED_COSTS_REF.FOUNDATION.MO + 
       DETAILED_COSTS_REF.RDC.GROS_OEUVRE.MO + 
       (DETAILED_COSTS_REF.RDC.FINITION.PLATRE * 0.4) + 
       (DETAILED_COSTS_REF.RDC.FINITION.ZELLIGE * 0.4) + 
       (DETAILED_COSTS_REF.RDC.FINITION.PEINTURE * 0.5)) +
      (DETAILED_COSTS_REF.FLOOR.GROS_OEUVRE.MO + 
       (DETAILED_COSTS_REF.FLOOR.FINITION.PLATRE * 0.4) + 
       (DETAILED_COSTS_REF.FLOOR.FINITION.ZELLIGE * 0.4) + 
       (DETAILED_COSTS_REF.FLOOR.FINITION.PEINTURE * 0.5)) * numEtages +
      (DETAILED_COSTS_REF.TERRASSE.GROS_OEUVRE.MO)
    ) * (state.terrainArea / 100);

    const totalMaterials = constructionCost - totalMO - DETAILED_COSTS_REF.RACCORDEMENT_FIXED;

    return {
      grosOeuvre,
      finition,
      constructionCost,
      landCost,
      totalInvestment,
      totalRevenue,
      grossProfit,
      stateTax,
      netProfit,
      marginPercentage,
      totalSurface,
      totalSellableSurface,
      estSteel,
      estCement,
      estBricks,
      estConcrete,
      totalMO,
      totalMaterials,
      maxAllowedSurface: state.terrainArea * state.cos,
      isOverCOS: totalSurface > (state.terrainArea * state.cos)
    };
  }, [calculatedLevels, state.terrainArea, state.cos, state.landPricePerM2, state.notaryFees, state.miscFeesPercentage, state.miscFeesFixed, state.salePricePerM2, state.stateTaxPercentage, state.connectionFees]);

  const chartData = [
    { name: 'Terrain', value: totals.landCost, color: '#0d9488' }, // Teal 600
    { name: 'Construction', value: totals.constructionCost, color: '#0f172a' }, // Slate 900
    { name: 'Frais & Taxes', value: state.notaryFees + state.miscFeesFixed + state.connectionFees + (totals.constructionCost * (state.miscFeesPercentage / 100)), color: '#f59e0b' }, // Amber 500
  ];

  const addLevel = () => {
    const floorCount = state.levels.filter(l => l.type === LevelType.FLOOR).length;
    const newLevel: Level = {
      id: `floor${floorCount + 1}`,
      type: LevelType.FLOOR,
      name: `${floorCount + 1}${floorCount === 0 ? 'er' : 'ème'} Étage`,
      surface: 0,
      grosOeuvrePrice: state.unitPrices.grosOeuvre,
      finitionPrice: state.unitPrices.finition
    };
    setState(prev => ({ ...prev, levels: [...prev.levels, newLevel] }));
  };

  const removeLevel = () => {
    if (state.levels.length > 2) {
      setState(prev => ({ ...prev, levels: prev.levels.slice(0, -1) }));
    }
  };

  const handleQuickSimulation = () => {
    setState(prev => ({
      ...prev,
      terrainArea: 100,
      facades: 2,
      cos: 2.1,
      levels: [
        { id: 'foundation', type: LevelType.FOUNDATION, name: 'Fondations', surface: 100, grosOeuvrePrice: 500, finitionPrice: 0 },
        { id: 'rdc', type: LevelType.RDC, name: 'Rez-de-chaussée', surface: 91, grosOeuvrePrice: 1100, finitionPrice: 1100 },
        { id: 'floor1', type: LevelType.FLOOR, name: '1er Étage', surface: 98, grosOeuvrePrice: 1100, finitionPrice: 1100 },
        { id: 'floor2', type: LevelType.FLOOR, name: '2ème Étage', surface: 98, grosOeuvrePrice: 1100, finitionPrice: 1100 },
      ]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Sidebar - Mobile Header / Desktop Sidebar */}
      <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col overflow-y-auto lg:h-screen safe-pt">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between lg:block">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200 overflow-hidden relative group">
              <Building2 size={32} className="relative z-10" />
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900 to-slate-800 opacity-50" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 leading-tight">SkyHigh <span className="text-[#800020]">icl</span></h1>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Expertise Immobilière</p>
            </div>
          </div>
          <button className="lg:hidden p-2 text-slate-400">
            <Settings2 size={24} />
          </button>
        </div>

        <div className="p-8 space-y-10">
          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Configuration Terrain
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Surface Terrain (m²)</label>
                <input 
                  type="number" 
                  value={state.terrainArea} 
                  onChange={(e) => setState(prev => ({ ...prev, terrainArea: Number(e.target.value) }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Prix Achat Terrain (DH/m²)</label>
                <input 
                  type="number" 
                  value={state.landPricePerM2} 
                  onChange={(e) => setState(prev => ({ ...prev, landPricePerM2: Number(e.target.value) }))}
                  className="input-field border-teal-100 focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">COS</label>
                  <input 
                    type="number" step="0.1"
                    value={state.cos} 
                    onChange={(e) => setState(prev => ({ ...prev, cos: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Façades</label>
                  <select 
                    value={state.facades}
                    onChange={(e) => setState(prev => ({ ...prev, facades: Number(e.target.value) as 1 | 2 }))}
                    className="input-field"
                  >
                    <option value={1}>1 Façade</option>
                    <option value={2}>2 Façades</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Structure Projet
            </h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-700 uppercase">Nombre d'Étages</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={removeLevel}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-display font-bold text-slate-900 w-4 text-center">
                    {state.levels.filter(l => l.type === LevelType.FLOOR).length}
                  </span>
                  <button 
                    onClick={addLevel}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-500 hover:border-teal-200 transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Configurez le nombre d'étages de votre projet R+2.</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Vente & Fiscalité
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Prix de Vente (DH/m²)</label>
                <input 
                  type="number" 
                  value={state.salePricePerM2} 
                  onChange={(e) => setState(prev => ({ ...prev, salePricePerM2: Number(e.target.value) }))}
                  className="input-field border-teal-200 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Taxe État %</label>
                <input 
                  type="number" 
                  value={state.stateTaxPercentage} 
                  onChange={(e) => setState(prev => ({ ...prev, stateTaxPercentage: Number(e.target.value) }))}
                  className="input-field"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Déductions Surface
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Escaliers (m²)</label>
                  <input 
                    type="number" 
                    value={state.deductionStairsM2} 
                    onChange={(e) => setState(prev => ({ ...prev, deductionStairsM2: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Murs (m²)</label>
                  <input 
                    type="number" 
                    value={state.deductionWallsM2} 
                    onChange={(e) => setState(prev => ({ ...prev, deductionWallsM2: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Encorbellement (m²)</label>
                <input 
                  type="number" step="0.1"
                  value={state.encorbellementM2} 
                  onChange={(e) => setState(prev => ({ ...prev, encorbellementM2: Number(e.target.value) }))}
                  className="input-field border-teal-100 focus:border-teal-500"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Charges Fixes
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Notaire (DH)</label>
                  <input 
                    type="number" 
                    value={state.notaryFees} 
                    onChange={(e) => setState(prev => ({ ...prev, notaryFees: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Divers (DH)</label>
                  <input 
                    type="number" 
                    value={state.miscFeesFixed} 
                    onChange={(e) => setState(prev => ({ ...prev, miscFeesFixed: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto bg-slate-50 safe-pb">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 lg:mt-0 mt-6">
          <div>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-slate-900 tracking-tight">Analyse <span className="text-teal-600">Financière</span></h2>
            <p className="text-slate-500 font-medium mt-2">Expertise de rentabilité Construction R+2</p>
          </div>
          <button 
            onClick={() => generatePDF(state, totals)}
            className="btn-primary w-full md:w-auto px-8"
          >
            <Download size={20} /> Exporter Rapport PDF
          </button>
        </header>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          <motion.div whileHover={{ scale: 1.02 }} className="card-stat">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <DollarSign size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investissement</p>
            </div>
            <h3 className="text-3xl font-bold text-[#800020]">{(totals.totalInvestment / 10000).toFixed(1)} <span className="text-sm font-medium text-slate-400">M Cts</span></h3>
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-[11px] font-bold text-teal-600">{totals.totalInvestment.toLocaleString()} DH</p>
              <p className="text-[9px] text-slate-400 font-medium">Terrain: {totals.landCost.toLocaleString()} DH</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="card-stat">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chiffre d'Affaires</p>
            </div>
            <h3 className="text-3xl font-bold text-[#800020]">{(totals.totalRevenue / 10000).toFixed(1)} <span className="text-sm font-medium text-slate-400">M Cts</span></h3>
            <p className="text-[11px] font-bold text-slate-600 mt-3">{totals.totalRevenue.toLocaleString()} DH</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }} 
            className={cn("card-stat", totals.netProfit >= 0 ? "border-teal-100 bg-teal-50/30" : "border-rose-100 bg-rose-50/30")}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", totals.netProfit >= 0 ? "bg-teal-100 text-teal-600" : "bg-rose-100 text-rose-600")}>
                <Briefcase size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bénéfice Net</p>
            </div>
            <h3 className="text-3xl font-bold text-[#800020]">{(totals.netProfit / 10000).toFixed(1)} <span className="text-sm font-medium text-slate-400">M Cts</span></h3>
            <p className="text-[11px] font-bold text-teal-600 mt-3">Taxe: {totals.stateTax.toLocaleString()} DH</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="card-stat">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Percent size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROI Net</p>
            </div>
            <h3 className="text-3xl font-bold text-[#800020]">{((totals.netProfit / totals.totalInvestment) * 100).toFixed(1)} <span className="text-sm font-medium text-slate-400">%</span></h3>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-600 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, (totals.netProfit / totals.totalInvestment) * 100))}%` }}
              />
            </div>
          </motion.div>
        </div>

        {/* Detailed Analysis Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-12">
          <section className="glass-panel overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <h4 className="font-display font-bold text-slate-900 flex items-center gap-3 uppercase tracking-wider text-xs">
                <Calculator size={20} className="text-teal-600" /> Analyse Structurelle
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    <th className="px-8 py-5">Niveau</th>
                    <th className="px-8 py-5">Surface</th>
                    <th className="px-8 py-5">Vendable</th>
                    <th className="px-8 py-5 text-right">Revenu</th>
                  </tr>
                </thead>
                <tbody className="divide-slate-100 divide-y">
                  {calculatedLevels.map((level) => {
                    const isFoundation = level.type === LevelType.FOUNDATION;
                    const revenue = (level as any).sellableSurface * state.salePricePerM2;
                    return (
                      <tr key={level.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="font-bold text-slate-900">{level.name}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-medium text-slate-500">{level.surface.toFixed(1)} m²</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold text-teal-600">
                            {isFoundation ? "-" : `${(level as any).sellableSurface.toFixed(1)} m²`}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="font-bold text-slate-900">
                            {isFoundation ? "-" : `${revenue.toLocaleString()} DH`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-10">
            <section className="glass-panel p-10">
              <h4 className="font-display font-bold text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-xs">
                <PieChartIcon size={20} className="text-teal-600" /> Répartition Capital
              </h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={105}
                      paddingAngle={10}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => `${value.toLocaleString()} DH`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>

        {/* Detailed Construction Breakdown (Dynamic Section) */}
        <section className="glass-panel p-10 mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h4 className="font-display font-bold text-slate-900 mb-2 flex items-center gap-3 uppercase tracking-wider text-xs">
                <Layers size={20} className="text-teal-600" /> Détails Techniques de Construction (Dynamique - {state.terrainArea}m²)
              </h4>
              <p className="text-xs text-slate-400">Estimations basées sur les prix 2024 au Maroc (Base 100m² R+2)</p>
            </div>
            <div className="bg-teal-50 px-6 py-3 rounded-2xl border border-teal-100">
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Total Construction Estimé</p>
              <p className="text-2xl font-bold text-teal-700">{totals.constructionCost.toLocaleString()} DH</p>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4 bg-white rounded-3xl p-8 border border-slate-100">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-3 flex justify-between items-center">
                <span>1. Fondations (الأساسات)</span>
                <span className="text-[10px] font-normal text-slate-400">~{Math.round(state.terrainArea * 500.6).toLocaleString()} DH</span>
              </h5>
              <ul className="text-xs space-y-3 text-slate-600">
                <li className="flex justify-between"><span>Main d'œuvre (اليد العاملة)</span> <span className="font-bold">{Math.round(state.terrainArea * 120).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Pierres (الحجر)</span> <span className="font-bold">{Math.round(state.terrainArea * 30).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Gravier (الكياس)</span> <span className="font-bold">{Math.round(state.terrainArea * 35).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Sable (الرملة)</span> <span className="font-bold">{Math.round(state.terrainArea * 60).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Ciment 45 (السيمة)</span> <span className="font-bold">{Math.round(state.terrainArea * 123).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Fer (الحديد)</span> <span className="font-bold">{Math.round(state.terrainArea * 105.6).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Divers (PVC, Clous...)</span> <span className="font-bold">{Math.round(state.terrainArea * 27).toLocaleString()} DH</span></li>
              </ul>
            </div>

            <div className="space-y-4 bg-white rounded-3xl p-8 border border-slate-100">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-3 flex justify-between items-center">
                <span>2. Rez-de-chaussée (الطابق السفلي)</span>
                <span className="text-[10px] font-normal text-slate-400">~{Math.round(state.terrainArea * 1888.6).toLocaleString()} DH</span>
              </h5>
              <ul className="text-xs space-y-3 text-slate-600">
                <li className="flex justify-between text-teal-600 font-semibold"><span>Gros Œuvre (البناء)</span> <span>{Math.round(state.terrainArea * 924.6).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Main d'œuvre</span> <span>{Math.round(state.terrainArea * 240).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Briques (12 & 8)</span> <span>{Math.round(state.terrainArea * 123.2).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Ciment (35 & 45)</span> <span>{Math.round(state.terrainArea * 160.8).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Fer (6, 10, 12 mm)</span> <span>{Math.round(state.terrainArea * 105.6).toLocaleString()} DH</span></li>
                <li className="flex justify-between text-emerald-600 font-semibold"><span>Finitions (الإصلاح)</span> <span>{Math.round(state.terrainArea * 964).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Plâtre & Carrelage</span> <span>{Math.round(state.terrainArea * 299).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Cuisine & Menuiserie</span> <span>{Math.round(state.terrainArea * 330).toLocaleString()} DH</span></li>
              </ul>
            </div>

            <div className="space-y-4 bg-white rounded-3xl p-8 border border-slate-100">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-3 flex justify-between items-center">
                <span>3. Étages (الطوابق العلوي)</span>
                <span className="text-[10px] font-normal text-slate-400">~{Math.round(state.terrainArea * 1958 * state.levels.filter(l => l.name.includes('Étage')).length).toLocaleString()} DH</span>
              </h5>
              <ul className="text-xs space-y-3 text-slate-600">
                <li className="flex justify-between text-teal-600 font-semibold"><span>Gros Œuvre / Étage</span> <span>{Math.round(state.terrainArea * 966).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Structure & Briques</span> <span>{Math.round(state.terrainArea * 966).toLocaleString()} DH</span></li>
                <li className="flex justify-between text-emerald-600 font-semibold"><span>Finitions / Étage</span> <span>{Math.round(state.terrainArea * 992).toLocaleString()} DH</span></li>
                <li className="flex justify-between pl-2"><span>• Chambres & Salons</span> <span>{Math.round(state.terrainArea * 992).toLocaleString()} DH</span></li>
              </ul>
            </div>

            <div className="space-y-4 bg-white rounded-3xl p-8 border border-slate-100">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-3 flex justify-between items-center">
                <span>4. Terrasse (السطح)</span>
                <span className="text-[10px] font-normal text-slate-400">~{Math.round(state.terrainArea * 583.8).toLocaleString()} DH</span>
              </h5>
              <ul className="text-xs space-y-3 text-slate-600">
                <li className="flex justify-between"><span>Gros Œuvre (البناء)</span> <span className="font-bold">{Math.round(state.terrainArea * 313.8).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Finition (الاصلاح)</span> <span className="font-bold">{Math.round(state.terrainArea * 270).toLocaleString()} DH</span></li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            <div className="lg:col-span-2 bg-slate-50 rounded-[2rem] p-10 border border-slate-100">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Récapitulatif Global par Poste</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 bg-white rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main d'œuvre (اليد العاملة)</p>
                  <p className="text-2xl font-bold text-teal-600">{Math.round(totals.totalMO).toLocaleString()} DH</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Matériaux (السلعة)</p>
                  <p className="text-2xl font-bold text-teal-600">{Math.round(totals.totalMaterials).toLocaleString()} DH</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Raccordements (المصاريف)</p>
                  <p className="text-2xl font-bold text-teal-600">15,000 DH</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-10 text-white flex flex-col justify-center">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs uppercase tracking-widest">Gros Œuvre (البناء)</span>
                  <span className="font-bold text-xl">{totals.grosOeuvre.toLocaleString()} DH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs uppercase tracking-widest">Finition (الاصلاح)</span>
                  <span className="font-bold text-xl">{totals.finition.toLocaleString()} DH</span>
                </div>
                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <span className="font-bold text-teal-400 uppercase tracking-tighter text-lg">Grand Total Estimé</span>
                  <span className="font-bold text-2xl text-white">~{totals.constructionCost.toLocaleString()} DH</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance & Materials */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 mb-12">
          <section className="xl:col-span-2 glass-panel p-10">
            <h4 className="font-display font-bold text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-xs">
              <ArrowRightLeft size={20} className="text-teal-600" /> Performance Économique
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Coût Construction Moyen</p>
                <p className="text-4xl font-bold text-slate-900">
                  {(totals.constructionCost / totals.totalSurface).toFixed(0)} <span className="text-sm font-medium text-slate-400">DH/m²</span>
                </p>
              </div>
              <div className="p-8 bg-teal-600 rounded-3xl shadow-lg shadow-teal-200">
                <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mb-4">Prix de Vente Net</p>
                <p className="text-4xl font-bold text-white">
                  {state.salePricePerM2.toLocaleString()} <span className="text-sm font-medium text-teal-100/60">DH/m²</span>
                </p>
              </div>
            </div>
            
            <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Marge Nette</p>
                  <p className="text-5xl font-bold text-teal-400">{totals.marginPercentage.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Profit / m² Vendable</p>
                  <p className="text-3xl font-bold text-white">
                    {(totals.netProfit / totals.totalSellableSurface).toFixed(0)} <span className="text-sm font-medium text-slate-400">DH</span>
                  </p>
                </div>
              </div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, totals.marginPercentage))}%` }}
                  className="h-full bg-teal-400 rounded-full"
                />
              </div>
            </div>
          </section>

          <section className="glass-panel p-10">
            <h4 className="font-display font-bold text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-xs">
              <Layers size={20} className="text-teal-600" /> Matériaux Estimés
            </h4>
            <div className="space-y-6">
              {[
                { label: 'Acier (Fer)', value: `${(totals.estSteel / 1000).toFixed(2)} T`, icon: 'Fe', color: 'text-teal-600 bg-teal-50' },
                { label: 'Ciment', value: `${Math.round(totals.estCement)} Sacs`, icon: 'Ci', color: 'text-amber-600 bg-amber-50' },
                { label: 'Briques', value: `${Math.round(totals.estBricks).toLocaleString()} U`, icon: 'Br', color: 'text-slate-600 bg-slate-50' },
                { label: 'Béton', value: `${Math.round(totals.estConcrete)} m³`, icon: 'Be', color: 'text-teal-600 bg-teal-50' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 hover:border-teal-100 transition-all">
                  <div className="flex items-center gap-5">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs", item.color)}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-lg">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Unit Prices - Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
          <section className="lg:col-span-2 glass-panel p-10">
            <h4 className="font-display font-bold text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-xs">
              <TrendingUp size={20} className="text-teal-600" /> Flux Financiers
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Investissement', value: totals.totalInvestment, fill: '#0f172a' },
                  { name: 'Chiffre d\'Affaires', value: totals.totalRevenue, fill: '#0d9488' },
                  { name: 'Bénéfice Net', value: totals.netProfit, fill: '#10b981' }
                ]}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => `${value.toLocaleString()} DH`}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass-panel p-10">
            <h4 className="font-display font-bold text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-xs">
              <Settings2 size={20} className="text-teal-600" /> Coûts Directs
            </h4>
            <div className="space-y-8">
              {[
                { label: 'Gros Œuvre', value: state.unitPrices.grosOeuvre, key: 'grosOeuvre', min: 800, max: 1500, color: 'accent-teal-600' },
                { label: 'Finition', value: state.unitPrices.finition, key: 'finition', min: 800, max: 2000, color: 'accent-slate-900' },
              ].map((slider) => (
                <div key={slider.key}>
                  <div className="flex justify-between mb-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{slider.label}</label>
                    <span className="text-sm font-bold text-slate-900">{slider.value} DH</span>
                  </div>
                  <input 
                    type="range" min={slider.min} max={slider.max} step="10"
                    value={slider.value}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      unitPrices: { ...prev.unitPrices, [slider.key]: Number(e.target.value) } 
                    }))}
                    className={cn("w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer", slider.color)}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Full Detailed Breakdown Section */}
        <section className="glass-panel p-10 mb-12">
          <div className="border-b border-slate-100 pb-8 mb-10">
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">Détails Complets de Construction</h3>
            <p className="text-slate-500 text-sm">Analyse exhaustive basée sur un terrain de {state.terrainArea} m² (R+2)</p>
          </div>

          <div className="space-y-16">
            {/* 1. Fondations */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center text-sm">1</span>
                  Fondations (الأساس - الفونداسيون)
                </h4>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coût Estimé</p>
                  <p className="text-2xl font-bold text-[#800020]">{Math.round(50060 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Main d'œuvre (اليد العاملة)", value: 12000, detail: "120 DH/m²" },
                  { label: "Pierres (الحجر)", value: 3000, detail: "30 m³ + 6 m³" },
                  { label: "Gravier (الكياس)", value: 3500, detail: "25 m³" },
                  { label: "Sable (الرملة)", value: 6000, detail: "22 m³" },
                  { label: "Ciment 45 (السيمة)", value: 12300, detail: "150 sacs" },
                  { label: "Fer (الحديد)", value: 10560, detail: "6mm, 10mm, 12mm" },
                  { label: "Fil de fer & Clous", value: 1200, detail: "80 kg" },
                  { label: "Tuyaux d'évacuation", value: 0, detail: "Inclus dans le total" }
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{item.label}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-lg font-bold text-slate-900">{item.value > 0 ? Math.round(item.value * (state.terrainArea / 100)).toLocaleString() : "-"} <span className="text-[10px] font-medium text-slate-400">DH</span></p>
                      <span className="text-[10px] text-slate-400 italic">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. RDC */}
            <div className="pt-10 border-t border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center text-sm">2</span>
                  Rez-de-chaussée (الطابق السفلي - RDC)
                </h4>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gros Œuvre</p>
                    <p className="text-xl font-bold text-slate-900">{Math.round(92460 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Finition</p>
                    <p className="text-xl font-bold text-slate-900">{Math.round(96400 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total RDC</p>
                    <p className="text-2xl font-bold text-[#800020]">{Math.round(188860 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Détail Gros Œuvre (البناء)</p>
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-3">
                    {[
                      { l: "Main d'œuvre", v: 24000, d: "240 DH/m²" },
                      { l: "Briques (12 & 8)", v: 12320, d: "4200 unités" },
                      { l: "Matériaux (Gravier/Sable)", v: 9500, d: "Base 100m²" },
                      { l: "Ciment (35 & 45)", v: 16080, d: "200 sacs" },
                      { l: "Fer (6, 10, 12 mm)", v: 10560, d: "12 quintaux" },
                      { l: "Eau & Électricité", v: 10000, d: "Encastré" },
                      { l: "Plancher (Hourdis)", v: 10000, d: "Poutrelles" }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{item.l}</span>
                        <span className="font-bold text-slate-900">{Math.round(item.v * (state.terrainArea / 100)).toLocaleString()} DH</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Détail Finition (الإصلاح)</p>
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-3">
                    {[
                      { l: "Plâtre (الجبص)", v: 10400, d: "80 m²" },
                      { l: "Carrelage (الزليج)", v: 19500, d: "130 m²" },
                      { l: "Marbre (الرخام)", v: 11000, d: "Salons/Escaliers" },
                      { l: "Peinture (الصباغة)", v: 8000, d: "Main d'œuvre incluse" },
                      { l: "Aluminium & Sanitaires", v: 14500, d: "Portes/Fenêtres" },
                      { l: "Menuiserie Bois", v: 8000, d: "4 portes" },
                      { l: "Ferronnerie (Inox/Fer)", v: 10000, d: "Porte principale" },
                      { l: "Cuisine & Placards", v: 15000, d: "Complet" }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{item.l}</span>
                        <span className="font-bold text-slate-900">{Math.round(item.v * (state.terrainArea / 100)).toLocaleString()} DH</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Étages */}
            <div className="pt-10 border-t border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center text-sm">3</span>
                  Étages (الطابق الأول والثاني)
                </h4>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gros Œuvre / Étage</p>
                    <p className="text-xl font-bold text-slate-900">{Math.round(96600 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Finition / Étage</p>
                    <p className="text-xl font-bold text-slate-900">{Math.round(99200 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total par Étage</p>
                    <p className="text-2xl font-bold text-[#800020]">{Math.round(195800 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-6 italic">Note: Légère augmentation due aux balcons et projections (البروزات).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { l: "Briques (12 & 8)", v: 14000, d: "Plus d'unités" },
                  { l: "Électricité/Plomberie", v: 12000, d: "Étage" },
                  { l: "Plancher (Hourdis)", v: 11000, d: "Étage" },
                  { l: "Plâtre (90 m²)", v: 11700, d: "Étage" },
                  { l: "Aluminium (5 fenêtres)", v: 14000, d: "Étage" },
                  { l: "Bois (5 portes)", v: 10000, d: "Étage" }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{item.l}</p>
                    <p className="font-bold text-slate-900">{Math.round(item.v * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Terrasse */}
            <div className="pt-10 border-t border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center text-sm">4</span>
                  Terrasse/Toit (السطح)
                </h4>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gros Œuvre</p>
                    <p className="text-xl font-bold text-slate-900">{Math.round(31380 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Finition</p>
                    <p className="text-xl font-bold text-slate-900">{Math.round(27000 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Terrasse</p>
                    <p className="text-2xl font-bold text-[#800020]">{Math.round(58380 * (state.terrainArea / 100)).toLocaleString()} DH</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { l: "Main d'œuvre", v: 10000, d: "100 DH/m²" },
                  { l: "Briques (Acrotère)", v: 5120, d: "سترة" },
                  { l: "Ciment 45 (50 sacs)", v: 4100, d: "Terrasse" },
                  { l: "Fer (7 quintaux)", v: 6160, d: "Terrasse" },
                  { l: "Sable", v: 6000, d: "Terrasse" },
                  { l: "Carrelage (110 m²)", v: 16500, d: "Terrasse" },
                  { l: "Peinture 'Grifi'", v: 8000, d: "Façade/Cour" },
                  { l: "Ferronnerie", v: 2500, d: "Porte" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600 font-medium">{item.l}</span>
                    <span className="font-bold text-slate-900">{Math.round(item.v * (state.terrainArea / 100)).toLocaleString()} DH</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
