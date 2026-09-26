import { FieldActivity } from '../contexts/FieldActivityContext';
import { formatNepalTime } from './timeFormat';

export interface ExportActivityOptions {
  activities: FieldActivity[];
  filtersApplied?: {
    bookingCode?: string;
    tourOperatorName?: string;
    activityType?: string;
    priority?: string;
    showAcknowledged?: boolean;
    searchQuery?: string;
  };
  companyName?: string;
  exportedBy?: string;
}

/**
 * Format activity type into readable human label
 */
function formatType(type: string): string {
  switch (type) {
    case 'CHECK_IN': return 'Safety Check-in';
    case 'SPOT_EXPENSE': return 'Spot Expense';
    case 'VENDOR_SWAP': return 'Vendor Swap';
    case 'STATUS_CHANGE': return 'Status Change';
    case 'EMERGENCY_ALERT': return 'Emergency Alert';
    default: return type.replace(/_/g, ' ');
  }
}

/**
 * Format activity metadata into a concise string
 */
function formatMetadata(activity: FieldActivity): string {
  const meta = activity.metadata;
  if (!meta || Object.keys(meta).length === 0) return '—';

  const parts: string[] = [];

  if (meta.paxSafe !== undefined && meta.paxTotal !== undefined) {
    parts.push(`Pax Safe: ${meta.paxSafe}/${meta.paxTotal}`);
  }
  if (meta.altitude) {
    parts.push(`Alt: ${meta.altitude}`);
  }
  if (meta.weatherCondition) {
    parts.push(`Weather: ${meta.weatherCondition}`);
  }
  if (meta.nextStop) {
    parts.push(`Next: ${meta.nextStop}`);
  }
  if (meta.amount !== undefined && Number.isFinite(Number(meta.amount))) {
    parts.push(`NPR ${Number(meta.amount).toLocaleString()} (${meta.category || 'General'})`);
  }
  if (meta.paymentMethod) {
    parts.push(`Paid via: ${meta.paymentMethod}`);
  }
  if (meta.originalVendor && meta.newVendor) {
    parts.push(`Swapped: ${meta.originalVendor} -> ${meta.newVendor}`);
  }
  if (meta.fromStatus && meta.toStatus) {
    parts.push(`Status: ${meta.fromStatus} -> ${meta.toStatus}`);
  }

  return parts.length > 0 ? parts.join(' | ') : '—';
}

/**
 * Export field activities to Excel (.xlsx) workbook
 */
export async function exportActivitiesToExcel({
  activities,
  filtersApplied,
  companyName = 'Paila Nepal Holidays Pvt. Ltd.',
  exportedBy = 'Tour Operations Dept.'
}: ExportActivityOptions): Promise<void> {
  const XLSX = await import('xlsx');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Prepare Main Activity Table Rows
  const activityData = activities.map((act, index) => {
    return {
      'S.N.': index + 1,
      'Activity ID': act.id,
      'Timestamp (NPT)': formatNepalTime(act.timestamp),
      'Activity Type': formatType(act.type),
      'Priority': act.priority || 'LOW',
      'Booking Code': act.bookingCode || '—',
      'Client / Group': act.clientName || '—',
      'Tour Operator / Leader': act.tourLeaderName || '—',
      'Title': act.title,
      'Description': act.description,
      'Metadata & Key Details': formatMetadata(act),
      'Status': act.acknowledged ? 'Acknowledged' : 'Pending Review',
    };
  });

  // 2. Prepare Summary Metrics
  const checkInsCount = activities.filter(a => a.type === 'CHECK_IN').length;
  const spotExpensesCount = activities.filter(a => a.type === 'SPOT_EXPENSE').length;
  const totalSpotNpr = activities
    .filter(a => a.type === 'SPOT_EXPENSE')
    .reduce((sum, a) => sum + (Number(a.metadata?.amount) || 0), 0);
  const vendorSwapsCount = activities.filter(a => a.type === 'VENDOR_SWAP').length;
  const pendingCount = activities.filter(a => !a.acknowledged).length;

  const summaryData = [
    { 'Metric': 'Company Name', 'Value': companyName },
    { 'Metric': 'Report Generated At', 'Value': `${dateStr} ${timeStr}` },
    { 'Metric': 'Exported By', 'Value': exportedBy },
    { 'Metric': 'Total Exported Activities', 'Value': activities.length },
    { 'Metric': 'Safety Check-ins', 'Value': checkInsCount },
    { 'Metric': 'Spot Expense Reports', 'Value': spotExpensesCount },
    { 'Metric': 'Total Spot Expenses (NPR)', 'Value': `NPR ${totalSpotNpr.toLocaleString()}` },
    { 'Metric': 'Vendor Swaps Logged', 'Value': vendorSwapsCount },
    { 'Metric': 'Pending Acknowledgments', 'Value': pendingCount },
    { 'Metric': 'Filter - Booking', 'Value': filtersApplied?.bookingCode || 'All Bookings' },
    { 'Metric': 'Filter - Tour Operator', 'Value': filtersApplied?.tourOperatorName || 'All Tour Operators' },
    { 'Metric': 'Filter - Activity Type', 'Value': filtersApplied?.activityType || 'All Types' },
    { 'Metric': 'Filter - Priority', 'Value': filtersApplied?.priority || 'All Priorities' },
  ];

  // 3. Create Workbook & Sheets
  const wb = XLSX.utils.book_new();

  // Activities Sheet
  const wsActivities = XLSX.utils.json_to_sheet(activityData);
  // Auto-fit column widths
  wsActivities['!cols'] = [
    { wch: 6 },  // S.N.
    { wch: 12 }, // ID
    { wch: 20 }, // Timestamp
    { wch: 18 }, // Type
    { wch: 12 }, // Priority
    { wch: 16 }, // Booking
    { wch: 24 }, // Client
    { wch: 22 }, // Tour Leader
    { wch: 28 }, // Title
    { wch: 45 }, // Description
    { wch: 35 }, // Metadata
    { wch: 16 }, // Status
  ];
  XLSX.utils.book_append_sheet(wb, wsActivities, 'Field Activities');

  // Summary Sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Audit Summary');

  // 4. Trigger Download
  const filename = `Paila-Nepal-Field-Activities-${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export field activities to PDF (.pdf) document
 */
export async function exportActivitiesToPdf({
  activities,
  filtersApplied,
  companyName = 'Paila Nepal Holidays Pvt. Ltd.',
  exportedBy = 'Tour Operations Dept.'
}: ExportActivityOptions): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Brand Colors
  const brandNavy = [1, 40, 113] as [number, number, number]; // #012871
  const brandOrange = [243, 85, 0] as [number, number, number]; // #f35500
  const darkSlate = [15, 23, 42] as [number, number, number];

  // Top Header Banner
  doc.setFillColor(...brandNavy);
  doc.rect(0, 0, 297, 24, 'F');

  // Orange accent strip
  doc.setFillColor(...brandOrange);
  doc.rect(0, 24, 297, 2, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('FIELD ACTIVITY & TOUR LEADER OPERATIONAL AUDIT REPORT', 14, 18);

  // Top Right Info
  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr} at ${timeStr} (NPT)`, 283, 11, { align: 'right' });
  doc.text(`Exported By: ${exportedBy}`, 283, 17, { align: 'right' });

  // Metadata / Filter Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 30, 269, 16, 2, 2, 'FD');

  doc.setTextColor(...darkSlate);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT SCOPE & APPLIED FILTERS:', 18, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const bFilter = filtersApplied?.bookingCode ? `Booking: ${filtersApplied.bookingCode}` : 'All Bookings';
  const oFilter = filtersApplied?.tourOperatorName ? `Tour Leader: ${filtersApplied.tourOperatorName}` : 'All Operators';
  const tFilter = filtersApplied?.activityType ? `Type: ${formatType(filtersApplied.activityType)}` : 'All Types';
  const pFilter = filtersApplied?.priority ? `Priority: ${filtersApplied.priority}` : 'All Priorities';
  const totalCountText = `Total Records: ${activities.length}`;

  doc.text(`${bFilter}   |   ${oFilter}   |   ${tFilter}   |   ${pFilter}   |   ${totalCountText}`, 18, 42);

  // Table Body Rows
  const tableRows = activities.map((act, idx) => {
    return [
      String(idx + 1),
      formatNepalTime(act.timestamp),
      formatType(act.type),
      act.priority || 'LOW',
      act.bookingCode || '—',
      act.clientName || '—',
      act.tourLeaderName || '—',
      act.title,
      act.description,
      formatMetadata(act),
      act.acknowledged ? 'ACKNOWLEDGED' : 'PENDING'
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [[
      '#',
      'Time (NPT)',
      'Type',
      'Priority',
      'Booking',
      'Client Group',
      'Tour Leader',
      'Title',
      'Description',
      'Key Metadata',
      'Status'
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: brandNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },   // #
      1: { cellWidth: 24 },                   // Time
      2: { cellWidth: 23 },                   // Type
      3: { cellWidth: 16, halign: 'center' }, // Priority
      4: { cellWidth: 20 },                   // Booking
      5: { cellWidth: 28 },                   // Client
      6: { cellWidth: 24 },                   // Tour Leader
      7: { cellWidth: 32 },                   // Title
      8: { cellWidth: 42 },                   // Description
      9: { cellWidth: 32 },                   // Metadata
      10: { cellWidth: 20, halign: 'center' } // Status
    },
    didParseCell: (data) => {
      // Style Status Column
      if (data.section === 'body' && data.column.index === 10) {
        if (data.cell.raw === 'ACKNOWLEDGED') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Style Priority Column
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'CRITICAL') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'HIGH') {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  // Add Page Numbers and Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Field Operations Ledger Statement • Paila Nepal Holidays Pvt. Ltd. • Page ${i} of ${pageCount}`,
      148.5,
      205,
      { align: 'center' }
    );
  }

  // Save PDF
  const filename = `Paila-Nepal-Field-Activities-${dateStr}.pdf`;
  doc.save(filename);
}
