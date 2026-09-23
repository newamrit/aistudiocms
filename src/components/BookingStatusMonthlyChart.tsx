import { useState, useMemo, useRef } from 'react';
import { Booking } from '../types';
import { 
  BarChart3, Calendar, Sparkles,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { sounds } from '../utils/sounds';

interface BookingStatusMonthlyChartProps {
  bookings: Booking[];
  onSelectMonth?: (yearMonth: string) => void;
  selectedMonth?: string | null;
  className?: string;
  defaultExpanded?: boolean;
}

interface MonthlyData {
  monthKey: string; // "2026-01"
  monthLabel: string; // "Jan 2026"
  shortMonth: string; // "Jan '26"
  confirmed: number;
  inProgress: number;
  pending: number; // PROPOSED
  completed: number;
  cancelled: number;
  total: number;
  revenue: number;
  pax: number;
}

export default function BookingStatusMonthlyChart({
  bookings,
  onSelectMonth,
  selectedMonth,
  className = '',
  defaultExpanded = true,
}: BookingStatusMonthlyChartProps) {
  const [chartType, setChartType] = useState<'BAR' | 'AREA'>('BAR');
  const [dateField, setDateField] = useState<'START_DATE' | 'CREATED_AT'>('START_DATE');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<'STACKED' | 'GROUPED'>('STACKED');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Compute monthly data
  const { monthlyData, totals, peakMonth, conversionRate, cancellationRate, maxMonthTotal } = useMemo(() => {
    const monthMap = new Map<string, MonthlyData>();

    // Determine min and max months or default to an 8-month window
    const monthsToSeed = [
      '2025-11', '2025-12', '2026-01', '2026-02', 
      '2026-03', '2026-04', '2026-05', '2026-06'
    ];

    monthsToSeed.forEach(key => {
      const [y, m] = key.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      monthMap.set(key, {
        monthKey: key,
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        shortMonth: d.toLocaleDateString('en-US', { month: 'short' }),
        confirmed: 0,
        inProgress: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        total: 0,
        revenue: 0,
        pax: 0,
      });
    });

    // Populate with actual bookings
    bookings.forEach(b => {
      const rawDate = dateField === 'START_DATE' ? b.startDate : b.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      let item = monthMap.get(key);
      if (!item) {
        item = {
          monthKey: key,
          monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          shortMonth: d.toLocaleDateString('en-US', { month: 'short' }),
          confirmed: 0,
          inProgress: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          total: 0,
          revenue: 0,
          pax: 0,
        };
        monthMap.set(key, item);
      }

      item.total += 1;
      item.revenue += b.totalAgreedAmount || 0;
      item.pax += b.paxCount || 1;

      switch (b.status) {
        case 'CONFIRMED':
          item.confirmed += 1;
          break;
        case 'IN_PROGRESS':
          item.inProgress += 1;
          break;
        case 'PROPOSED':
          item.pending += 1;
          break;
        case 'COMPLETED':
          item.completed += 1;
          break;
        case 'CANCELLED':
          item.cancelled += 1;
          break;
      }
    });

    // Sort chronologically
    const sortedData = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Calculate aggregates
    const totalCount = bookings.length;
    const confirmedCount = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS').length;
    const pendingCount = bookings.filter(b => b.status === 'PROPOSED').length;
    const cancelledCount = bookings.filter(b => b.status === 'CANCELLED').length;
    const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;

    let peak = sortedData[0];
    let maxTotal = 0;
    sortedData.forEach(item => {
      if (item.total > (peak?.total || 0)) {
        peak = item;
      }
      if (item.total > maxTotal) {
        maxTotal = item.total;
      }
    });

    return {
      monthlyData: sortedData,
      totals: {
        total: totalCount,
        confirmed: confirmedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        completed: completedCount,
      },
      peakMonth: peak,
      maxMonthTotal: (Number.isFinite(maxTotal) && maxTotal > 0) ? Math.max(maxTotal, 4) : 4,
      conversionRate: (totalCount > 0 && Number.isFinite(confirmedCount) && Number.isFinite(completedCount))
        ? Math.round(((confirmedCount + completedCount) / totalCount) * 100)
        : 0,
      cancellationRate: (totalCount > 0 && Number.isFinite(cancelledCount))
        ? Math.round((cancelledCount / totalCount) * 100)
        : 0,
    };
  }, [bookings, dateField]);

  // SVG Chart Geometry
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const columnWidth = plotWidth / Math.max(monthlyData.length, 1);

  // Y-axis grid ticks (e.g. 0, 2, 4, 6 or 0, 5, 10) - Strictly NaN-safe
  const yTicks = useMemo(() => {
    const ticksCount = 4;
    const safeMax = (Number.isFinite(maxMonthTotal) && maxMonthTotal > 0) ? maxMonthTotal : 4;
    const step = Math.max(1, Math.ceil(safeMax / ticksCount));
    const result: number[] = [];
    for (let i = 0; i <= ticksCount; i++) {
      result.push(i * step);
    }
    return result;
  }, [maxMonthTotal]);

  const lastTick = yTicks[yTicks.length - 1];
  const currentMaxY = (Number.isFinite(lastTick) && lastTick > 0) ? lastTick : ((Number.isFinite(maxMonthTotal) && maxMonthTotal > 0) ? maxMonthTotal : 4);

  const getYCoord = (val: number) => {
    const safeVal = Number.isFinite(val) ? Math.max(0, val) : 0;
    const safeMax = Number.isFinite(currentMaxY) && currentMaxY > 0 ? currentMaxY : 4;
    const normalized = Math.min(safeVal, safeMax) / safeMax;
    const res = paddingTop + plotHeight - normalized * plotHeight;
    return Number.isFinite(res) ? res : (paddingTop + plotHeight);
  };

  // Helper to build smooth monotone SVG cubic curves for Area chart
  const createSmoothAreaPath = (points: { x: number; y: number }[], baselineY: number): { area: string; line: string } => {
    const validPoints = points.map(p => ({
      x: Number.isFinite(p.x) ? p.x : 0,
      y: Number.isFinite(p.y) ? p.y : baselineY
    }));
    if (validPoints.length === 0) return { area: '', line: '' };
    if (validPoints.length === 1) return { 
      area: `M ${validPoints[0].x} ${validPoints[0].y} L ${validPoints[0].x} ${baselineY} Z`, 
      line: `M ${validPoints[0].x} ${validPoints[0].y}` 
    };

    let path = `M ${validPoints[0].x.toFixed(2)} ${validPoints[0].y.toFixed(2)}`;
    for (let i = 0; i < validPoints.length - 1; i++) {
      const p0 = validPoints[i === 0 ? 0 : i - 1];
      const p1 = validPoints[i];
      const p2 = validPoints[i + 1];
      const p3 = validPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    // Close area to baseline
    const areaPath = `${path} L ${validPoints[validPoints.length - 1].x.toFixed(2)} ${baselineY} L ${validPoints[0].x.toFixed(2)} ${baselineY} Z`;
    return { area: areaPath, line: path };
  };

  // Series points for area chart
  const confirmedPoints = monthlyData.map((d, i) => ({
    x: paddingLeft + i * columnWidth + columnWidth / 2,
    y: getYCoord(d.confirmed + d.inProgress),
  }));

  const pendingPoints = monthlyData.map((d, i) => ({
    x: paddingLeft + i * columnWidth + columnWidth / 2,
    y: getYCoord(d.pending),
  }));

  const cancelledPoints = monthlyData.map((d, i) => ({
    x: paddingLeft + i * columnWidth + columnWidth / 2,
    y: getYCoord(d.cancelled),
  }));

  const confirmedArea = createSmoothAreaPath(confirmedPoints, paddingTop + plotHeight);
  const pendingArea = createSmoothAreaPath(pendingPoints, paddingTop + plotHeight);
  const cancelledArea = createSmoothAreaPath(cancelledPoints, paddingTop + plotHeight);

  // Active hover data
  const activeMonthData = hoveredIndex !== null ? monthlyData[hoveredIndex] : null;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all duration-200 ${className}`}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue dark:text-blue-400 flex items-center justify-center shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Booking Status Breakdown
              </h3>
              {selectedMonth && (
                <span className="text-[11px] font-semibold text-paila-orange bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-900/50">
                  Month: {selectedMonth}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparative timeline of Confirmed, Pending, and Cancelled dossiers
            </p>
          </div>
        </div>

        {/* Controls & Options */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Axis Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setDateField('START_DATE');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateField === 'START_DATE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Travel Date
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setDateField('CREATED_AT');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateField === 'CREATED_AT'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Created Date
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setChartType('BAR');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartType === 'BAR'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Bar Chart View"
            >
              Bar
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setChartType('AREA');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartType === 'AREA'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Area Trend View"
            >
              Trend
            </button>
          </div>

          {/* Bar View Mode (Stacked vs Grouped) */}
          {chartType === 'BAR' && (
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setViewMode(viewMode === 'STACKED' ? 'GROUPED' : 'STACKED');
              }}
              className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Toggle between stacked and side-by-side grouped bars"
            >
              {viewMode === 'STACKED' ? 'Stacked' : 'Grouped'}
            </button>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => {
              sounds.click();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse chart' : 'Expand chart'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expandable Chart Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 animate-fade-in" ref={chartContainerRef}>
          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Confirmed / Active</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {Number.isFinite(totals.confirmed) ? totals.confirmed : 0}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  {String(Number.isFinite(conversionRate) ? conversionRate : 0)}%
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Inquiries</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {Number.isFinite(totals.pending) ? totals.pending : 0}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Proposed
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed Tours</span>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {Number.isFinite(totals.completed) ? totals.completed : 0}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Archived
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cancelled</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {Number.isFinite(totals.cancelled) ? totals.cancelled : 0}
                </span>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                  {String(Number.isFinite(cancellationRate) ? cancellationRate : 0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Legend Strip */}
          <div className="flex items-center justify-end gap-4 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#012871] dark:bg-blue-500" />
              Confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              Cancelled
            </span>
          </div>

          {/* Native Responsive SVG Chart */}
          <div className="relative w-full h-64 sm:h-72 select-none">
            <svg 
              className="w-full h-full overflow-visible" 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => {
                setHoveredIndex(null);
                setTooltipPos(null);
              }}
            >
              <defs>
                <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#012871" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#012871" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="cancelledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02}/>
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines and Y-axis labels */}
              {yTicks.map(tickVal => {
                const y = getYCoord(tickVal);
                return (
                  <g key={`ytick-${tickVal}`}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={svgWidth - paddingRight} 
                      y2={y} 
                      stroke="currentColor" 
                      className="text-slate-200 dark:text-slate-800" 
                      strokeDasharray="4 4"
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={y + 4} 
                      textAnchor="end" 
                      className="text-[11px] fill-slate-400 dark:fill-slate-500 font-mono font-medium"
                    >
                      {String(Number.isFinite(tickVal) ? tickVal : 0)}
                    </text>
                  </g>
                );
              })}

              {/* Baseline axis */}
              <line 
                x1={paddingLeft} 
                y1={paddingTop + plotHeight} 
                x2={svgWidth - paddingRight} 
                y2={paddingTop + plotHeight} 
                stroke="currentColor" 
                className="text-slate-300 dark:text-slate-700"
              />

              {/* Chart Data: BAR MODE */}
              {chartType === 'BAR' && monthlyData.map((d, index) => {
                const colX = paddingLeft + index * columnWidth;
                const isHovered = hoveredIndex === index;
                const isSelected = selectedMonth === d.monthKey;

                if (viewMode === 'STACKED') {
                  const barW = Math.min(columnWidth * 0.5, 36);
                  const barX = colX + (columnWidth - barW) / 2;

                  // Stack values bottom-up
                  const hConfirmed = ((d.confirmed + d.inProgress) / currentMaxY) * plotHeight;
                  const hPending = (d.pending / currentMaxY) * plotHeight;
                  const hCompleted = (d.completed / currentMaxY) * plotHeight;
                  const hCancelled = (d.cancelled / currentMaxY) * plotHeight;

                  let currentY = paddingTop + plotHeight;

                  return (
                    <g key={d.monthKey} className="transition-opacity duration-150">
                      {/* Highlight backdrop */}
                      {(isHovered || isSelected) && (
                        <rect 
                          x={colX + 2} 
                          y={paddingTop} 
                          width={columnWidth - 4} 
                          height={plotHeight} 
                          className={isSelected ? "fill-orange-500/10" : "fill-slate-100/70 dark:fill-slate-800/40"} 
                          rx={6}
                        />
                      )}

                      {/* Confirmed Segment */}
                      {hConfirmed > 0 && (() => {
                        const y = currentY - hConfirmed;
                        currentY = y;
                        return (
                          <rect 
                            x={barX} 
                            y={y} 
                            width={barW} 
                            height={hConfirmed} 
                            className="fill-[#012871] dark:fill-blue-500 transition-all duration-300"
                          />
                        );
                      })()}

                      {/* Pending Segment */}
                      {hPending > 0 && (() => {
                        const y = currentY - hPending;
                        currentY = y;
                        return (
                          <rect 
                            x={barX} 
                            y={y} 
                            width={barW} 
                            height={hPending} 
                            className="fill-[#f59e0b] transition-all duration-300"
                          />
                        );
                      })()}

                      {/* Completed Segment */}
                      {hCompleted > 0 && (() => {
                        const y = currentY - hCompleted;
                        currentY = y;
                        return (
                          <rect 
                            x={barX} 
                            y={y} 
                            width={barW} 
                            height={hCompleted} 
                            className="fill-[#94a3b8] transition-all duration-300"
                          />
                        );
                      })()}

                      {/* Cancelled Segment */}
                      {hCancelled > 0 && (() => {
                        const y = currentY - hCancelled;
                        currentY = y;
                        return (
                          <rect 
                            x={barX} 
                            y={y} 
                            width={barW} 
                            height={hCancelled} 
                            className="fill-[#f43f5e] transition-all duration-300"
                            rx={2}
                          />
                        );
                      })()}
                    </g>
                  );
                } else {
                  // GROUPED MODE
                  const barCount = 4;
                  const singleBarW = Math.min((columnWidth * 0.7) / barCount, 12);
                  const groupW = singleBarW * barCount + (barCount - 1) * 2;
                  const startX = colX + (columnWidth - groupW) / 2;

                  const bars = [
                    { val: d.confirmed + d.inProgress, color: 'fill-[#012871] dark:fill-blue-500' },
                    { val: d.pending, color: 'fill-[#f59e0b]' },
                    { val: d.completed, color: 'fill-[#94a3b8]' },
                    { val: d.cancelled, color: 'fill-[#f43f5e]' },
                  ];

                  return (
                    <g key={d.monthKey}>
                      {/* Highlight backdrop */}
                      {(isHovered || isSelected) && (
                        <rect 
                          x={colX + 2} 
                          y={paddingTop} 
                          width={columnWidth - 4} 
                          height={plotHeight} 
                          className={isSelected ? "fill-orange-500/10" : "fill-slate-100/70 dark:fill-slate-800/40"} 
                          rx={6}
                        />
                      )}

                      {bars.map((bar, bIdx) => {
                        const h = (bar.val / currentMaxY) * plotHeight;
                        const bx = startX + bIdx * (singleBarW + 2);
                        const by = paddingTop + plotHeight - h;
                        return h > 0 ? (
                          <rect 
                            key={`gb-${bIdx}`}
                            x={bx}
                            y={by}
                            width={singleBarW}
                            height={h}
                            className={`${bar.color} transition-all duration-300`}
                            rx={2}
                          />
                        ) : null;
                      })}
                    </g>
                  );
                }
              })}

              {/* Chart Data: AREA MODE */}
              {chartType === 'AREA' && (
                <g>
                  {/* Confirmed Area & Line */}
                  {confirmedArea.area && (
                    <>
                      <path d={confirmedArea.area} fill="url(#confirmedGrad)" />
                      <path d={confirmedArea.line} fill="none" stroke="#012871" strokeWidth={2.5} className="dark:stroke-blue-400" />
                    </>
                  )}

                  {/* Pending Area & Line */}
                  {pendingArea.area && (
                    <>
                      <path d={pendingArea.area} fill="url(#pendingGrad)" />
                      <path d={pendingArea.line} fill="none" stroke="#f59e0b" strokeWidth={2} />
                    </>
                  )}

                  {/* Cancelled Area & Line */}
                  {cancelledArea.area && (
                    <>
                      <path d={cancelledArea.area} fill="url(#cancelledGrad)" />
                      <path d={cancelledArea.line} fill="none" stroke="#f43f5e" strokeWidth={1.5} />
                    </>
                  )}

                  {/* Points on lines */}
                  {monthlyData.map((d, index) => {
                    const cx = paddingLeft + index * columnWidth + columnWidth / 2;
                    const cyConfirmed = getYCoord(d.confirmed + d.inProgress);
                    return (
                      <g key={`pts-${d.monthKey}`}>
                        <circle 
                          cx={cx} 
                          cy={cyConfirmed} 
                          r={hoveredIndex === index ? 5 : 3.5} 
                          className="fill-white stroke-[#012871] dark:stroke-blue-400 stroke-2 transition-all duration-150" 
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* X-Axis Month Labels & Interactive Overlay columns */}
              {monthlyData.map((d, index) => {
                const colX = paddingLeft + index * columnWidth;
                const centerX = colX + columnWidth / 2;
                const isSelected = selectedMonth === d.monthKey;
                const isHovered = hoveredIndex === index;

                return (
                  <g key={`x-axis-${d.monthKey}`}>
                    {/* X-axis label */}
                    <text 
                      x={centerX} 
                      y={svgHeight - 12} 
                      textAnchor="middle" 
                      className={`text-[11px] font-medium transition-colors ${
                        isSelected 
                          ? 'fill-paila-orange font-bold' 
                          : isHovered 
                            ? 'fill-slate-900 dark:fill-white font-semibold' 
                            : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {d.shortMonth}
                    </text>

                    {/* Transparent Click/Hover Trigger Zone */}
                    <rect 
                      x={colX} 
                      y={paddingTop} 
                      width={columnWidth} 
                      height={plotHeight + 35} 
                      fill="transparent" 
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        setHoveredIndex(index);
                        const rect = chartContainerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = chartContainerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onClick={() => {
                        sounds.click();
                        if (onSelectMonth) {
                          onSelectMonth(d.monthKey);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Custom Interactive Floating Tooltip */}
            {activeMonthData && tooltipPos && (
              <div 
                className="absolute pointer-events-none z-30 transition-transform duration-75"
                style={{
                  left: `${Math.min(Math.max(tooltipPos.x - 110, 10), (chartContainerRef.current?.clientWidth || 400) - 230)}px`,
                  top: `${Math.max(tooltipPos.y - 190, 10)}px`,
                }}
              >
                <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs min-w-[220px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-2.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Calendar size={13} className="text-paila-orange" />
                      {activeMonthData.monthLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                      {activeMonthData.total} {activeMonthData.total === 1 ? 'Booking' : 'Bookings'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Confirmed:
                      </span>
                      <span className="font-bold text-white font-mono">{activeMonthData.confirmed}</span>
                    </div>

                    {activeMonthData.inProgress > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          In Progress:
                        </span>
                        <span className="font-bold text-white font-mono">{activeMonthData.inProgress}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Pending (Proposed):
                      </span>
                      <span className="font-bold text-white font-mono">{activeMonthData.pending}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Completed:
                      </span>
                      <span className="font-bold text-white font-mono">{activeMonthData.completed}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Cancelled:
                      </span>
                      <span className="font-bold text-white font-mono">{activeMonthData.cancelled}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Travelers: <strong className="text-white">{activeMonthData.pax} Pax</strong></span>
                    <span>Value: <strong className="text-emerald-400 font-mono">NPR {(activeMonthData.revenue / 1000).toFixed(0)}k</strong></span>
                  </div>

                  {onSelectMonth && (
                    <p className="text-[10px] text-blue-300 italic text-center mt-2 pt-1.5 border-t border-slate-800/80">
                      Click bar to filter view
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Highlights */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>
                Peak Volume: <strong className="text-slate-800 dark:text-slate-200">{peakMonth?.monthLabel || 'N/A'}</strong> ({peakMonth?.total || 0} bookings)
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              Interactive timeline synced with live database filters
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
