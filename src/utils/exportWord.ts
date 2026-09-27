import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, VerticalAlign } from 'docx';
import { Booking, Package, CompanySettings } from '../types';

/**
 * Utility to export booking documents as structured Word documents (DOCX)
 */
export async function exportBookingDocumentToDOCX(
  booking: Booking,
  documentType: 'proposal' | 'voucher' | 'invoice' | 'itinerary-summary' | 'itinerary-status',
  pkg: Package | undefined,
  balanceDue: number,
  settings: CompanySettings
): Promise<void> {
  const safeTotal = Number.isFinite(Number(booking.totalAgreedAmount)) ? Number(booking.totalAgreedAmount) : 0;
  const safeAdvance = Number.isFinite(Number(booking.advanceReceived)) ? Number(booking.advanceReceived) : 0;
  const safeBalanceDue = Number.isFinite(Number(balanceDue)) ? Number(balanceDue) : Math.max(0, safeTotal - safeAdvance);
  const perPaxRate = (booking.paxCount > 0) ? Math.round(safeTotal / booking.paxCount) : 0;
  
  const vatRate = 0.13;
  const subtotal = Math.round(safeTotal / (1 + vatRate));
  const vatAmount = safeTotal - subtotal;

  const docChildren: any[] = [];

  // 1. Header (Letterhead)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: settings.companyName.toUpperCase(),
          bold: true,
          color: "012871",
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: settings.tagline || "Trekking • Tours • Institutional Travel",
          italics: true,
          color: "475569",
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${settings.address} | Phone: ${settings.phone} | Email: ${settings.email}`,
          size: 16,
          color: "64748b",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `PAN: ${settings.panNumber} | VAT: ${settings.vatNumber} | Web: ${settings.domain}`,
          size: 16,
          color: "64748b",
          bold: true,
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } })
  );

  // Horizontal divider
  const borderCell = new TableCell({
    children: [new Paragraph({ text: "" })],
    borders: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "012871" },
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [borderCell] })],
    }),
    new Paragraph({ text: "", spacing: { after: 300 } })
  );

  // 2. Document Title
  const documentTitles: Record<string, string> = {
    proposal: "TOUR PROPOSAL & QUOTATION",
    voucher: "BOOKING CONFIRMATION VOUCHER",
    invoice: "TAX / PROFORMA INVOICE",
    "itinerary-summary": "ITINERARY & STATUS SUMMARY REPORT",
    "itinerary-status": "ITINERARY & STATUS SUMMARY REPORT",
  };

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: documentTitles[documentType],
          bold: true,
          color: "012871",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Reference Code: ${booking.bookingCode} | Date: ${new Date().toLocaleDateString('en-GB')}`,
          italics: true,
          color: "64748b",
          size: 18,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // 3. Client & Group Details
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: "CLIENT & TRIP SPECIFICATIONS",
          bold: true,
          color: "012871",
          size: 20,
        }),
      ],
      spacing: { before: 100, after: 150 },
    })
  );

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Client Name:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: booking.clientName, size: 18 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Client Category:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: booking.clientType.replace('_', ' '), size: 18 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Contact Number:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: booking.clientPhone || "N/A", size: 18 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Email Address:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: booking.clientEmail || "N/A", size: 18 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Travel Dates:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `${booking.startDate || "TBD"} to ${booking.endDate || "TBD"}`, size: 18 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Group Size:", bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `${booking.paxCount} pax`, size: 18 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 300 } })
  );

  // 4. Day-by-Day Itinerary (Only for Proposals, Vouchers, and Summaries)
  if (documentType !== "invoice" && booking.itineraryDays && booking.itineraryDays.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "DETAILED TRIP PROGRAM & ROADMAP",
            bold: true,
            color: "012871",
            size: 20,
          }),
        ],
        spacing: { before: 200, after: 150 },
      })
    );

    booking.itineraryDays.forEach(day => {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: `Day ${day.dayNumber}: ${day.title}`,
              bold: true,
              color: "012871",
              size: 20,
            }),
          ],
          spacing: { before: 150, after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Accommodation: ${day.overnightLocation || "TBD"} | Meals Included: ${day.mealsIncluded || "N/A"}`,
              bold: true,
              color: "475569",
              size: 16,
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: day.description,
              size: 18,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    });
    docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  }

  // 5. Pricing / Financial Breakdown (For Proposals, Invoices, Summaries)
  if (documentType !== "voucher") {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "FINANCIAL AGREEMENT & INVOICING BREAKDOWN",
            bold: true,
            color: "012871",
            size: 20,
          }),
        ],
        spacing: { before: 200, after: 150 },
      })
    );

    // Itemized pricing table
    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Service Description", bold: true, color: "ffffff", size: 18 })] })],
                shading: { fill: "012871" },
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Qty", bold: true, color: "ffffff", size: 18 })] })],
                shading: { fill: "012871" },
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Per Pax (NPR)", bold: true, color: "ffffff", size: 18 })] })],
                shading: { fill: "012871" },
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Sum (NPR)", bold: true, color: "ffffff", size: 18 })] })],
                shading: { fill: "012871" },
                width: { size: 20, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: pkg?.title || "Custom Himalayan Expedition / Tour Services", size: 18 })] })],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${booking.paxCount} pax`, size: 18 })] })],
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: perPaxRate.toLocaleString(), size: 18 })] })],
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: safeTotal.toLocaleString(), bold: true, size: 18 })] })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 150 } })
    );

    // Financial calculations box
    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Subtotal (Excl. VAT):", size: 18 })] }),
                ],
                width: { size: 70, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `NPR ${subtotal.toLocaleString()}`, font: "Consolas", size: 18 })] }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "VAT Amount (13%):", size: 18 })] }),
                ],
                width: { size: 70, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `NPR ${vatAmount.toLocaleString()}`, font: "Consolas", size: 18 })] }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Contract Grand Total:", bold: true, size: 18 })] }),
                ],
                width: { size: 70, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `NPR ${safeTotal.toLocaleString()}`, bold: true, font: "Consolas", size: 18 })] }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Less: Advance Deposit Received:", size: 18, color: "15803d" })] }),
                ],
                width: { size: 70, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `- NPR ${safeAdvance.toLocaleString()}`, font: "Consolas", size: 18, color: "15803d" })] }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "NET OUTSTANDING BALANCE DUE:", bold: true, color: "f35500", size: 18 })] }),
                ],
                shading: { fill: "fef2e8" },
                width: { size: 70, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `NPR ${safeBalanceDue.toLocaleString()}`, bold: true, font: "Consolas", color: "f35500", size: 18 })] }),
                ],
                shading: { fill: "fef2e8" },
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    );

    // Payment bank details box
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [
          new TextRun({
            text: "BANK DETAILS & DIGITAL TRANSFER SPECIFICATIONS",
            bold: true,
            color: "012871",
            size: 16,
          }),
        ],
        spacing: { before: 100, after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Beneficiary Bank:", bold: true, size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Nabil Bank Ltd.", size: 16 })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Beneficiary Account:", bold: true, size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: settings.companyName, size: 16 })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Account Number:", bold: true, size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: "08701234567890 (NPR)", font: "Consolas", size: 16 })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Branch Code / Name:", bold: true, size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Thamel Branch, Kathmandu, Nepal", size: 16 })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    );
  }

  // 6. Inclusions & Exclusions for Proposals & Summary
  if (documentType === "proposal" || documentType === "itinerary-summary" || documentType === "itinerary-status") {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "TERMS OF SERVICE: INCLUSIONS & EXCLUSIONS",
            bold: true,
            color: "012871",
            size: 20,
          }),
        ],
        spacing: { before: 200, after: 150 },
      })
    );

    const defaultInclusions = "All ground transportation, accommodation, meals as per itinerary, licensed guide, necessary permits";
    const defaultExclusions = "Personal expenses, travel insurance, tips, beverages, extra nights";

    const incList = (pkg?.inclusions || defaultInclusions).split(',');
    const excList = (pkg?.exclusions || defaultExclusions).split(',');

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "✓ INCLUSIONS & SERVICES COVERED", bold: true, color: "15803d", size: 18 })] }),
                  ...incList.map(item => new Paragraph({ children: [new TextRun({ text: `• ${item.trim()}`, size: 16 })] })),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "✗ EXCLUSIONS & NOT INCLUDED", bold: true, color: "b91c1c", size: 18 })] }),
                  ...excList.map(item => new Paragraph({ children: [new TextRun({ text: `• ${item.trim()}`, size: 16 })] })),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    );
  }

  // 7. Voucher Emergency Contacts (Only for Vouchers)
  if (documentType === "voucher") {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "EMERGENCY SAFETY HELPLINES (24/7 Support)",
            bold: true,
            color: "b91c1c",
            size: 20,
          }),
        ],
        spacing: { before: 200, after: 150 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Tour Guide / Leader", bold: true, size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: booking.assignedTourOperatorName || "Prakash Gurung (Lead Guide)", size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: "+977-9871234567", font: "Consolas", size: 16 })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: `${settings.companyName} Helpline`, bold: true, size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: "24/7 Operations Desk Support", size: 16 })] }),
                  new Paragraph({ children: [new TextRun({ text: settings.phone, font: "Consolas", size: 16 })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    );
  }

  // 8. Terms and Conditions
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: "IMPORTANT TERMS & COMPLIANCE STATEMENTS",
          bold: true,
          color: "475569",
          size: 18,
        }),
      ],
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• 50% advance booking deposit required for booking validation. Balance due must be settled 7 days before departure.",
          size: 16,
          color: "475569",
        }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Cancellations within 7 days are subject to 50% service charge. No-shows or cancellations within 48 hours are non-refundable (100% charge).",
          size: 16,
          color: "475569",
        }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `• ${settings.companyName} acts in good faith and is not liable for itinerary disruptions due to heavy weather, highway blockages, domestic flight delays, or natural disasters.`,
          size: 16,
          color: "475569",
        }),
      ],
      spacing: { after: 150 },
    })
  );

  // 9. Signatures Block
  docChildren.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Issued & Confirmed by:", size: 16 })] }),
                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                  children: [
                    new TextRun({ text: booking.createdByName || "Sales Operations Desk", bold: true, size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: settings.companyName, size: 16, color: "64748b" }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
              },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "Client Acceptance Signature:", size: 16 })] }),
                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "____________________________________", bold: true, size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Signature, Stamp & Date", size: 16, color: "64748b" }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
              },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
    })
  );

  // 10. Generate and Download Document
  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = booking.bookingCode.replace(/[^a-zA-Z0-9-]/g, "_");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeName}-${documentType}.docx`;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);
}
