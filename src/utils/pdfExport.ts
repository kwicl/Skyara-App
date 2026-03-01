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

  // Detailed Breakdown Section
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(128, 0, 32); // Burgundy
  doc.text('Détails Complets de Construction', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Basé sur un terrain de ${state.terrainArea} m²`, 14, 28);

  let currentY = 40;
  const ratio = state.terrainArea / 100;

  // 1. Fondations
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('1. Fondations (الأساسات)', 14, currentY);
  currentY += 10;
  
  autoTable(doc, {
    startY: currentY,
    head: [['Poste', 'Montant Estimé', 'Détail']],
    body: [
      ["Main d'œuvre", `${Math.round(12000 * ratio).toLocaleString()} DH`, "120 DH/m²"],
      ["Pierres", `${Math.round(3000 * ratio).toLocaleString()} DH`, "30 m³ + 6 m³"],
      ["Gravier", `${Math.round(3500 * ratio).toLocaleString()} DH`, "25 m³"],
      ["Sable", `${Math.round(6000 * ratio).toLocaleString()} DH`, "22 m³"],
      ["Ciment 45", `${Math.round(12300 * ratio).toLocaleString()} DH`, "150 sacs"],
      ["Fer", `${Math.round(10560 * ratio).toLocaleString()} DH`, "6, 10, 12 mm"],
      ["Total Fondations", `${Math.round(50060 * ratio).toLocaleString()} DH`, "Estimation Globale"]
    ],
    theme: 'grid',
    headStyles: { fillColor: [128, 0, 32] }
  });
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // 2. RDC
  doc.setFontSize(14);
  doc.text('2. Rez-de-chaussée (الطابق السفلي)', 14, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Catégorie', 'Gros Œuvre', 'Finition', 'Total']],
    body: [
      ["Montants", `${Math.round(92460 * ratio).toLocaleString()} DH`, `${Math.round(96400 * ratio).toLocaleString()} DH`, `${Math.round(188860 * ratio).toLocaleString()} DH`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [128, 0, 32] }
  });
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // 3. Étages
  const floors = state.levels.filter(l => l.type === 'FLOOR' && !l.name.includes('Terrasse'));
  floors.forEach((floor, idx) => {
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14);
    doc.text(`${3 + idx}. ${floor.name}`, 14, currentY);
    currentY += 10;
    
    autoTable(doc, {
      startY: currentY,
      head: [['Poste', 'Montant / Étage']],
      body: [
        ["Gros Œuvre", `${Math.round(96600 * ratio).toLocaleString()} DH`],
        ["Finition", `${Math.round(99200 * ratio).toLocaleString()} DH`],
        ["Total Étage", `${Math.round(195800 * ratio).toLocaleString()} DH`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [128, 0, 32] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  });

  // 4. Terrasse
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  doc.setFontSize(14);
  doc.text('Terrasse (السطح)', 14, currentY);
  currentY += 10;
  
  autoTable(doc, {
    startY: currentY,
    head: [['Poste', 'Montant Estimé']],
    body: [
      ["Gros Œuvre", `${Math.round(31380 * ratio).toLocaleString()} DH`],
      ["Finition", `${Math.round(27000 * ratio).toLocaleString()} DH`],
      ["Total Terrasse", `${Math.round(58380 * ratio).toLocaleString()} DH`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [128, 0, 32] }
  });

  doc.save(`Rapport_Rentabilite_Skyara_${state.terrainArea}m2.pdf`);
};
