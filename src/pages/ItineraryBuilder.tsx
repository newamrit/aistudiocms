import React, { useState } from 'react';
import { 
  CalendarDays, Sparkles, Plus, Trash2, Save, Printer, 
  MapPin, Clock, ChevronDown, ChevronUp, Copy, Wand2,
  FileText, ArrowRight, CheckCircle2, AlertCircle, Info,
  Search, Mountain, Compass, Map, Download, Upload, FileJson, RotateCcw, X, Eye, FileOutput,
  Camera, Award, Sun, Utensils, Heart, Shield, Footprints, Landmark, Trees, Flame, Coffee, Star, Bus, Hotel
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType } from 'docx';
import { useAuth } from '../contexts/AuthContext';
import { usePackages } from '../contexts/PackageContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import { exportItineraryToPdf } from '../utils/exportItinerary';
import { sounds } from '../utils/sounds';
import { HighlightItem } from '../types';

interface ItineraryDay {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  overnightLocation: string;
  mealsIncluded: string;
}

interface ItineraryBuilderProps {
  onNavigate?: (page: string, id?: number) => void;
}

export const AVAILABLE_ICONS = [
  'Sparkles', 'Mountain', 'Compass', 'Camera', 'Award', 'Sun', 
  'Utensils', 'Heart', 'Shield', 'Landmark', 'Trees', 'Flame', 
  'Footprints', 'Coffee', 'MapPin', 'Star', 'Bus', 'Hotel'
];

export const renderHighlightIcon = (iconName?: string, size: number = 16) => {
  const name = (iconName || 'Sparkles').toLowerCase();
  if (name.includes('mountain')) return <Mountain size={size} />;
  if (name.includes('sun')) return <Sun size={size} />;
  if (name.includes('compass') || name.includes('map')) return <Compass size={size} />;
  if (name.includes('camera')) return <Camera size={size} />;
  if (name.includes('award') || name.includes('star')) return <Award size={size} />;
  if (name.includes('flame')) return <Flame size={size} />;
  if (name.includes('landmark')) return <Landmark size={size} />;
  if (name.includes('tree')) return <Trees size={size} />;
  if (name.includes('utensil') || name.includes('food')) return <Utensils size={size} />;
  if (name.includes('heart')) return <Heart size={size} />;
  if (name.includes('shield')) return <Shield size={size} />;
  if (name.includes('footprint') || name.includes('hiking')) return <Footprints size={size} />;
  if (name.includes('coffee')) return <Coffee size={size} />;
  if (name.includes('pin')) return <MapPin size={size} />;
  if (name.includes('clock')) return <Clock size={size} />;
  if (name.includes('bus')) return <Bus size={size} />;
  if (name.includes('hotel')) return <Hotel size={size} />;
  return <Sparkles size={size} />;
};

// Reusable Print Document Component with Modern Timeline & Responsive 2x2 Highlights Grid
const ItineraryPrintDocument = ({ 
  title, 
  days, 
  highlights = [],
  inclusions, 
  exclusions,
  settings,
  isAcademicTour = false,
  academicTargetGroup = '',
  academicDurationText = '',
  academicTotalCost = '',
  academicSchoolName = '',
  academicFinancialBreakdown = '',
  isPreview = false 
}: { 
  title: string; 
  days: ItineraryDay[]; 
  highlights?: HighlightItem[];
  inclusions: string; 
  exclusions: string;
  settings: any;
  isAcademicTour?: boolean;
  academicTargetGroup?: string;
  academicDurationText?: string;
  academicTotalCost?: string;
  academicSchoolName?: string;
  academicFinancialBreakdown?: string;
  isPreview?: boolean;
}) => {
  const brandInitials = (settings?.companyName || 'Paila Nepal')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('') || 'PN';

  return (
    <div className={`${isPreview ? 'bg-white p-12 text-slate-900 shadow-xl' : 'hidden print:block'} space-y-8 print-container`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-bg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-highlights-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.875rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-highlight-card {
            display: flex !important;
            align-items: center !important;
            aspect-ratio: 16 / 4.5 !important;
            min-height: 3.5rem !important;
            padding: 0.75rem 0.875rem !important;
            box-sizing: border-box !important;
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 0.75rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      ` }} />

      {/* PDF Print Header */}
      <div className="border-b-4 border-[#012871] pb-6 relative">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f35500]"></div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Company Logo" 
                className="w-12 h-12 object-contain rounded-2xl bg-white border border-slate-100 p-1 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-[#f35500] to-[#d94b00] rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-lg shadow-orange-500/15 print-bg shrink-0">
                {brandInitials}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-[#012871] tracking-tight">{settings.companyName.toUpperCase()}</h1>
              {settings.tagline && (
                <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-1">{settings.tagline}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-[#012871]/10 text-[#012871] text-[10px] font-bold uppercase rounded-full tracking-wider print-bg">
              {isAcademicTour ? 'Academic study Proposal' : 'Itinerary Proposal'}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-2">Ref: PN-ITIN-{Date.now().toString().slice(-6)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Program Details Banner */}
      <div className="bg-slate-50 border-l-4 border-[#f35500] p-6 rounded-r-2xl mb-6 print-bg">
        <h2 className="text-2xl font-bold text-slate-900">{title || 'Untitled Itinerary'}</h2>
        {isAcademicTour && academicSchoolName && (
          <p className="text-sm md:text-base font-black text-[#012871] uppercase tracking-wider mt-1.5">
            🏫 Prepared For: {academicSchoolName}
          </p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1">⏱ Duration: {isAcademicTour && academicDurationText ? academicDurationText : `${days.length} Days Program`}</span>
          {isAcademicTour && academicTargetGroup && (
            <span className="flex items-center gap-1">🎯 Target Group / Level: {academicTargetGroup}</span>
          )}
          {isAcademicTour && academicTotalCost && (
            <span className="flex items-center gap-1 text-[#f35500] font-bold">💰 Cost per Head: {academicTotalCost}</span>
          )}
          {settings.domain && <span className="flex items-center gap-1">🌐 {settings.domain}</span>}
        </div>
      </div>

      {/* Key Program Highlights - Responsive 2x2 Grid Structure */}
      {highlights && highlights.length > 0 && (
        <div className="mb-8 avoid-break">
          <div className="flex items-center gap-2 mb-3 pb-1.5 border-b-2 border-[#012871]/20">
            <span className="text-[#f35500] font-black text-sm">✦</span>
            <h3 className="text-xs font-black text-[#012871] uppercase tracking-widest">
              Key Program Highlights
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3.5 print-highlights-grid">
            {highlights.map((item) => (
              <div 
                key={item.id}
                className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 flex items-center gap-3 print-bg shadow-2xs print-highlight-card"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#012871] to-[#011f58] text-amber-300 flex items-center justify-center shrink-0 shadow-xs print-bg">
                  {renderHighlightIcon(item.icon, 18)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-[#012871] leading-tight truncate">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-[10px] text-slate-500 font-medium leading-snug line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day by Day Connected Timeline */}
      <div className="relative pl-12 border-l-2 border-[#012871]/30 ml-4 space-y-8">
        {days.map((day) => (
          <div key={day.id} className="relative avoid-break">
            <div className="absolute -left-[69px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#f35500] to-[#d94b00] text-white font-extrabold text-xs shadow-md print-bg">
              D{day.dayNumber < 10 ? `0${day.dayNumber}` : day.dayNumber}
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-extrabold text-base text-[#012871]">{day.title}</h3>
                <div className="flex items-center gap-1.5">
                  {day.overnightLocation && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#012871]/10 text-[#012871] rounded-full uppercase tracking-wider print-bg">
                      📍 {day.overnightLocation}
                    </span>
                  )}
                  {day.mealsIncluded && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-orange-50 text-[#f35500] border border-orange-100 rounded-full uppercase tracking-wider print-bg">
                      🍳 Meals: {day.mealsIncluded}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{day.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Includes & Excludes Sections */}
      {(inclusions || exclusions) && (
        <div className="grid grid-cols-2 gap-6 mt-12 pt-8 border-t border-slate-200">
          {inclusions && (
            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/80 avoid-break print-bg">
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest mb-4 border-b border-emerald-200 pb-2">
                ✔ Inclusions & Program Services
              </h3>
              <div className="space-y-1.5">
                {inclusions.split('\n').map(line => line.trim()).filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 text-sm font-extrabold mt-0.5">✔</span>
                    <span className="text-sm text-slate-800 leading-relaxed font-semibold">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {exclusions && (
            <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/80 avoid-break print-bg">
              <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-4 border-b border-rose-200 pb-2">
                ✘ Exclusions & Optional Costs
              </h3>
              <div className="space-y-1.5">
                {exclusions.split('\n').map(line => line.trim()).filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-rose-600 text-sm font-extrabold mt-0.5">✘</span>
                    <span className="text-sm text-slate-800 leading-relaxed font-semibold">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Print Footer */}
      <div className="mt-12 pt-6 border-t-4 border-[#012871] relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#f35500]"></div>

        <div className="flex justify-between items-start gap-4">
          <div className="text-[10px] text-slate-500 space-y-1">
            <p className="font-extrabold text-slate-800 text-xs">{settings.companyName}</p>
            <p className="font-semibold">{settings.address}</p>
            <p className="font-semibold text-[#012871]">
              {settings.phone} {settings.email && `| ${settings.email}`} {settings.domain && `| ${settings.domain}`}
            </p>
            {settings.registrationNumber && (
              <p className="text-[9px] text-slate-400 font-semibold">Reg No: {settings.registrationNumber}</p>
            )}
          </div>
          <div className="text-right text-[10px] text-slate-400 max-w-xs font-semibold leading-relaxed italic">
            This program itinerary is an official proposal prepared by {settings.companyName}. All services are subject to availability at the time of final confirmation.
          </div>
        </div>
      </div>
    </div>
  );
};

// Destination templates with initial 2x2 grid highlights
export const DESTINATION_TEMPLATES = [
  {
    id: 'abc',
    name: 'Annapurna Base Camp',
    category: 'Trekking',
    baseDuration: 11,
    highlights: [
      { id: 'h-abc-1', title: '360° Annapurna Sanctuary', description: 'Surrounded by 10+ massive Himalayan peaks', icon: 'Mountain' },
      { id: 'h-abc-2', title: 'Natural Jhinu Hot Springs', description: 'Relaxing natural thermal hot springs by river', icon: 'Flame' },
      { id: 'h-abc-3', title: 'Golden Poon Hill Sunrise', description: 'Panoramic morning views over Dhaulagiri & Annapurna', icon: 'Sun' },
      { id: 'h-abc-4', title: 'Authentic Gurung Culture', description: 'Experience rich mountain hospitality & villages', icon: 'Heart' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Meet and greet at airport, transfer to hotel. Trip briefing in the evening.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Drive to Pokhara', description: 'Scenic drive to Pokhara (approx 7 hours). Evening stroll by the lakeside.', overnight: 'Pokhara', meals: 'B' },
      { title: 'Drive to Nayapul & Trek to Tikhedhunga', description: 'Begin the trek. Gradual walk through villages and rhododendron forests.', overnight: 'Tikhedhunga', meals: 'B, L, D' },
      { title: 'Trek to Ghorepani', description: 'Steep climb through stone stairs. Beautiful views of the Himalayas.', overnight: 'Ghorepani', meals: 'B, L, D' },
      { title: 'Poon Hill Sunrise & Trek to Tadapani', description: 'Early morning hike to Poon Hill for panoramic sunrise. Continue trek to Tadapani.', overnight: 'Tadapani', meals: 'B, L, D' },
      { title: 'Trek to Chhomrong', description: 'Descend through thick forests to the large Gurung village of Chhomrong.', overnight: 'Chhomrong', meals: 'B, L, D' },
      { title: 'Trek to Dovan', description: 'Walk through bamboo and oak forests towards the Modi Khola valley.', overnight: 'Dovan', meals: 'B, L, D' },
      { title: 'Trek to Machhapuchhre Base Camp', description: 'Steep climb as the valley narrows. Reach the base of the sacred mountain.', overnight: 'MBC', meals: 'B, L, D' },
      { title: 'Reach Annapurna Base Camp', description: 'Final push to ABC. Spend the afternoon surrounded by 360-degree mountain peaks.', overnight: 'ABC', meals: 'B, L, D' },
      { title: 'Descend to Bamboo', description: 'Long descent back down the valley.', overnight: 'Bamboo', meals: 'B, L, D' },
      { title: 'Trek to Jhinu Danda (Hot Springs)', description: 'Relax in natural hot springs after the strenuous trek.', overnight: 'Jhinu', meals: 'B, L, D' },
    ]
  },
  {
    id: 'ebc',
    name: 'Everest Base Camp',
    category: 'Trekking',
    baseDuration: 14,
    highlights: [
      { id: 'h-ebc-1', title: 'Everest Base Camp (5,364m)', description: 'Touch the base of the world\'s highest summit', icon: 'Mountain' },
      { id: 'h-ebc-2', title: 'Tengboche Monastery', description: 'Historic spiritual center of the Khumbu valley', icon: 'Shield' },
      { id: 'h-ebc-3', title: 'Namche Bazaar Hub', description: 'Vibrant alpine Sherpa capital & museum', icon: 'Compass' },
      { id: 'h-ebc-4', title: 'Kala Patthar Viewpoint', description: 'Closest panoramic view of Mt. Everest & Nuptse', icon: 'Sun' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Transfer to hotel and orientation.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Fly to Lukla & Trek to Phakding', description: 'World\'s most scenic flight. Short trek to Phakding.', overnight: 'Phakding', meals: 'B, L, D' },
      { title: 'Trek to Namche Bazaar', description: 'Cross high suspension bridges. First view of Mt. Everest.', overnight: 'Namche', meals: 'B, L, D' },
      { title: 'Acclimatization Day in Namche', description: 'Hike to Everest View Hotel. Explore the Sherpa capital.', overnight: 'Namche', meals: 'B, L, D' },
      { title: 'Trek to Tengboche', description: 'Visit the famous Tengboche Monastery with views of Ama Dablam.', overnight: 'Tengboche', meals: 'B, L, D' },
      { title: 'Trek to Dingboche', description: 'Ascend into the alpine zone. Views of Island Peak.', overnight: 'Dingboche', meals: 'B, L, D' },
      { title: 'Acclimatization Day in Dingboche', description: 'Hike to Nagarjun Hill for stunning views of Makalu and Lhotse.', overnight: 'Dingboche', meals: 'B, L, D' },
      { title: 'Trek to Lobuche', description: 'Pass through the Khumbu Glacier moraine.', overnight: 'Lobuche', meals: 'B, L, D' },
      { title: 'Gorakshep & Everest Base Camp', description: 'Reach Gorakshep and continue to EBC. Touch the base of the highest peak.', overnight: 'Gorakshep', meals: 'B, L, D' },
      { title: 'Kala Patthar & Pheriche', description: 'Early hike to Kala Patthar for sunrise over Everest. Descend to Pheriche.', overnight: 'Pheriche', meals: 'B, L, D' },
    ]
  },
  {
    id: 'culture',
    name: 'Nepal Cultural Highlights',
    category: 'Tour',
    baseDuration: 7,
    highlights: [
      { id: 'h-cul-1', title: 'UNESCO Heritage Shrines', description: 'Explore ancient Kathmandu Durbar Squares & stupas', icon: 'Landmark' },
      { id: 'h-cul-2', title: 'Chitwan Jungle Safari', description: 'Jeep & canoe safari for rhinos, deer & birdlife', icon: 'Camera' },
      { id: 'h-cul-3', title: 'Peaceful Pokhara Lakeside', description: 'Serene boating with views of Machhapuchhre', icon: 'Compass' },
      { id: 'h-cul-4', title: 'Tharu Cultural Experience', description: 'Live cultural evening show & authentic local dining', icon: 'Heart' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Airport pickup and check-in.', overnight: 'Kathmandu', meals: 'D' },
      { title: 'Kathmandu Heritage Tour', description: 'Visit Pashupatinath, Boudhanath, and Swayambhunath.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Drive to Pokhara', description: 'Scenic drive along the Trishuli River.', overnight: 'Pokhara', meals: 'B' },
      { title: 'Pokhara Sightseeing', description: 'Fewa Lake, Sarangkot sunrise, and Peace Pagoda.', overnight: 'Pokhara', meals: 'B' },
      { title: 'Drive to Chitwan National Park', description: 'Enter the subtropical lowlands for jungle activities.', overnight: 'Chitwan', meals: 'B, D' },
      { title: 'Jungle Safari Activities', description: 'Elephant/Jeep safari, canoe ride, bird watching, and Tharu cultural dance.', overnight: 'Chitwan', meals: 'B, L, D' },
      { title: 'Return to Kathmandu', description: 'Drive back to Kathmandu. Farewell dinner.', overnight: 'Kathmandu', meals: 'B, D' },
    ]
  },
  {
    id: 'upper-mustang',
    name: 'Upper Mustang Trek',
    category: 'Trekking',
    baseDuration: 14,
    highlights: [
      { id: 'h-um-1', title: 'Walled City of Lo Manthang', description: 'Ancient Tibetan royal palace & ancient kingdom', icon: 'Award' },
      { id: 'h-um-2', title: 'Mysterious Sky Caves', description: 'Centuries-old cliffside caves of Chhoser', icon: 'Compass' },
      { id: 'h-um-3', title: 'High Altitude Desert Trail', description: 'Dramatic red sandstone cliffs & deep canyons', icon: 'Sun' },
      { id: 'h-um-4', title: 'Centuries-Old Monasteries', description: 'Precious Buddhist murals & living traditions', icon: 'Sparkles' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Transfer to hotel and trip orientation.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Fly to Pokhara', description: 'Short scenic flight to Pokhara. Afternoon lakeside exploration.', overnight: 'Pokhara', meals: 'B' },
      { title: 'Fly to Jomsom & Trek to Kagbeni', description: 'Morning flight to Jomsom. Trek along the Kali Gandaki river to Kagbeni.', overnight: 'Kagbeni', meals: 'B, L, D' },
      { title: 'Trek to Chele', description: 'Enter the restricted region of Upper Mustang. Trek to Chele village.', overnight: 'Chele', meals: 'B, L, D' },
      { title: 'Trek to Syanbochen', description: 'Cross high passes with views of Tilicho Peak and Nilgiri.', overnight: 'Syanbochen', meals: 'B, L, D' },
      { title: 'Trek to Ghami', description: 'Trek through high altitude desert landscapes to Ghami.', overnight: 'Ghami', meals: 'B, L, D' },
      { title: 'Trek to Tsarang', description: 'Visit the longest mani wall in Mustang and reach Tsarang.', overnight: 'Tsarang', meals: 'B, L, D' },
      { title: 'Reach Lo Manthang', description: 'Trek to the walled city of Lo Manthang, capital of former Mustang Kingdom.', overnight: 'Lo Manthang', meals: 'B, L, D' },
      { title: 'Explore Lo Manthang', description: 'Visit ancient monasteries and explore the mysterious caves of Chhoser.', overnight: 'Lo Manthang', meals: 'B, L, D' },
      { title: 'Trek to Ghami (Return Path)', description: 'Begin return journey through Drakmar village.', overnight: 'Ghami', meals: 'B, L, D' },
    ]
  },
  {
    id: 'langtang-valley',
    name: 'Langtang Valley Trek',
    category: 'Trekking',
    baseDuration: 8,
    highlights: [
      { id: 'h-lt-1', title: 'Kyanjin Ri Peak Panoramic View', description: '360° views of Langtang Lirung & glaciers', icon: 'Mountain' },
      { id: 'h-lt-2', title: 'Artisanal Yak Cheese Factory', description: 'Visit historic alpine cheese production unit', icon: 'Utensils' },
      { id: 'h-lt-3', title: 'Enchanting Rhododendron Trail', description: 'Blooming mountain trails alongside roaring rivers', icon: 'Trees' },
      { id: 'h-lt-4', title: 'Tamang Heritage Experience', description: 'Warm mountain hospitality & ancient culture', icon: 'Heart' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Meet and transfer to hotel.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Drive to Syabrubesi', description: 'Scenic drive through hilly roads (approx 7-8 hours).', overnight: 'Syabrubesi', meals: 'B, L, D' },
      { title: 'Trek to Lama Hotel', description: 'Walk through dense forests along the Langtang Khola river.', overnight: 'Lama Hotel', meals: 'B, L, D' },
      { title: 'Trek to Langtang Village', description: 'Steep climb through rhododendron forests to Langtang village.', overnight: 'Langtang Village', meals: 'B, L, D' },
      { title: 'Trek to Kyanjin Gompa', description: 'Short trek to the beautiful Kyanjin Gompa (3,870m).', overnight: 'Kyanjin Gompa', meals: 'B, L, D' },
      { title: 'Kyanjin Ri Sunrise & Explore', description: 'Hike to Kyanjin Ri for panoramic Himalayan views. Visit cheese factory.', overnight: 'Kyanjin Gompa', meals: 'B, L, D' },
      { title: 'Descend to Lama Hotel', description: 'Long descent back to Lama Hotel.', overnight: 'Lama Hotel', meals: 'B, L, D' },
      { title: 'Trek to Syabrubesi & Return', description: 'Finish trek at Syabrubesi and drive back to Kathmandu next day.', overnight: 'Syabrubesi', meals: 'B, L, D' },
    ]
  },
  {
    id: 'jomsom-muktinath',
    name: 'Jomsom Muktinath Tour',
    category: 'Tour',
    baseDuration: 6,
    highlights: [
      { id: 'h-jm-1', title: 'Sacred Muktinath Temple', description: '108 holy water spouts & eternal flame shrine', icon: 'Sparkles' },
      { id: 'h-jm-2', title: 'Charming Marpha Apple Capital', description: 'Picturesque white-washed stone paving village', icon: 'Sun' },
      { id: 'h-jm-3', title: 'Kali Gandaki River Gorge', description: 'World\'s deepest gorge terrain between 8000m giants', icon: 'Mountain' },
      { id: 'h-jm-4', title: 'Scenic Mountain Flight', description: 'Breathtaking low-altitude flight through mountain gap', icon: 'Compass' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Transfer to hotel.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Drive/Fly to Pokhara', description: 'Scenic journey to the lake city.', overnight: 'Pokhara', meals: 'B' },
      { title: 'Fly to Jomsom & Drive to Muktinath', description: 'Fly to Jomsom, then drive to the sacred Muktinath Temple.', overnight: 'Muktinath', meals: 'B, L, D' },
      { title: 'Temple Visit & Drive to Marpha', description: 'Early morning temple visit. Drive to Marpha, the apple capital.', overnight: 'Marpha', meals: 'B, L, D' },
      { title: 'Drive to Pokhara', description: 'Scenic drive back to Pokhara.', overnight: 'Pokhara', meals: 'B, L, D' },
      { title: 'Return to Kathmandu', description: 'Return journey to Kathmandu.', overnight: 'Kathmandu', meals: 'B' },
    ]
  },
  {
    id: 'chitwan-lumbini',
    name: 'Wildlife & Spirituality',
    category: 'Tour',
    baseDuration: 6,
    highlights: [
      { id: 'h-cl-1', title: 'Birthplace of Lord Buddha', description: 'Explore Maya Devi Temple & Lumbini Sacred Garden', icon: 'Sparkles' },
      { id: 'h-cl-2', title: 'One-Horned Rhino Safari', description: 'Deep jungle exploration in Chitwan National Park', icon: 'Camera' },
      { id: 'h-cl-3', title: 'Sunset River Canoeing', description: 'Serene boat ride observing mugger crocodiles', icon: 'Compass' },
      { id: 'h-cl-4', title: 'World Monastic Zone', description: 'Architectural monasteries built by 25+ nations', icon: 'Landmark' },
    ],
    days: [
      { title: 'Arrival in Kathmandu', description: 'Airport pickup.', overnight: 'Kathmandu', meals: 'B' },
      { title: 'Drive to Chitwan', description: 'Drive to Chitwan National Park.', overnight: 'Chitwan', meals: 'L, D' },
      { title: 'Safari Activities', description: 'Jeep safari and river canoeing.', overnight: 'Chitwan', meals: 'B, L, D' },
      { title: 'Drive to Lumbini', description: 'Drive to the birthplace of Buddha.', overnight: 'Lumbini', meals: 'B, L, D' },
      { title: 'Lumbini Heritage Tour', description: 'Visit Maya Devi Temple and Monastic zones.', overnight: 'Lumbini', meals: 'B, L, D' },
      { title: 'Fly back to Kathmandu', description: 'Morning flight back to capital.', overnight: 'Kathmandu', meals: 'B' },
    ]
  },
  {
    id: 'poon-hill',
    name: 'Ghorepani Poon Hill',
    category: 'Trekking',
    baseDuration: 5,
    highlights: [
      { id: 'h-ph-1', title: 'Golden Poon Hill Sunrise', description: 'Iconic morning rays over Dhaulagiri & Annapurna', icon: 'Sun' },
      { id: 'h-ph-2', title: 'Ghandruk Heritage Village', description: 'Gurung stone houses with Machhapuchhre backdrop', icon: 'Heart' },
      { id: 'h-ph-3', title: 'Fairytale Forest Trails', description: 'Walk through dense blooming rhododendron woods', icon: 'Trees' },
      { id: 'h-ph-4', title: 'Accessible Short Trek', description: 'Ideal Himalayan introduction for all age groups', icon: 'Footprints' },
    ],
    days: [
      { title: 'Drive to Pokhara', description: 'Travel to the lake city.', overnight: 'Pokhara', meals: 'B' },
      { title: 'Drive to Nayapul & Trek to Tikhedhunga', description: 'Start trek with stone stairs.', overnight: 'Tikhedhunga', meals: 'B, L, D' },
      { title: 'Trek to Ghorepani', description: 'Ascend through rhododendron forests.', overnight: 'Ghorepani', meals: 'B, L, D' },
      { title: 'Sunrise at Poon Hill & Trek to Ghandruk', description: 'Morning sunrise and trek to traditional Gurung village.', overnight: 'Ghandruk', meals: 'B, L, D' },
      { title: 'Trek to Nayapul & Drive to Pokhara', description: 'Final descent and return to Pokhara.', overnight: 'Pokhara', meals: 'B, L' },
    ]
  },
  {
    id: 'manaslu-circuit',
    name: 'Manaslu Circuit Trek',
    category: 'Trekking',
    baseDuration: 14,
    highlights: [
      { id: 'h-mc-1', title: 'Larkya La Pass (5,106m)', description: 'Spectacular high-altitude pass crossing', icon: 'Mountain' },
      { id: 'h-mc-2', title: 'Mt. Manaslu (8,163m) Close-up', description: 'Up-close views of the world\'s 8th highest peak', icon: 'Award' },
      { id: 'h-mc-3', title: 'Off-the-Beaten-Track Trail', description: 'Untouched remote wilderness & tranquil villages', icon: 'Compass' },
      { id: 'h-mc-4', title: 'Tibetan Buddhist Culture', description: 'Ancient Samagaun monasteries & prayer wheels', icon: 'Sparkles' },
    ],
    days: [
      { title: 'Drive to Machha Khola', description: 'Long drive through remote hills.', overnight: 'Machha Khola', meals: 'B, L, D' },
      { title: 'Trek to Jagat', description: 'Enter the Manaslu Conservation Area.', overnight: 'Jagat', meals: 'B, L, D' },
      { title: 'Trek to Deng', description: 'Trek along the Budhi Gandaki river.', overnight: 'Deng', meals: 'B, L, D' },
      { title: 'Trek to Namrung', description: 'Witness Tibetan influence and local monasteries.', overnight: 'Namrung', meals: 'B, L, D' },
      { title: 'Trek to Lho', description: 'Views of Mt. Manaslu (8,163m).', overnight: 'Lho', meals: 'B, L, D' },
      { title: 'Trek to Samagaun', description: 'Base for Manaslu climbing expeditions.', overnight: 'Samagaun', meals: 'B, L, D' },
      { title: 'Acclimatization Day', description: 'Visit Pungyen Gompa or Manaslu Base Camp.', overnight: 'Samagaun', meals: 'B, L, D' },
      { title: 'Trek to Samdo', description: 'Proximity to Tibetan border.', overnight: 'Samdo', meals: 'B, L, D' },
      { title: 'Trek to Dharmasala', description: 'High altitude camp before the pass.', overnight: 'Dharmasala', meals: 'B, L, D' },
      { title: 'Larkya La Pass & Trek to Bimthang', description: 'Cross the high pass (5,106m) and descend.', overnight: 'Bimthang', meals: 'B, L, D' },
    ]
  }
];

export default function ItineraryBuilder({ onNavigate }: ItineraryBuilderProps) {
  const { user } = useAuth();
  const { packages, addPackage } = usePackages();
  const { settings } = useCompanySettings();
  
  // State
  const [builderMode, setItineraryBuilderMode] = useState<'manual' | 'automatic' | 'library'>('automatic');
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [itineraryTitle, setItineraryTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inclusions, setInclusions] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Academic focus fields
  const [isAcademicTour, setIsAcademicTour] = useState(false);
  const [academicSchoolName, setAcademicSchoolName] = useState('');
  const [academicTargetGroup, setAcademicTargetGroup] = useState('');
  const [academicDurationText, setAcademicDurationText] = useState('');
  const [academicTotalCost, setAcademicTotalCost] = useState('');
  const [academicFinancialBreakdown, setAcademicFinancialBreakdown] = useState('');

  // Library Handlers
  const handleLoadFromLibrary = (pkg: any) => {
    sounds.success();
    setItineraryTitle(pkg.title);
    setInclusions(pkg.inclusions || '');
    setExclusions(pkg.exclusions || '');
    if (pkg.highlights && pkg.highlights.length > 0) {
      setHighlights(pkg.highlights);
    } else {
      setHighlights([
        { id: `h-${Date.now()}-1`, title: 'Panoramic Mountain Views', description: 'Scenic Himalayan landscape views', icon: 'Mountain' },
        { id: `h-${Date.now()}-2`, title: 'Cultural Immersion', description: 'Experience local heritage & traditions', icon: 'Compass' },
        { id: `h-${Date.now()}-3`, title: 'Curated Itinerary', description: 'Expertly managed travel route', icon: 'Award' },
        { id: `h-${Date.now()}-4`, title: 'Full Guidance', description: 'Professional support throughout tour', icon: 'Sparkles' }
      ]);
    }
    if (pkg.itineraryDays && pkg.itineraryDays.length > 0) {
      const mappedDays = pkg.itineraryDays.map((d: any) => ({
        id: `lib-${pkg.id}-${d.id}-${Date.now()}`,
        dayNumber: d.dayNumber,
        title: d.title,
        description: d.description,
        overnightLocation: d.overnightLocation,
        mealsIncluded: d.mealsIncluded
      }));
      setDays(mappedDays);
    } else {
      setDays([]);
    }
    setItineraryBuilderMode('manual');
  };

  // Highlights Handlers
  const handleAddHighlight = () => {
    sounds.click();
    const newHighlight: HighlightItem = {
      id: `hl-${Date.now()}`,
      title: 'New Highlight',
      description: 'Key tour feature',
      icon: 'Sparkles'
    };
    setHighlights(prev => [...prev, newHighlight]);
  };

  const handleUpdateHighlight = (id: string, updates: Partial<HighlightItem>) => {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleRemoveHighlight = (id: string) => {
    sounds.click();
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  // Manual Day Handlers
  const handleAddDay = (index?: number) => {
    sounds.click();
    const newDay: ItineraryDay = {
      id: `day-${Date.now()}`,
      dayNumber: 0,
      title: '',
      description: '',
      overnightLocation: '',
      mealsIncluded: 'B, L, D'
    };

    let newDays = [...days];
    if (typeof index === 'number') {
      newDays.splice(index + 1, 0, newDay);
    } else {
      newDays.push(newDay);
    }

    const reindexed = newDays.map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDays(reindexed);
  };

  const handleRemoveDay = (id: string) => {
    sounds.click();
    const filtered = days.filter(d => d.id !== id);
    const reindexed = filtered.map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDays(reindexed);
  };

  const handleUpdateDay = (id: string, updates: Partial<ItineraryDay>) => {
    setDays(days.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleDuplicateDay = (day: ItineraryDay) => {
    sounds.click();
    const index = days.findIndex(d => d.id === day.id);
    const newDay: ItineraryDay = {
      ...day,
      id: `copy-${Date.now()}`,
      title: `${day.title} (Copy)`
    };
    
    const newDays = [...days];
    newDays.splice(index + 1, 0, newDay);
    
    const reindexed = newDays.map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDays(reindexed);
  };

  // Automatic Builder logic
  const handleApplyTemplate = () => {
    const template = DESTINATION_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) return;

    sounds.success();
    setItineraryTitle(customTemplateName.trim() || template.name);
    setHighlights(template.highlights || []);
    const generatedDays: ItineraryDay[] = template.days.map((d, i) => ({
      id: `${template.id}-${i}-${Date.now()}`,
      dayNumber: i + 1,
      title: d.title,
      description: d.description,
      overnightLocation: d.overnight,
      mealsIncluded: d.meals
    }));

    setDays(generatedDays);
    setItineraryBuilderMode('manual');
  };

  const handleSaveItinerary = async () => {
    if (!itineraryTitle.trim()) {
      sounds.error();
      alert('Please enter an itinerary title before saving.');
      return;
    }
    
    if (days.length === 0) {
      sounds.error();
      alert('Please add at least one day to the itinerary.');
      return;
    }

    try {
      sounds.cashRegister();
      
      await addPackage({
        title: itineraryTitle,
        slug: itineraryTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        durationDays: days.length,
        durationNights: Math.max(0, days.length - 1),
        standardPrice: 0,
        overview: `Custom itinerary generated via Smart Builder for ${itineraryTitle}.`,
        inclusions: inclusions || 'Standard inclusions apply.',
        exclusions: exclusions || 'Standard exclusions apply.',
        category: 'Custom',
        highlights: highlights,
        itineraryDays: days.map(d => ({
          id: typeof d.id === 'string' && d.id.startsWith('day-') ? parseInt(d.id.replace('day-', '')) : Math.floor(Math.random() * 10000),
          dayNumber: d.dayNumber,
          title: d.title,
          description: d.description,
          overnightLocation: d.overnightLocation,
          mealsIncluded: d.mealsIncluded
        }))
      });

      setShowSavedToast(true);
      showToast(`Itinerary "${itineraryTitle}" saved to library`);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch (err) {
      console.error('Failed to save itinerary as package:', err);
      alert('Failed to save itinerary. Please try again.');
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire workspace?')) {
      sounds.delete();
      setDays([]);
      setHighlights([]);
      setItineraryTitle('');
      setSelectedTemplateId('');
    }
  };

  const handleExportJSON = () => {
    try {
      if (days.length === 0) {
        sounds.error();
        alert('Please add at least one day or generate an itinerary to export.');
        return;
      }
      
      sounds.success();
      const data = {
        title: itineraryTitle || 'Untitled Itinerary',
        exportedAt: new Date().toISOString(),
        highlights,
        inclusions,
        exclusions,
        isAcademicTour,
        academicSchoolName,
        academicTargetGroup,
        academicDurationText,
        academicTotalCost,
        academicFinancialBreakdown,
        days: days.map(({ id, ...rest }) => ({
          dayNumber: rest.dayNumber,
          title: rest.title,
          description: rest.description,
          overnightLocation: rest.overnightLocation,
          mealsIncluded: rest.mealsIncluded
        }))
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (itineraryTitle || 'itinerary').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      link.href = url;
      link.download = `${safeName}.json`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      showToast('Itinerary exported as JSON');
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate export file. Please try again.');
    }
  };

  const handleExportDOCX = async () => {
    try {
      if (days.length === 0) {
        sounds.error();
        alert('Please add at least one day or generate an itinerary to export as Word document.');
        return;
      }

      sounds.success();
      showToast('Generating Word document...');

      const highlightParagraphs = (highlights && highlights.length > 0) ? [
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: "KEY PROGRAM HIGHLIGHTS", bold: true, color: "012871" })],
          spacing: { before: 200, after: 100 },
        }),
        ...highlights.map(h => new Paragraph({
          children: [
            new TextRun({ text: `• ${h.title}: `, bold: true, color: "012871" }),
            new TextRun({ text: h.description || '', italics: true }),
          ],
          spacing: { after: 100 },
        }))
      ] : [];

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "PAILA NEPAL",
                  bold: true,
                  color: "012871",
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Tours & Travels Pvt. Ltd.",
                  bold: true,
                  color: "64748b",
                  size: 16,
                }),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 200 } }),

            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: itineraryTitle || 'Untitled Itinerary',
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${days.length} Days Program Overview`,
                  italics: true,
                  color: "64748b",
                }),
              ],
              spacing: { after: 300 },
            }),

            ...highlightParagraphs,

            ...days.flatMap((day) => [
              new Paragraph({
                heading: HeadingLevel.HEADING_3,
                children: [
                  new TextRun({
                    text: `Day ${day.dayNumber}: ${day.title}`,
                    bold: true,
                    color: "012871",
                  }),
                ],
                spacing: { before: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Overnight: ${day.overnightLocation} | Meals: ${day.mealsIncluded}`,
                    bold: true,
                    size: 18,
                    color: "475569",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: day.description,
                    size: 22,
                  }),
                ],
                spacing: { after: 200 },
              }),
            ]),

            new Paragraph({ text: "", spacing: { before: 400 } }),

            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "INCLUSIONS", bold: true, color: "012871" })],
                        }),
                        ...inclusions.split('\n').map(line => new Paragraph({ 
                          children: [new TextRun({ text: line, size: 18 })],
                        })),
                      ],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                      },
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "EXCLUSIONS", bold: true, color: "012871" })],
                        }),
                        ...exclusions.split('\n').map(line => new Paragraph({ 
                          children: [new TextRun({ text: line, size: 18 })],
                        })),
                      ],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
                      },
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: "", spacing: { before: 400 } }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Paila Nepal Tours & Travels Pvt. Ltd.",
                  bold: true,
                  size: 16,
                  color: "64748b",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Kathmandu, Nepal | www.pailanepal.com.np",
                  size: 14,
                  color: "94a3b8",
                }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (itineraryTitle || 'itinerary').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      link.href = url;
      link.download = `${safeName}.docx`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      showToast('Itinerary exported as Word document');
    } catch (err) {
      console.error('Word export error:', err);
      alert('Failed to generate Word document. Please try again.');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.title) setItineraryTitle(json.title);
        if (json.inclusions) setInclusions(json.inclusions);
        if (json.exclusions) setExclusions(json.exclusions);
        if (Array.isArray(json.highlights)) setHighlights(json.highlights);
        if (json.isAcademicTour !== undefined) setIsAcademicTour(json.isAcademicTour);
        if (json.academicSchoolName) setAcademicSchoolName(json.academicSchoolName);
        if (json.academicTargetGroup) setAcademicTargetGroup(json.academicTargetGroup);
        if (json.academicDurationText) setAcademicDurationText(json.academicDurationText);
        if (json.academicTotalCost) setAcademicTotalCost(json.academicTotalCost);
        if (json.academicFinancialBreakdown) setAcademicFinancialBreakdown(json.academicFinancialBreakdown);
        if (Array.isArray(json.days)) {
          const importedDays = json.days.map((d: any, index: number) => ({
            ...d,
            id: `import-${Date.now()}-${index}`,
            dayNumber: index + 1
          }));
          setDays(importedDays);
          sounds.success();
          showToast('Itinerary imported successfully');
          setItineraryBuilderMode('manual');
        } else {
          throw new Error('Invalid itinerary format');
        }
      } catch (err) {
        sounds.error();
        alert('Failed to import itinerary. Please ensure the file is a valid JSON itinerary.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrintPDF = () => {
    if (days.length === 0) {
      sounds.error();
      alert('Please add at least one day or generate an itinerary to export as PDF.');
      return;
    }
    sounds.click();
    setShowPrintPreview(true);
  };

  const triggerActualPrint = async () => {
    try {
      sounds.click();
      await exportItineraryToPdf({
        title: itineraryTitle,
        days,
        highlights,
        inclusions,
        exclusions,
        companySettings: settings,
        isAcademicTour,
        academicSchoolName,
        academicTargetGroup,
        academicDurationText,
        academicTotalCost,
        academicFinancialBreakdown,
      });
      showToast('Itinerary PDF downloaded successfully!');
      setShowPrintPreview(false);
    } catch (e) {
      console.error('PDF Export error:', e);
      alert('Could not generate PDF. Please try again.');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative">
      <ItineraryPrintDocument 
        title={itineraryTitle} 
        days={days} 
        highlights={highlights}
        inclusions={inclusions} 
        exclusions={exclusions} 
        settings={settings}
        isAcademicTour={isAcademicTour}
        academicSchoolName={academicSchoolName}
        academicTargetGroup={academicTargetGroup}
        academicDurationText={academicDurationText}
        academicTotalCost={academicTotalCost}
        academicFinancialBreakdown={academicFinancialBreakdown}
      />

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111c30] p-6 rounded-2xl border border-slate-200 dark:border-[#22324b] shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue flex items-center justify-center">
            <Map size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Itinerary Builder</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Design tour roadmaps with 2x2 grid highlights and export to PDF</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* File Operations */}
          <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all">
              <Upload size={14} />
              Import JSON
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Download size={14} />
              JSON
            </button>
            <button
              onClick={handleExportDOCX}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Export as Microsoft Word"
            >
              <FileOutput size={14} />
              Word
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-paila-blue/10 hover:bg-paila-blue/20 text-paila-blue dark:text-blue-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Printer size={14} />
              PDF
            </button>
          </div>

          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center">
            <button
              onClick={() => { sounds.click(); setItineraryBuilderMode('automatic'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                builderMode === 'automatic' 
                  ? 'bg-white dark:bg-slate-700 text-paila-blue shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              System Templates
            </button>
            <button
              onClick={() => { sounds.click(); setItineraryBuilderMode('library'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                builderMode === 'library' 
                  ? 'bg-white dark:bg-slate-700 text-paila-blue shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              My Library
            </button>
            <button
              onClick={() => { sounds.click(); setItineraryBuilderMode('manual'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                builderMode === 'manual' 
                  ? 'bg-white dark:bg-slate-700 text-paila-blue shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Manual Builder
            </button>
          </div>
        </div>
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {builderMode === 'library' ? (
            <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-paila-blue" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Your Saved Itineraries</h3>
                </div>
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your library..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-paila-blue"
                  />
                </div>
              </div>

              {packages.length === 0 ? (
                <div className="py-20 text-center space-y-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700">
                    <FileText size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Your library is empty</p>
                    <p className="text-xs text-slate-400">Save an itinerary from the manual builder to see it here</p>
                  </div>
                  <button
                    onClick={() => setItineraryBuilderMode('manual')}
                    className="px-6 py-2 bg-paila-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-paila-blue-light transition-all cursor-pointer"
                  >
                    Go to Builder
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {packages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())).map(pkg => (
                    <div 
                      key={pkg.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-paila-blue/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 uppercase">
                          {pkg.category || 'Package'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{pkg.durationDays} Days</span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {pkg.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {pkg.overview || 'No overview available.'}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-paila-blue">
                            {pkg.itineraryDays?.length || 0} Steps
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleLoadFromLibrary(pkg)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-paila-blue text-white text-[10px] font-bold rounded-lg shadow-md active:scale-95 cursor-pointer"
                          >
                            <Plus size={12} />
                            Load to Builder
                          </button>
                          {onNavigate && (
                            <button
                              onClick={() => onNavigate('new-booking')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              <CalendarDays size={12} className="text-paila-blue" />
                              Convert to Booking
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : builderMode === 'automatic' ? (
            <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Select a Destination Template</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DESTINATION_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      sounds.click();
                      setSelectedTemplateId(template.id);
                      setCustomTemplateName(template.name);
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      selectedTemplateId === template.id 
                        ? 'border-paila-blue bg-blue-50/50 dark:bg-blue-900/20' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        template.category === 'Trekking' 
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' 
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                      }`}>
                        {template.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{template.baseDuration} Days</span>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{template.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">Includes 4 key highlights in 2x2 grid layout.</p>
                    
                    <div className={`absolute bottom-0 left-0 h-1 bg-paila-blue transition-all duration-300 ${
                      selectedTemplateId === template.id ? 'w-full' : 'w-0'
                    }`}></div>
                  </button>
                ))}
              </div>

              {selectedTemplateId && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Customize Itinerary Title (Optional)
                      </label>
                      <input 
                        type="text"
                        value={customTemplateName}
                        onChange={(e) => setCustomTemplateName(e.target.value)}
                        placeholder="Enter a title for this itinerary..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all font-semibold"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 md:justify-end">
                      <p className="text-xs text-slate-500 text-center sm:text-right">
                        Generating a <strong>{DESTINATION_TEMPLATES.find(t => t.id === selectedTemplateId)?.baseDuration} day</strong> itinerary with 2x2 highlights grid.
                      </p>
                      <button
                        onClick={handleApplyTemplate}
                        className="px-6 py-2.5 bg-paila-blue text-white rounded-xl text-xs font-bold shadow-lg hover:bg-paila-blue-light transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <Wand2 size={14} />
                        Generate Itinerary
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] shadow-2xs overflow-hidden space-y-6">
              <div className="p-6 border-b border-slate-100 dark:border-[#22324b] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <input 
                  type="text"
                  value={itineraryTitle}
                  onChange={(e) => setItineraryTitle(e.target.value)}
                  placeholder="Enter Itinerary Title (e.g., Everest Base Camp Special)"
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none w-full sm:w-96 focus:text-paila-blue transition-colors"
                />
                <button
                  onClick={handleClear}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear workspace"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Highlights Section (CSS Grid 2x2) */}
              <div className="px-6">
                <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f35500] to-[#d94b00] text-white flex items-center justify-center font-bold shadow-2xs">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Highlights Section</h3>
                        <p className="text-[10px] text-slate-400">Card-based items rendered in a distinct 2x2 grid in PDF export</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddHighlight}
                      className="px-3 py-1.5 bg-paila-blue/10 hover:bg-paila-blue/20 text-paila-blue dark:text-blue-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus size={14} /> Add Highlight
                    </button>
                  </div>

                  {highlights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <p className="text-xs text-slate-400 font-medium">No highlights added yet.</p>
                      <button
                        type="button"
                        onClick={handleAddHighlight}
                        className="px-4 py-1.5 bg-paila-blue text-white rounded-xl text-xs font-bold shadow-xs hover:bg-paila-blue-light transition-all cursor-pointer"
                      >
                        + Add First Highlight
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {highlights.map((highlight) => (
                        <div 
                          key={highlight.id} 
                          className="relative bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-paila-blue/50 transition-all flex items-start gap-3 group shadow-2xs"
                        >
                          {/* Icon Selector / Badge Container */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setActivePickerId(activePickerId === highlight.id ? null : highlight.id)}
                              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#012871] to-[#011f58] text-amber-300 flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 transition-transform"
                              title="Click to choose icon"
                            >
                              {renderHighlightIcon(highlight.icon, 18)}
                            </button>

                            {/* Icon selection dropdown */}
                            {activePickerId === highlight.id && (
                              <div className="absolute left-0 top-12 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xl grid grid-cols-6 gap-1.5 w-60 animate-in fade-in zoom-in-95">
                                {AVAILABLE_ICONS.map((iconName) => (
                                  <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateHighlight(highlight.id, { icon: iconName });
                                      setActivePickerId(null);
                                    }}
                                    className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                      highlight.icon === iconName 
                                        ? 'bg-paila-blue text-white shadow-xs scale-105' 
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                    title={iconName}
                                  >
                                    {renderHighlightIcon(iconName, 14)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <input
                              type="text"
                              value={highlight.title}
                              onChange={(e) => handleUpdateHighlight(highlight.id, { title: e.target.value })}
                              placeholder="Highlight title (e.g. 360° Annapurna Panorama)"
                              className="w-full bg-transparent font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:text-paila-blue transition-colors placeholder:text-slate-400"
                            />
                            <input
                              type="text"
                              value={highlight.description || ''}
                              onChange={(e) => handleUpdateHighlight(highlight.id, { description: e.target.value })}
                              placeholder="Short description..."
                              className="w-full bg-transparent text-[11px] text-slate-500 dark:text-slate-400 outline-none placeholder:text-slate-400/70"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(highlight.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Delete highlight"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Days List */}
              <div className="p-6 space-y-4">
                {days.length === 0 ? (
                  <div className="py-16 text-center space-y-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700">
                      <Plus size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Start building your roadmap</p>
                      <p className="text-xs text-slate-400">Add your first day to begin the design process</p>
                    </div>
                    <button
                      onClick={() => handleAddDay()}
                      className="px-6 py-2 bg-paila-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-paila-blue-light transition-all cursor-pointer"
                    >
                      Add Day 1
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {days.map((day, index) => (
                      <div key={day.id} className="group relative bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 hover:border-paila-blue/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-paila-blue text-white flex items-center justify-center text-xs font-bold">
                              {day.dayNumber}
                            </div>
                            <input 
                              type="text"
                              value={day.title}
                              onChange={(e) => handleUpdateDay(day.id, { title: e.target.value })}
                              placeholder="Activity Title (e.g., Arrival & Briefing)"
                              className="bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none w-full sm:w-96 focus:text-paila-blue transition-colors"
                            />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleDuplicateDay(day)}
                              className="p-1.5 text-slate-400 hover:text-paila-blue hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Duplicate Day"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveDay(day.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete Day"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Description & Activities</label>
                              <textarea 
                                value={day.description}
                                onChange={(e) => handleUpdateDay(day.id, { description: e.target.value })}
                                placeholder="Describe the day's program..."
                                rows={3}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Overnight</label>
                                <div className="relative">
                                  <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                    type="text"
                                    value={day.overnightLocation}
                                    onChange={(e) => handleUpdateDay(day.id, { overnightLocation: e.target.value })}
                                    placeholder="Location"
                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-paila-blue"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Meals</label>
                                <div className="relative">
                                  <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                    type="text"
                                    value={day.mealsIncluded}
                                    onChange={(e) => handleUpdateDay(day.id, { mealsIncluded: e.target.value })}
                                    placeholder="B, L, D"
                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-paila-blue"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => handleAddDay(index)}
                                className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-paila-blue hover:border-paila-blue transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Plus size={12} />
                                Insert Day After
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {days.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎓</span>
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">School / College Educational Program</label>
                          <p className="text-[10px] text-slate-400">Design study tours with target audiences, durations, and budget breakdowns</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isAcademicTour}
                        onChange={(e) => setIsAcademicTour(e.target.checked)}
                        className="w-4 h-4 text-paila-blue border-slate-300 rounded focus:ring-paila-blue cursor-pointer"
                      />
                    </div>

                    {isAcademicTour && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                        <div className="space-y-1 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">School / College Name</label>
                          <input 
                            type="text"
                            value={academicSchoolName}
                            onChange={(e) => setAcademicSchoolName(e.target.value)}
                            placeholder="e.g. Kathmandu University, St. Xavier's College"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Group</label>
                          <input 
                            type="text"
                            value={academicTargetGroup}
                            onChange={(e) => setAcademicTargetGroup(e.target.value)}
                            placeholder="e.g. Grade 9 Students, High School BBA"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tour Duration</label>
                          <input 
                            type="text"
                            value={academicDurationText}
                            onChange={(e) => setAcademicDurationText(e.target.value)}
                            placeholder="e.g. 5 Days / 4 Nights Study Tour"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cost per Student</label>
                          <input 
                            type="text"
                            value={academicTotalCost}
                            onChange={(e) => setAcademicTotalCost(e.target.value)}
                            placeholder="e.g. NPR 12,500 / Student"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {days.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inclusions (What's included?)</label>
                      <textarea 
                        value={inclusions}
                        onChange={(e) => setInclusions(e.target.value)}
                        placeholder="• Accommodation&#10;• Meals&#10;• Transportation..."
                        rows={6}
                        className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Exclusions (What's NOT included?)</label>
                      <textarea 
                        value={exclusions}
                        onChange={(e) => setExclusions(e.target.value)}
                        placeholder="• International Flights&#10;• Personal Expenses&#10;• Travel Insurance..."
                        rows={6}
                        className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs outline-none focus:ring-1 focus:ring-paila-blue transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {days.length > 0 && (
                <div className="p-6 bg-slate-50 dark:bg-[#111c30] border-t border-slate-100 dark:border-[#22324b] flex items-center justify-between">
                  <button
                    onClick={() => handleAddDay()}
                    className="text-xs font-bold text-slate-500 hover:text-paila-blue flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add Another Day
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onNavigate && onNavigate('new-booking')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Skip saving to library and go direct to booking"
                    >
                      <CalendarDays size={16} />
                      Direct Booking
                    </button>
                    <button
                      onClick={handleSaveItinerary}
                      className="flex items-center gap-2 px-6 py-2.5 bg-paila-blue hover:bg-paila-blue-light text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Save size={16} />
                      Save to Library
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] p-6 shadow-2xs">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Compass size={18} className="text-paila-blue" />
              Live Preview
            </h3>
            
            {days.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400">No days added to preview</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                  <h4 className="text-sm font-bold text-paila-blue truncate">{itineraryTitle || 'Untitled Itinerary'}</h4>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{days.length} Day Program • {highlights.length} Highlights</p>
                </div>

                {/* Highlights 2x2 Grid Live Preview */}
                {highlights.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highlights (2x2 Grid)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {highlights.map(item => (
                        <div key={item.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#012871] text-amber-300 flex items-center justify-center shrink-0">
                            {renderHighlightIcon(item.icon, 12)}
                          </div>
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day-by-Day Steps Preview */}
                <div className="relative pl-4 space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {days.slice(0, 3).map(day => (
                    <div key={day.id} className="relative">
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-paila-blue ring-4 ring-white dark:ring-[#111c30]"></div>
                      <div className="pl-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Day {day.dayNumber}</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{day.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin size={8} /> {day.overnightLocation || 'Not set'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {days.length > 3 && (
                    <div className="relative pb-2">
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-white dark:ring-[#111c30]"></div>
                      <div className="pl-4">
                        <p className="text-[10px] font-bold text-slate-400 italic">... and {days.length - 3} more days</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePrintPDF}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={14} />
                  Print Full PDF Preview
                </button>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-[#012871] to-[#011f58] rounded-2xl p-6 text-white shadow-lg space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Info size={16} />
              Pro Tips
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></div>
                <p className="text-[11px] text-blue-100">Highlights auto-format into a clean 2x2 grid in PDF proposal downloads.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></div>
                <p className="text-[11px] text-blue-100">Click the icon on any highlight card to pick custom Lucide icons.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></div>
                <p className="text-[11px] text-blue-100">Use system templates to load 4 key highlights with pre-selected icons instantly.</p>
              </div>
            </div>
            <hr className="border-white/10" />
            <button
              onClick={() => { sounds.click(); setItineraryBuilderMode('automatic'); setSelectedTemplateId(''); setDays([]); setHighlights([]); }}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} />
              Reset Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 size={20} />
            <div className="flex-1">
              <p className="text-sm font-bold">{toastMsg || 'Itinerary Saved Successfully'}</p>
              <p className="text-[10px] opacity-90 text-emerald-50">Operational update successful</p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('new-booking')}
                className="ml-4 px-3 py-1 bg-white text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-50 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                Create Booking <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 no-print">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowPrintPreview(false)}></div>
          
          <div className="relative w-full max-w-5xl h-full flex flex-col bg-slate-100 dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#111c30] border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-paila-blue/10 text-paila-blue flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">A4 Print Preview</h3>
                  <p className="text-[10px] text-slate-500">Review layout with 2x2 grid highlights before PDF download</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={triggerActualPrint}
                  className="flex items-center gap-2 px-6 py-2 bg-paila-blue hover:bg-paila-blue-light text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Printer size={18} />
                  Print / Save PDF
                </button>
              </div>
            </div>

            {/* Modal Body (Simulated A4 Paper) */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 flex justify-center bg-slate-200 dark:bg-slate-950">
              <div className="w-full max-w-[210mm] min-h-[297mm] shadow-2xl origin-top transition-transform duration-300">
                <ItineraryPrintDocument 
                  title={itineraryTitle} 
                  days={days} 
                  highlights={highlights}
                  inclusions={inclusions} 
                  exclusions={exclusions}
                  settings={settings}
                  isAcademicTour={isAcademicTour}
                  academicSchoolName={academicSchoolName}
                  academicTargetGroup={academicTargetGroup}
                  academicDurationText={academicDurationText}
                  academicTotalCost={academicTotalCost}
                  academicFinancialBreakdown={academicFinancialBreakdown}
                  isPreview={true}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-center border-t border-blue-100 dark:border-blue-900/30">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Tip: Highlights are automatically formatted into a responsive 2x2 grid structure in both print preview and PDF export.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
