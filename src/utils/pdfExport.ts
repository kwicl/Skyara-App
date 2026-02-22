import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectState } from '../types';

export const generatePDF = (state: ProjectState, totals: any) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('fr-FR');

  // Header
  doc.setFontSize(22);
  doc.setTextColor(13, 148, 136); // Teal 600
  doc.text('Skyara icl - Expertise Immobilière', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date: ${date}`, 14, 30);
  doc.text(`Terrain: ${state.terrainArea} m² | Façades: ${state.facades} | COS: ${state.cos}`, 14, 35);
  doc.text(`Prix Terrain: ${state.landPricePerM2} DH/m² | Prix Vente: ${state.salePricePerM2} DH/m²`, 14, 40);

  // Table Data
  const tableRows = state.levels.map(level => {
    const isFoundation = level.type === 'FOUNDATION';
    const surface = isFoundation ? state.terrainArea : level.surface;
    const grosOeuvre = isFoundation ? (state.terrainArea * 500) : (surface * level.grosOeuvrePrice);
    const finition = isFoundation ? 0 : (surface * level.finitionPrice);
    const sellable = (level as any).sellableSurface || 0;
    const revenue = sellable * state.salePricePerM2;

    return [
      level.name,
      `${surface.toFixed(1)} m²`,
      `${grosOeuvre.toLocaleString()} DH`,
      `${finition.toLocaleString()} DH`,
      isFoundation ? '-' : `${sellable.toFixed(1)} m²`,
      isFoundation ? '-' : `${revenue.toLocaleString()} DH`
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['Niveau', 'Surface', 'Gros Œuvre', 'Finition', 'Vendable', 'Revenu Est.']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Summary
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Récapitulatif Financier Global', 14, finalY + 15);
  
  doc.setFontSize(11);
  doc.text(`Coût Terrain: ${totals.landCost.toLocaleString()} DH`, 14, finalY + 25);
  doc.text(`Frais Notaire: ${state.notaryFees.toLocaleString()} DH`, 14, finalY + 32);
  doc.text(`Frais Divers (Fixe): ${state.miscFeesFixed.toLocaleString()} DH`, 14, finalY + 39);
  
  doc.setFontSize(13);
  doc.setTextColor(13, 148, 136); // Teal
  doc.text(`INVESTISSEMENT TOTAL: ${totals.totalInvestment.toLocaleString()} DH`, 14, finalY + 50);
  doc.text(`CHIFFRE D'AFFAIRES: ${totals.totalRevenue.toLocaleString()} DH`, 14, finalY + 58);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Bénéfice Brut: ${totals.grossProfit.toLocaleString()} DH`, 14, finalY + 66);
  doc.text(`Taxe État (${state.stateTaxPercentage}%): ${totals.stateTax.toLocaleString()} DH`, 14, finalY + 73);

  doc.setFontSize(16);
  doc.setTextColor(13, 148, 136); // Teal
  doc.text(`BÉNÉFICE NET: ${totals.netProfit.toLocaleString()} DH`, 14, finalY + 86);
  
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Marge Nette: ${totals.marginPercentage.toFixed(1)}% | ROI Net: ${((totals.netProfit / totals.totalInvestment) * 100).toFixed(1)}%`, 14, finalY + 104);
  
  // Material Estimation in PDF
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Estimation des Matériaux Principaux', 14, finalY + 116);
  doc.setFontSize(10);
  doc.text(`Acier (Fer): ${(totals.estSteel / 1000).toFixed(2)} Tonnes`, 14, finalY + 126);
  doc.text(`Ciment: ${Math.round(totals.estCement)} Sacs`, 14, finalY + 133);
  doc.text(`Briques: ${Math.round(totals.estBricks).toLocaleString()} Unités`, 14, finalY + 140);
  doc.text(`Béton: ${Math.round(totals.estConcrete)} m3`, 14, finalY + 147);

  doc.text('Note: Ce devis est une estimation basée sur des standards moyens. Les prix réels peuvent varier.', 14, finalY + 160);

  doc.save(`Devis_Skyara_${state.terrainArea}m2.pdf`);
};
