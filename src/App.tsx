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
    deductionStairsPercentage: DEFAULT_INVESTMENT.STAIRS_DEDUCTION,
    deductionWallsPercentage: DEFAULT_INVESTMENT.WALLS_DEDUCTION,
    stateTaxPercentage: DEFAULT_INVESTMENT.STATE_TAX,
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
      
      const sellableSurface = level.type === LevelType.FOUNDATION ? 0 : surface * (1 - (state.deductionStairsPercentage + state.deductionWallsPercentage) / 100);

      return { ...level, surface, sellableSurface };
    });
  }, [state.terrainArea, state.facades, state.levels, state.deductionStairsPercentage, state.deductionWallsPercentage]);

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
  }, [calculatedLevels, state.terrainArea, state.cos, state.landPricePerM2, state.notaryFees, state.miscFeesPercentage, state.miscFeesFixed, state.salePricePerM2, state.stateTaxPercentage]);

  const chartData = [
    { name: 'Terrain', value: totals.landCost, color: '#0ea5e3' },
    { name: 'Construction', value: totals.constructionCost, color: '#be123c' },
    { name: 'Frais & Taxes', value: state.notaryFees + state.miscFeesFixed + (totals.constructionCost * (state.miscFeesPercentage / 100)), color: '#64748b' },
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0f172a]">
      {/* Sidebar - Mobile Header / Desktop Sidebar */}
      <aside className="w-full lg:w-96 bg-slate-900/80 border-r border-white/5 flex flex-col overflow-y-auto lg:h-screen safe-pt">
        <div className="p-8 border-b border-white/5 flex items-center justify-between lg:block">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-700 to-rose-950 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-rose-900/40 border border-rose-500/20 overflow-hidden">
              <img 
                src="https://picsum.photos/seed/modern-building/200/200" 
                alt="Skyara Logo" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter text-white">Sky <span className="text-sky-400">ara</span> Icl</h1>
              <p className="text-[10px] text-rose-500 uppercase font-black tracking-[0.3em]">Futuristic Real Estate</p>
            </div>
          </div>
          <button className="lg:hidden p-2 text-slate-400">
            <Settings2 size={24} />
          </button>
        </div>

        <div className="p-8 space-y-10">
          <section>
            <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <div className="w-1 h-3 bg-rose-600 rounded-full" /> Paramètres Terrain
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Surface Terrain (m²)</label>
                <input 
                  type="number" 
                  value={state.terrainArea} 
                  onChange={(e) => setState(prev => ({ ...prev, terrainArea: Number(e.target.value) }))}
                  className="input-field neon-border-sky"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Prix Achat (DH/m²)</label>
                <input 
                  type="number" 
                  value={state.landPricePerM2} 
                  onChange={(e) => setState(prev => ({ ...prev, landPricePerM2: Number(e.target.value) }))}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">COS</label>
                  <input 
                    type="number" step="0.1"
                    value={state.cos} 
                    onChange={(e) => setState(prev => ({ ...prev, cos: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Façades</label>
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
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <div className="w-1 h-3 bg-sky-400 rounded-full" /> Charges & Fiscalité
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Notaire (DH)</label>
                  <input 
                    type="number" 
                    value={state.notaryFees} 
                    onChange={(e) => setState(prev => ({ ...prev, notaryFees: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Divers (DH)</label>
                  <input 
                    type="number" 
                    value={state.miscFeesFixed} 
                    onChange={(e) => setState(prev => ({ ...prev, miscFeesFixed: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Divers (%)</label>
                  <input 
                    type="number" 
                    value={state.miscFeesPercentage} 
                    onChange={(e) => setState(prev => ({ ...prev, miscFeesPercentage: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Taxe État %</label>
                  <input 
                    type="number" 
                    value={state.stateTaxPercentage} 
                    onChange={(e) => setState(prev => ({ ...prev, stateTaxPercentage: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Prix de Vente (DH/m²)</label>
                <input 
                  type="number" 
                  value={state.salePricePerM2} 
                  onChange={(e) => setState(prev => ({ ...prev, salePricePerM2: Number(e.target.value) }))}
                  className="input-field neon-border-bordeaux"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Structure</h3>
            <div className="flex items-center gap-3">
              <button onClick={removeLevel} className="btn-secondary flex-1">
                <Minus size={18} />
              </button>
              <button onClick={addLevel} className="btn-primary flex-1">
                <Plus size={18} />
              </button>
            </div>
          </section>

          <button 
            onClick={handleQuickSimulation}
            className="w-full py-5 bg-gradient-to-r from-rose-700 to-rose-900 text-white rounded-xl font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-rose-900/40 transition-all active:scale-95 flex items-center justify-center gap-3 border border-rose-500/30"
          >
            <TrendingUp size={20} /> Simulation R+2
          </button>
        </div>
        <div className="mt-auto p-8 safe-pb">
          <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
              Calculs basés sur les standards marocains : déductions cour ({state.facades === 1 ? '16m²' : '9m²'}) et balcons ({SURFACE_RULES.ENCORBELLEMENT}m²).
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto bg-[#0f172a] safe-pb">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 lg:mt-0 mt-6">
          <div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">Sky <span className="text-sky-400">ara</span> Icl <span className="text-rose-600">Core</span></h2>
            <p className="text-slate-500 font-medium mt-2">Intelligence Artificielle de Rentabilité Immobilière</p>
          </div>
          <button 
            onClick={() => generatePDF(state, totals)}
            className="btn-primary w-full md:w-auto px-8"
          >
            <Download size={20} /> Rapport Futuriste PDF
          </button>
        </header>

        {/* Status Cards - Futuristic Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          <motion.div whileHover={{ scale: 1.02 }} className="card-futuristic">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <DollarSign size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investissement</p>
            </div>
            <h3 className="text-3xl font-black text-white">{(totals.totalInvestment / 10000).toFixed(1)} <span className="text-sm font-bold text-slate-500">M Cts</span></h3>
            <p className="text-[10px] font-bold text-sky-400 mt-3 tracking-wider">{totals.totalInvestment.toLocaleString()} DH</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="card-futuristic">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chiffre d'Affaires</p>
            </div>
            <h3 className="text-3xl font-black text-white">{(totals.totalRevenue / 10000).toFixed(1)} <span className="text-sm font-bold text-slate-500">M Cts</span></h3>
            <p className="text-[10px] font-bold text-slate-400 mt-3 tracking-wider">{totals.totalRevenue.toLocaleString()} DH</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }} 
            className={cn("card-futuristic border-rose-500/20", totals.netProfit >= 0 ? "bg-rose-900/40" : "bg-rose-950/60")}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                <Briefcase size={20} />
              </div>
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Bénéfice Net</p>
            </div>
            <h3 className="text-3xl font-black text-white">{(totals.netProfit / 10000).toFixed(1)} <span className="text-sm font-bold text-rose-300/60">M Cts</span></h3>
            <p className="text-[10px] font-bold text-rose-400 mt-3 tracking-wider">Taxe: {totals.stateTax.toLocaleString()} DH</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="card-futuristic">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Percent size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ROI Net</p>
            </div>
            <h3 className="text-3xl font-black text-white">{((totals.netProfit / totals.totalInvestment) * 100).toFixed(1)} <span className="text-sm font-bold text-slate-500">%</span></h3>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-400 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                style={{ width: `${Math.max(0, Math.min(100, (totals.netProfit / totals.totalInvestment) * 100))}%` }}
              />
            </div>
          </motion.div>
        </div>

        {/* Detailed Analysis Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-12">
          <section className="card-futuristic p-0 overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
              <h4 className="font-black text-white flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
                <Calculator size={20} className="text-sky-400" /> Analyse Structurelle
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">
                    <th className="px-8 py-6">Niveau</th>
                    <th className="px-8 py-6">Surface</th>
                    <th className="px-8 py-6">Vendable</th>
                    <th className="px-8 py-6 text-right">Revenu</th>
                  </tr>
                </thead>
                <tbody className="divide-white/5 divide-y">
                  {calculatedLevels.map((level) => {
                    const isFoundation = level.type === LevelType.FOUNDATION;
                    const revenue = (level as any).sellableSurface * state.salePricePerM2;
                    return (
                      <tr key={level.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-7">
                          <span className="font-bold text-white">{level.name}</span>
                        </td>
                        <td className="px-8 py-7">
                          <span className="text-sm font-mono font-bold text-slate-400">{level.surface.toFixed(1)} m²</span>
                        </td>
                        <td className="px-8 py-7">
                          <span className="text-sm font-black text-sky-400">
                            {isFoundation ? "-" : `${(level as any).sellableSurface.toFixed(1)} m²`}
                          </span>
                        </td>
                        <td className="px-8 py-7 text-right">
                          <span className="font-black text-white">
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
            <section className="card-futuristic p-10">
              <h4 className="font-black text-white mb-10 flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
                <PieChart size={20} className="text-rose-600" /> Répartition Capital
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
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => `${value.toLocaleString()} DH`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>

        {/* Profitability & Materials */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 mb-12">
          <section className="xl:col-span-2 card-futuristic p-12">
            <h4 className="font-black text-white mb-12 flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
              <ArrowRightLeft size={20} className="text-sky-400" /> Performance Économique
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
              <div className="p-8 bg-slate-800/40 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Coût Construction Moyen</p>
                <p className="text-4xl font-black text-white">
                  {(totals.constructionCost / totals.totalSurface).toFixed(0)} <span className="text-sm font-bold text-slate-500">DH/m²</span>
                </p>
              </div>
              <div className="p-8 bg-rose-900/20 rounded-3xl border border-rose-500/20">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Prix de Vente Net</p>
                <p className="text-4xl font-black text-white">
                  {state.salePricePerM2.toLocaleString()} <span className="text-sm font-bold text-rose-400/60">DH/m²</span>
                </p>
              </div>
            </div>
            
            <div className="p-10 bg-slate-950 rounded-[2.5rem] border border-white/5">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Marge Nette</p>
                  <p className="text-5xl font-black text-sky-400">{totals.marginPercentage.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Profit / m² Vendable</p>
                  <p className="text-3xl font-black text-white">
                    {(totals.netProfit / totals.totalSellableSurface).toFixed(0)} <span className="text-sm font-bold text-slate-500">DH</span>
                  </p>
                </div>
              </div>
              <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, totals.marginPercentage))}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-rose-600 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.4)]"
                />
              </div>
            </div>
          </section>

          <section className="card-futuristic p-12">
            <h4 className="font-black text-white mb-10 flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
              <Layers size={20} className="text-rose-600" /> Matériaux Estimés
            </h4>
            <div className="space-y-6">
              {[
                { label: 'Acier (Fer)', value: `${(totals.estSteel / 1000).toFixed(2)} T`, icon: 'Fe', color: 'text-sky-400 bg-sky-500/10' },
                { label: 'Ciment', value: `${Math.round(totals.estCement)} Sacs`, icon: 'Ci', color: 'text-rose-400 bg-rose-500/10' },
                { label: 'Briques', value: `${Math.round(totals.estBricks).toLocaleString()} U`, icon: 'Br', color: 'text-slate-400 bg-slate-500/10' },
                { label: 'Béton', value: `${Math.round(totals.estConcrete)} m³`, icon: 'Be', color: 'text-sky-400 bg-sky-500/10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-2xl border border-white/5 hover:border-sky-500/20 transition-all bg-slate-800/20">
                  <div className="flex items-center gap-5">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs", item.color)}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="font-black text-white text-lg">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Unit Prices - Futuristic Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
          <section className="lg:col-span-2 card-futuristic p-10">
            <h4 className="font-black text-white mb-10 flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
              <TrendingUp size={20} className="text-sky-400" /> Visualisation des Flux Financiers
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Investissement', value: totals.totalInvestment, fill: '#be123c' },
                  { name: 'Chiffre d\'Affaires', value: totals.totalRevenue, fill: '#0ea5e3' },
                  { name: 'Bénéfice Net', value: totals.netProfit, fill: '#10b981' }
                ]}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    formatter={(value: number) => `${value.toLocaleString()} DH`}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card-futuristic p-10">
            <h4 className="font-black text-white mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
              <Settings2 size={20} className="text-sky-400" /> Coûts Directs
            </h4>
            <div className="space-y-8">
              {[
                { label: 'Gros Œuvre', value: state.unitPrices.grosOeuvre, key: 'grosOeuvre', min: 800, max: 1500, color: 'accent-rose-600' },
                { label: 'Finition', value: state.unitPrices.finition, key: 'finition', min: 800, max: 2000, color: 'accent-sky-400' },
              ].map((slider) => (
                <div key={slider.key}>
                  <div className="flex justify-between mb-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{slider.label}</label>
                    <span className="text-sm font-black text-white">{slider.value} DH</span>
                  </div>
                  <input 
                    type="range" min={slider.min} max={slider.max} step="10"
                    value={slider.value}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      unitPrices: { ...prev.unitPrices, [slider.key]: Number(e.target.value) } 
                    }))}
                    className={cn("w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer", slider.color)}
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
