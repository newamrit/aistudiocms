import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle, 
  Activity, 
  Calendar, 
  BarChart2, 
  Clock, 
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Info
} from 'lucide-react';
import { FieldActivity } from '../contexts/FieldActivityContext';

export interface FieldActivityTrendsProps {
  activities: FieldActivity[];
  className?: string;
}

type ViewMode = 'VOLUME' | 'CHECK_INS' | 'COMBINED';

interface DayData {
  dateKey: string;         // YYYY-MM-DD
  dayLabel: string;        // e.g. "Thu 24"
  fullDate: string;        // e.g. "Thursday, Sep 24, 2026"
  isToday: boolean;
  totalVolume: number;     // All activities on this day
  checkIns: number;        // CHECK_IN activities
  spotExpenses: number;    // SPOT_EXPENSE activities
  vendorSwaps: number;     // VENDOR_SWAP activities
  statusChanges: number;   // STATUS_CHANGE activities
  emergencyAlerts: number; // EMERGENCY_ALERT activities
  activitiesList: FieldActivity[];
}

export default function FieldActivityTrends({ activities = [], className = '' }: FieldActivityTrendsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('COMBINED');

  // Compute 7-day rolling window data
  const { chartData, summaryStats } = useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    // Generate 7 days in chronological order: [6 days ago ... Today]
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const weekdayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();

      const dayLabel = i === 0 ? 'Today' : `${weekdayShort} ${dayNum}`;
      const fullDate = d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      days.push({
        dateKey,
        dayLabel,
        fullDate,
        isToday: i === 0,
        totalVolume: 0,
        checkIns: 0,
        spotExpenses: 0,
        vendorSwaps: 0,
        statusChanges: 0,
        emergencyAlerts: 0,
        activitiesList: [],
      });
    }

    // Populate counts by matching activities
    (activities || []).forEach(activity => {
      if (!activity.timestamp) return;

      // Extract YYYY-MM-DD from activity.timestamp (supports 'YYYY-MM-DD HH:mm:ss' or ISO)
      const dateStr = activity.timestamp.slice(0, 10);
      const targetDay = days.find(d => d.dateKey === dateStr);

      if (targetDay) {
        targetDay.totalVolume += 1;
        targetDay.activitiesList.push(activity);

        switch (activity.type) {
          case 'CHECK_IN':
            targetDay.checkIns += 1;
            break;
          case 'SPOT_EXPENSE':
            targetDay.spotExpenses += 1;
            break;
          case 'VENDOR_SWAP':
            targetDay.vendorSwaps += 1;
            break;
          case 'STATUS_CHANGE':
            targetDay.statusChanges += 1;
            break;
          case 'EMERGENCY_ALERT':
            targetDay.emergencyAlerts += 1;
            break;
          default:
            break;
        }
      }
    });

    // Summary statistics
    const total7DayVolume = days.reduce((sum, d) => sum + d.totalVolume, 0);
    const total7DayCheckIns = days.reduce((sum, d) => sum + d.checkIns, 0);
    const dailyAverageVolume = (total7DayVolume / 7).toFixed(1);

    // Peak day calculation
    let peakDay = days[0];
    days.forEach(d => {
      if (d.totalVolume > peakDay.totalVolume) {
        peakDay = d;
      }
    });

    return {
      chartData: days,
      summaryStats: {
        total7DayVolume,
        total7DayCheckIns,
        dailyAverageVolume,
        peakDay: peakDay.totalVolume > 0 ? `${peakDay.dayLabel} (${peakDay.totalVolume})` : 'N/A',
        startDate: days[0].dayLabel,
        endDate: days[6].dayLabel,
      }
    };
  }, [activities]);

  // Max value calculation for Y-Axis padding
  const safeMaxVolume = chartData.length > 0
    ? Math.max(...chartData.map(d => Math.max(Number.isFinite(d.totalVolume) ? d.totalVolume : 0, Number.isFinite(d.checkIns) ? d.checkIns : 0)), 4)
    : 4;
  const yAxisMax = Number.isFinite(safeMaxVolume) && safeMaxVolume > 0 ? Math.ceil(safeMaxVolume * 1.25) : 5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className={`lg:col-span-2 bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] p-5 md:p-6 shadow-xs transition-all ${className}`}>
        {/* Header and View Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Field Activity & Check-in Trends
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Last 7 Days
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily trend line of tour leader reports and safety check-ins
                </p>
              </div>
            </div>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('COMBINED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'COMBINED'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Combined Trend
            </button>
            <button
              type="button"
              onClick={() => setViewMode('VOLUME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'VOLUME'
                  ? 'bg-[#f35500] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Activity Volume
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CHECK_INS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'CHECK_INS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Check-ins Only
            </button>
          </div>
        </div>

        {/* Mini KPI Highlights Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
            <div className="text-[11px] font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
              <Activity size={12} /> 7-Day Activity Volume
            </div>
            <div className="text-xl font-bold text-orange-900 dark:text-orange-100 mt-0.5">
              {summaryStats.total7DayVolume} <span className="text-xs font-normal text-orange-600/80">reports</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle size={12} /> 7-Day Check-ins
            </div>
            <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">
              {summaryStats.total7DayCheckIns} <span className="text-xs font-normal text-emerald-600/80">check-ins</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <BarChart2 size={12} /> Daily Average
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {summaryStats.dailyAverageVolume} <span className="text-xs font-normal text-slate-500">/ day</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Clock size={12} /> Peak Reporting Day
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
              {summaryStats.peakDay}
            </div>
          </div>
        </div>

        {/* Main Recharts Visualization Canvas */}
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* Activity Volume Gradient (Paila Orange) */}
                <linearGradient id="activityVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f35500" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f35500" stopOpacity={0.02} />
                </linearGradient>

                {/* Check-ins Gradient (Emerald Green) */}
                <linearGradient id="checkInGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="currentColor" 
                className="text-slate-200/70 dark:text-slate-800/80" 
              />

              <XAxis 
                dataKey="dayLabel" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} 
                className="text-slate-500 dark:text-slate-400 text-[11px] font-medium"
                dy={8}
              />

              <YAxis 
                allowDecimals={false} 
                domain={[0, yAxisMax]} 
                tickLine={false} 
                axisLine={false} 
                className="text-slate-500 dark:text-slate-400 text-[11px] font-medium"
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Total Activity Volume Area & Line */}
              {(viewMode === 'COMBINED' || viewMode === 'VOLUME') && (
                <Area
                  type="monotone"
                  dataKey="totalVolume"
                  name="Total Activities"
                  stroke="#f35500"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#activityVolumeGradient)"
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#f35500' }}
                  dot={{ r: 3.5, stroke: '#f35500', strokeWidth: 1.5, fill: '#ffffff' }}
                />
              )}

              {/* Check-in Volume Area & Line */}
              {(viewMode === 'COMBINED' || viewMode === 'CHECK_INS') && (
                <Area
                  type="monotone"
                  dataKey="checkIns"
                  name="Check-ins"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#checkInGradient)"
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#10b981' }}
                  dot={{ r: 3.5, stroke: '#10b981', strokeWidth: 1.5, fill: '#ffffff' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend & Context Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-[#f35500]" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Total Activity Volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-[#10b981]" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Trekker Safety Check-ins</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Info size={12} />
            <span>Real-time data synced with field reports</span>
          </div>
        </div>
      </div>

      {/* Distribution Pie Chart Sidebar */}
      <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] p-5 md:p-6 shadow-xs flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Activity Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">By report category</p>
          </div>
        </div>

        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Check-ins', value: chartData.reduce((s, d) => s + d.checkIns, 0), color: '#10b981' },
                  { name: 'Expenses', value: chartData.reduce((s, d) => s + d.spotExpenses, 0), color: '#f59e0b' },
                  { name: 'Ops Changes', value: chartData.reduce((s, d) => s + (d.statusChanges + d.vendorSwaps), 0), color: '#3b82f6' },
                  { name: 'Alerts', value: chartData.reduce((s, d) => s + d.emergencyAlerts, 0), color: '#ef4444' },
                ].filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#3b82f6', '#ef4444'][index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Critical Alerts:</span>
            <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
              {chartData.reduce((s, d) => s + d.emergencyAlerts, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Verified Expenses:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              {chartData.reduce((s, d) => s + d.spotExpenses, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Rich Tooltip for Recharts
 */
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data: DayData = payload[0].payload;

    return (
      <div className="bg-slate-950/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md min-w-[210px] animate-in fade-in zoom-in-95 duration-100">
        {/* Date Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Calendar size={13} className="text-orange-400" />
            <span>{data.fullDate}</span>
          </div>
          {data.isToday && (
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
              TODAY
            </span>
          )}
        </div>

        {/* Volume Metric Highlights */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f35500]" />
              Total Activities:
            </span>
            <span className="font-bold text-white text-sm">{data.totalVolume}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Safety Check-ins:
            </span>
            <span className="font-bold text-emerald-400 text-sm">{data.checkIns}</span>
          </div>

          {/* Breakdown if items exist */}
          {data.totalVolume > 0 && (
            <div className="pt-2 mt-2 border-t border-slate-800/80 text-[11px] space-y-1 text-slate-400">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Breakdown</div>
              {data.spotExpenses > 0 && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><DollarSign size={11} className="text-green-400" /> Spot Expenses:</span>
                  <span className="font-semibold text-slate-200">{data.spotExpenses}</span>
                </div>
              )}
              {data.vendorSwaps > 0 && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><RefreshCw size={11} className="text-orange-400" /> Vendor Swaps:</span>
                  <span className="font-semibold text-slate-200">{data.vendorSwaps}</span>
                </div>
              )}
              {data.statusChanges > 0 && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><Activity size={11} className="text-blue-400" /> Status Changes:</span>
                  <span className="font-semibold text-slate-200">{data.statusChanges}</span>
                </div>
              )}
              {data.emergencyAlerts > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-rose-400" /> Emergency Alerts:</span>
                  <span className="font-semibold text-rose-300">{data.emergencyAlerts}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
