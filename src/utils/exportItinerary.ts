import { jsPDF } from 'jspdf';
import { HighlightItem } from '../types';

interface ExportItineraryOptions {
  title: string;
  days: {
    id: string;
    dayNumber: number;
    title: string;
    description: string;
    overnightLocation: string;
    mealsIncluded: string;
  }[];
  highlights?: HighlightItem[];
  inclusions: string;
  exclusions: string;
  companySettings: any;
  isAcademicTour?: boolean;
  academicSchoolName?: string;
  academicTargetGroup?: string;
  academicDurationText?: string;
  academicTotalCost?: string;
  academicFinancialBreakdown?: string;
}

function drawPdfHighlightIcon(doc: jsPDF, iconName: string = 'Sparkles', cx: number, cy: number) {
  doc.setFillColor(251, 191, 36); // Amber/Gold color
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.4);

  const name = (iconName || 'Sparkles').toLowerCase();

  if (name.includes('mountain')) {
    doc.triangle(cx - 3.5, cy + 2.5, cx - 1, cy - 2.5, cx + 1.5, cy + 2.5, 'F');
    doc.triangle(cx - 0.5, cy + 2.5, cx + 1.8, cy - 1.2, cx + 3.8, cy + 2.5, 'F');
  } else if (name.includes('sun')) {
    doc.circle(cx, cy, 1.8, 'F');
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const x1 = cx + Math.cos(rad) * 2.3;
      const y1 = cy + Math.sin(rad) * 2.3;
      const x2 = cx + Math.cos(rad) * 3.3;
      const y2 = cy + Math.sin(rad) * 3.3;
      doc.line(x1, y1, x2, y2);
    }
  } else if (name.includes('compass') || name.includes('map')) {
    doc.circle(cx, cy, 3, 'D');
    doc.triangle(cx, cy - 2.2, cx - 1, cy + 0.5, cx + 1, cy + 0.5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.triangle(cx, cy + 2.2, cx - 1, cy - 0.5, cx + 1, cy - 0.5, 'F');
  } else if (name.includes('camera')) {
    doc.roundedRect(cx - 3, cy - 1.8, 6, 4, 0.5, 0.5, 'F');
    doc.setFillColor(1, 40, 113);
    doc.circle(cx, cy, 1.2, 'F');
  } else if (name.includes('award') || name.includes('star')) {
    doc.circle(cx, cy, 2.5, 'F');
  } else if (name.includes('flame')) {
    doc.ellipse(cx, cy + 0.5, 1.8, 2.5, 'F');
  } else {
    // 4-point Sparkle diamond
    doc.triangle(cx, cy - 3, cx - 1.2, cy, cx + 1.2, cy, 'F');
    doc.triangle(cx, cy + 3, cx - 1.2, cy, cx + 1.2, cy, 'F');
    doc.triangle(cx - 3, cy, cx, cy - 1.2, cx, cy + 1.2, 'F');
    doc.triangle(cx + 3, cy, cx, cy - 1.2, cx, cy + 1.2, 'F');
  }
}

export async function exportItineraryToPdf({
  title,
  days,
  highlights = [],
  inclusions,
  exclusions,
  companySettings,
  isAcademicTour = false,
  academicSchoolName = '',
  academicTargetGroup = '',
  academicDurationText = '',
  academicTotalCost = '',
  academicFinancialBreakdown = '',
}: ExportItineraryOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const brandNavy = [1, 40, 113] as [number, number, number];
  const brandOrange = [243, 85, 0] as [number, number, number];
  const textDark = [15, 23, 42] as [number, number, number];
  const textMuted = [100, 116, 139] as [number, number, number];

  const brandInitials = (companySettings.companyName || 'Paila Nepal')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('') || 'PN';

  let pageCount = 1;

  // Helper to draw standard header/footer
  const drawPageTemplate = (pageNum: number) => {
    // Top brand line
    doc.setFillColor(...brandNavy);
    doc.rect(0, 0, 210, 4, 'F');
    doc.setFillColor(...brandOrange);
    doc.rect(0, 4, 210, 1, 'F');

    // Bottom brand line
    doc.setFillColor(...brandNavy);
    doc.rect(0, 292, 210, 5, 'F');
    doc.setFillColor(...brandOrange);
    doc.rect(0, 291, 210, 1, 'F'); // border-top equivalent

    // Footer contact info
    doc.setTextColor(...textMuted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${companySettings.companyName}  |  ${companySettings.address}  |  ${companySettings.domain}`, 15, 285);
    doc.text(`Page ${pageNum}`, 195, 285, { align: 'right' });
  };

  // --- FIRST PAGE HEADER ---
  drawPageTemplate(pageCount);

  let y = 15;

  // Official Logo Box (Top Left)
  if (companySettings.logoUrl) {
    try {
      // Gracefully handle PNG, JPEG, SVG format
      const format = companySettings.logoUrl.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(companySettings.logoUrl, format, 15, y, 14, 14);
    } catch (e) {
      console.warn('PDF logo rendering failed, using fallback initials:', e);
      doc.setFillColor(...brandOrange);
      doc.roundedRect(15, y, 14, 14, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(brandInitials, 22, y + 8.5, { align: 'center' });
    }
  } else {
    doc.setFillColor(...brandOrange);
    doc.roundedRect(15, y, 14, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(brandInitials, 22, y + 8.5, { align: 'center' });
  }

  // Company details next to Logo
  doc.setTextColor(...brandNavy);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companySettings.companyName.toUpperCase(), 33, y + 6);
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text((companySettings.tagline || 'Tours & Travels').toUpperCase(), 33, y + 11);

  // Top Right Proposal ref
  doc.setTextColor(...brandNavy);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(isAcademicTour ? 'ACADEMIC PROPOSAL' : 'ITINERARY PROPOSAL', 195, y + 5, { align: 'right' });

  doc.setTextColor(...textMuted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const refCode = `PN-ITIN-${Math.floor(100000 + Math.random() * 900000)}`;
  doc.text(`Ref: ${refCode}`, 195, y + 10, { align: 'right' });
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 195, y + 14, { align: 'right' });

  y += 22;

  // Header bottom border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  y += 8;

  // Itinerary Title Box - Incorporates Title, Academic Target Group, Duration, and Cost per Head
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 20, 'F');
  doc.setDrawColor(...brandNavy);
  doc.setLineWidth(0.8);
  doc.line(15, y, 15, y + 20); // Left accent border

  if (isAcademicTour && academicSchoolName) {
    doc.setTextColor(...textDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'Untitled Tour Package', 19, y + 6);

    doc.setTextColor(...brandNavy);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`PREPARED FOR: ${academicSchoolName.toUpperCase()}`, 19, y + 11);

    doc.setTextColor(...textMuted);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    
    const parts = [
      `DURATION: ${(academicDurationText || `${days.length} Days`).toUpperCase()}`,
      academicTargetGroup ? `TARGET: ${academicTargetGroup.toUpperCase()}` : '',
      academicTotalCost ? `COST: ${academicTotalCost.toUpperCase()}` : ''
    ].filter(Boolean);
    const subtitleText = parts.join('   |   ');
    doc.text(subtitleText, 19, y + 16);
  } else {
    doc.setTextColor(...textDark);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'Untitled Tour Package', 19, y + 7);

    doc.setTextColor(...textMuted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    
    let subtitleText = `DURATION: ${days.length} DAYS PROGRAM`;
    if (isAcademicTour) {
      const parts = [
        `DURATION: ${(academicDurationText || `${days.length} Days`).toUpperCase()}`,
        academicTargetGroup ? `TARGET: ${academicTargetGroup.toUpperCase()}` : '',
        academicTotalCost ? `COST: ${academicTotalCost.toUpperCase()}` : ''
      ].filter(Boolean);
      subtitleText = parts.join('   |   ');
    }
    doc.text(subtitleText, 19, y + 14);
  }

  y += 24;

  // --- PROGRAM HIGHLIGHTS (RESPONSIVE 2x2 GRID STRUCTURE) ---
  if (highlights && highlights.length > 0) {
    const totalRows = Math.ceil(highlights.length / 2);
    const cardHeight = 16;
    const gapY = 3.5;
    const gridHeight = totalRows * cardHeight + (totalRows - 1) * gapY;

    if (y + gridHeight + 12 > 265) {
      doc.addPage();
      pageCount++;
      drawPageTemplate(pageCount);
      y = 20;
    }

    doc.setTextColor(...brandNavy);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('KEY PROGRAM HIGHLIGHTS', 15, y);

    y += 3.5;
    doc.setDrawColor(...brandOrange);
    doc.setLineWidth(0.6);
    doc.line(15, y, 48, y);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(48, y, 195, y);

    y += 6;

    const startY = y;
    const colWidth = 86;

    for (let idx = 0; idx < highlights.length; idx++) {
      const item = highlights[idx];
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      const cardX = col === 0 ? 15 : 109;
      const cardY = startY + row * (cardHeight + gapY);

      // Distinct Card Background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, colWidth, cardHeight, 1.8, 1.8, 'FD');

      // Left Accent Strip
      doc.setFillColor(...brandOrange);
      doc.rect(cardX, cardY, 1, cardHeight, 'F');

      // Left Icon Badge Container
      doc.setFillColor(...brandNavy);
      doc.roundedRect(cardX + 3, cardY + 2.5, 11, 11, 1.2, 1.2, 'F');

      // Icon Graphic inside Badge
      drawPdfHighlightIcon(doc, item.icon, cardX + 8.5, cardY + 8);

      // Highlight Title & Detail
      const textX = cardX + 17;
      doc.setTextColor(...brandNavy);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');

      const titleLines = doc.splitTextToSize(item.title, colWidth - 19);
      doc.text(titleLines[0], textX, cardY + (item.description ? 5.8 : 8.5));

      if (item.description) {
        doc.setTextColor(...textMuted);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(item.description, colWidth - 19);
        doc.text(descLines[0], textX, cardY + 10.5);
      }
    }

    y = startY + gridHeight + 10;
  }

  // --- DAY BY DAY TIMELINE ---
  doc.setTextColor(...brandNavy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DAY-BY-DAY ITINERARY', 15, y);

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  y += 8;

  // Timeline track start coordinate
  let timelineStartX = 20;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];

    // Check height remaining. If less than 45mm, add a page
    if (y > 240) {
      doc.addPage();
      pageCount++;
      drawPageTemplate(pageCount);
      y = 20;
    }

    // Draw connecting timeline line (to next node if not last)
    if (i < days.length - 1) {
      doc.setDrawColor(...brandNavy);
      doc.setLineWidth(0.6);
      doc.line(timelineStartX, y, timelineStartX, y + 38); // draw line down
    }

    // Draw Node circle (Orange)
    doc.setFillColor(...brandOrange);
    doc.circle(timelineStartX, y + 2, 4, 'F');

    // Node number text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`D${day.dayNumber}`, timelineStartX, y + 2.5, { align: 'center' });

    // Card boundary (background)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(218, 224, 233);
    doc.setLineWidth(0.2);
    
    const splitDesc = doc.splitTextToSize(day.description, 115);
    const cardHeight = Math.max(28, 12 + splitDesc.length * 4);
    
    doc.roundedRect(timelineStartX + 8, y - 3, 157, cardHeight, 1.5, 1.5, 'FD');

    // Card Left Color Accent Strip (Navy Blue)
    doc.setFillColor(...brandNavy);
    doc.rect(timelineStartX + 8, y - 3, 1.5, cardHeight, 'F');

    // Day Title
    doc.setTextColor(...brandNavy);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(day.title, timelineStartX + 13, y + 3);

    // Dynamic, emoji-free overnight stay & meals badges
    let badgeRightEdge = timelineStartX + 161;

    if (day.overnightLocation) {
      const stayText = `STAY: ${day.overnightLocation.toUpperCase()}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      const textWidth = doc.getTextWidth(stayText);
      const badgeWidth = textWidth + 5;
      const stayBadgeX = badgeRightEdge - badgeWidth;

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(stayBadgeX, y - 1.5, badgeWidth, 4.5, 1, 1, 'F');

      doc.setTextColor(...brandNavy);
      doc.text(stayText, stayBadgeX + 2.5, y + 1.6);
    }

    if (day.mealsIncluded) {
      const mealsText = `MEALS: ${day.mealsIncluded.toUpperCase()}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      const textWidth = doc.getTextWidth(mealsText);
      const badgeWidth = textWidth + 5;
      const mealsBadgeX = badgeRightEdge - badgeWidth;

      doc.setFillColor(254, 243, 199);
      doc.roundedRect(mealsBadgeX, y + 4.2, badgeWidth, 4.5, 1, 1, 'F');

      doc.setTextColor(180, 83, 9);
      doc.text(mealsText, mealsBadgeX + 2.5, y + 7.3);
    }

    // Description text
    doc.setTextColor(...textDark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(splitDesc, timelineStartX + 13, y + 11);

    y += cardHeight + 4;
  }

  // --- DYNAMIC-HEIGHT INCLUSIONS & EXCLUSIONS ---
  if (inclusions || exclusions) {
    const colWidth = 86;

    // Calculate lists and sizes first to make container fit contents precisely
    const inclLinesList: string[] = [];
    if (inclusions) {
      inclusions.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const split = doc.splitTextToSize(line, colWidth - 10);
        split.forEach((sLine: string) => inclLinesList.push(sLine));
      });
    }

    const exclLinesList: string[] = [];
    if (exclusions) {
      exclusions.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const split = doc.splitTextToSize(line, colWidth - 10);
        split.forEach((sLine: string) => exclLinesList.push(sLine));
      });
    }

    const maxLinesCount = Math.max(inclLinesList.length, exclLinesList.length, 1);
    const blockHeight = 14 + (maxLinesCount * 6.2) + 4; // Title (14) + line count padding + margin buffer

    // Check height remaining. If less than total block size, add page
    if (y + blockHeight > 265) {
      doc.addPage();
      pageCount++;
      drawPageTemplate(pageCount);
      y = 20;
    } else {
      y += 8;
    }

    doc.setTextColor(...brandNavy);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & SERVICES', 15, y);

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);

    y += 8;

    // Inclusions Block
    if (inclusions) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, colWidth, blockHeight, 2, 2, 'FD');

      doc.setFillColor(74, 222, 128); // Green top strip
      doc.rect(15, y, colWidth, 1.5, 'F');

      doc.setTextColor(21, 128, 61);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('INCLUSIONS & PROGRAM SERVICES', 19, y + 6);

      doc.setTextColor(...textDark);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      
      let lineY = y + 12;
      inclusions.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const split = doc.splitTextToSize(line, colWidth - 12);
        split.forEach((sLine: string, index: number) => {
          if (index === 0) {
            // Draw custom vector bullet circle
            doc.setFillColor(21, 128, 61);
            doc.circle(20, lineY - 1, 0.8, 'F');
          }
          doc.text(sLine, 23, lineY);
          lineY += 6.2;
        });
      });
    }

    // Exclusions Block
    if (exclusions) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.setLineWidth(0.3);
      doc.roundedRect(109, y, colWidth, blockHeight, 2, 2, 'FD');

      doc.setFillColor(248, 113, 113); // Red top strip
      doc.rect(109, y, colWidth, 1.5, 'F');

      doc.setTextColor(185, 28, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('EXCLUSIONS & OPTIONAL COSTS', 113, y + 6);

      doc.setTextColor(...textDark);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      let lineY = y + 12;
      exclusions.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const split = doc.splitTextToSize(line, colWidth - 12);
        split.forEach((sLine: string, index: number) => {
          if (index === 0) {
            // Draw custom vector bullet circle
            doc.setFillColor(185, 28, 28);
            doc.circle(114, lineY - 1, 0.8, 'F');
          }
          doc.text(sLine, 117, lineY);
          lineY += 6.2;
        });
      });
    }
  }

  // Save the generated PDF
  const safeTitle = (title || 'Tour-Itinerary').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`${safeTitle}-itinerary.pdf`);
}
