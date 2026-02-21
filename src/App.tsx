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
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Level, LevelType, ProjectState } from './types';
import { DEFAULT_PRICES, SURFACE_RULES, DEFAULT_INVESTMENT } from './constants';
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
    connectionFees: DEFAULT_INVESTMENT.CONNECTION_FEES,
  });

  // Recalculate surfaces based on rules
  const calculatedLevels = useMemo(() => {
    const deduction = state.facades === 1 ? SURFACE_RULES.DEDUCTION_1_FACADE : SURFACE_RULES.DEDUCTION_2_FACADES;
    
    return state.levels.map(level => {
      let surface = state.terrainArea;
      if (level.type === LevelType.RDC) {
        surface = state.terrainArea - deduction;
      } else if (level.type === LevelType.FLOOR) {
        surface = (state.terrainArea - deduction) + SURFACE_RULES.ENCORBELLEMENT;
      } else if (level.type === LevelType.SOUS_SOL) {
        surface = state.terrainArea;
      }
      
      const sellableSurface = level.type === LevelType.FOUNDATION ? 0 : Math.max(0, surface - state.deductionStairsM2 - state.deductionWallsM2);

      return { ...level, surface, sellableSurface };
    });
  }, [state.terrainArea, state.facades, state.levels, state.deductionStairsM2, state.deductionWallsM2]);

  const totals = useMemo(() => {
    let grosOeuvre = 0;
    let finition = 0;
    let totalSurface = 0;
    let totalSellableSurface = 0;

    calculatedLevels.forEach(level => {
      if (level.type === LevelType.FOUNDATION) {
        grosOeuvre += state.terrainArea * 500;
      } else {
        grosOeuvre += level.surface * level.grosOeuvrePrice;
        finition += level.surface * level.finitionPrice;
        totalSurface += level.surface;
        totalSellableSurface += (level as any).sellableSurface;
      }
    });

    const constructionCost = grosOeuvre + finition;
    const landCost = state.terrainArea * state.landPricePerM2;
    const miscFeesPercentValue = constructionCost * (state.miscFeesPercentage / 100);
    const totalInvestment = landCost + state.notaryFees + constructionCost + miscFeesPercentValue + state.miscFeesFixed + state.connectionFees;
    
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
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100 overflow-hidden">
              <Building2 size={32} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900">Skyara <span className="text-teal-600">icl</span></h1>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Taxe État %</label>
                  <input 
                    type="number" 
                    value={state.stateTaxPercentage} 
                    onChange={(e) => setState(prev => ({ ...prev, stateTaxPercentage: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Raccord. (DH)</label>
                  <input 
                    type="number" 
                    value={state.connectionFees} 
                    onChange={(e) => setState(prev => ({ ...prev, connectionFees: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
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

          <button 
            onClick={handleQuickSimulation}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
          >
            <TrendingUp size={20} /> Simulation 120m²
          </button>
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
            <h3 className="text-3xl font-bold text-slate-900">{(totals.totalInvestment / 10000).toFixed(1)} <span className="text-sm font-medium text-slate-400">M Cts</span></h3>
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
            <h3 className="text-3xl font-bold text-slate-900">{(totals.totalRevenue / 10000).toFixed(1)} <span className="text-sm font-medium text-slate-400">M Cts</span></h3>
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
            <h3 className="text-3xl font-bold text-slate-900">{(totals.netProfit / 10000).toFixed(1)} <span className="text-sm font-medium text-slate-400">M Cts</span></h3>
            <p className="text-[11px] font-bold text-teal-600 mt-3">Taxe: {totals.stateTax.toLocaleString()} DH</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="card-stat">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Percent size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROI Net</p>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{((totals.netProfit / totals.totalInvestment) * 100).toFixed(1)} <span className="text-sm font-medium text-slate-400">%</span></h3>
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
                <PieChart size={20} className="text-teal-600" /> Répartition Capital
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
          <h4 className="font-display font-bold text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-xs">
            <Layers size={20} className="text-teal-600" /> Détails Techniques de Construction (Dynamique - {state.terrainArea}m²)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-2">1. Fondations</h5>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between"><span>Main d'œuvre</span> <span className="font-bold">{Math.round(state.terrainArea * 115).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Pierres / Blocage</span> <span className="font-bold">{Math.round(state.terrainArea * 27.5).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Sable / Gravier</span> <span className="font-bold">{Math.round(state.terrainArea * 79.17).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Ciment ({Math.round(state.terrainArea * 1.16)} sacs)</span> <span className="font-bold">{Math.round(state.terrainArea * 95.67).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Acier ({Math.round(state.terrainArea * 0.108)} qtx)</span> <span className="font-bold">{Math.round(state.terrainArea * 95.33).toLocaleString()} DH</span></li>
                <li className="flex justify-between border-t pt-2 text-teal-600 font-bold uppercase"><span>Total Fondations</span> <span>~{Math.round(state.terrainArea * 433.5).toLocaleString()} DH</span></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-2">2. Gros Œuvre / Étage</h5>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between"><span>Main d'œuvre</span> <span className="font-bold">{Math.round(state.terrainArea * 230).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Briques ({Math.round(state.terrainArea * 41.6)} u)</span> <span className="font-bold">{Math.round(state.terrainArea * 120.5).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Sable / Gravier</span> <span className="font-bold">{Math.round(state.terrainArea * 79.17).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Ciment ({Math.round(state.terrainArea * 2)} sacs)</span> <span className="font-bold">{Math.round(state.terrainArea * 160.67).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Plancher / Hourdis</span> <span className="font-bold">{Math.round(state.terrainArea * 100).toLocaleString()} DH</span></li>
                <li className="flex justify-between border-t pt-2 text-teal-600 font-bold uppercase"><span>Total par Étage</span> <span>~{Math.round(state.terrainArea * 892.5).toLocaleString()} DH</span></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-2">3. Finition (Ex. RDC)</h5>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between"><span>Plâtre / Gypse</span> <span className="font-bold">{Math.round(state.terrainArea * 108.33).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Carrelage / Zellige</span> <span className="font-bold">{Math.round(state.terrainArea * 187.5).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Marbre (Escaliers)</span> <span className="font-bold">{Math.round(state.terrainArea * 83.33).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Menuiserie Bois</span> <span className="font-bold">{Math.round(state.terrainArea * 200).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Aluminium / Fer</span> <span className="font-bold">{Math.round(state.terrainArea * 181.67).toLocaleString()} DH</span></li>
                <li className="flex justify-between border-t pt-2 text-teal-600 font-bold uppercase"><span>Total Finition</span> <span>~{Math.round(state.terrainArea * 840).toLocaleString()} DH</span></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold text-teal-700 text-sm border-b border-teal-100 pb-2">4. Toiture & Terrasse</h5>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between"><span>Gros Œuvre Terrasse</span> <span className="font-bold">{Math.round(state.terrainArea * 227.67).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Carrelage Terrasse</span> <span className="font-bold">{Math.round(state.terrainArea * 125).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Peinture Façade</span> <span className="font-bold">{Math.round(state.terrainArea * 75).toLocaleString()} DH</span></li>
                <li className="flex justify-between"><span>Raccordements</span> <span className="font-bold">{state.connectionFees.toLocaleString()} DH</span></li>
                <li className="flex justify-between border-t pt-2 text-teal-600 font-bold uppercase"><span>Total Terrasse</span> <span>~{Math.round(state.terrainArea * 427.67 + state.connectionFees).toLocaleString()} DH</span></li>
              </ul>
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
      </main>
    </div>
  );
}
