import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, Sparkles, Plus, Trash2, Save, Printer, 
  MapPin, Clock, ChevronDown, ChevronUp, Copy, Wand2,
  FileText, ArrowRight, CheckCircle2, AlertCircle, Info,
  Search, Mountain, Compass, Map, Download, Upload, FileJson, RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePackages } from '../contexts/PackageContext';
import { sounds } from '../utils/sounds';

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

// Pre-defined destination templates for automatic builder
const DESTINATION_TEMPLATES = [
  {
    id: 'abc',
    name: 'Annapurna Base Camp',
    category: 'Trekking',
    baseDuration: 11,
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
  
  // State
  const [builderMode, setItineraryBuilderMode] = useState<'manual' | 'automatic' | 'library'>('automatic');
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [itineraryTitle, setItineraryTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inclusions, setInclusions] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Library Handlers
  const handleLoadFromLibrary = (pkg: any) => {
    sounds.success();
    setItineraryTitle(pkg.title);
    setInclusions(pkg.inclusions || '');
    setExclusions(pkg.exclusions || '');
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

  // Manual Handlers
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

    // Re-index
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
    
    // Re-index
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
    setItineraryTitle(template.name);
    const generatedDays: ItineraryDay[] = template.days.map((d, i) => ({
      id: `${template.id}-${i}-${Date.now()}`,
      dayNumber: i + 1,
      title: d.title,
      description: d.description,
      overnightLocation: d.overnight,
      mealsIncluded: d.meals
    }));

    setDays(generatedDays);
    setItineraryBuilderMode('manual'); // Switch to manual after applying to allow editing
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
      
      // Save as a new package
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
        inclusions,
        exclusions,
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
      
      // Sanitise filename
      const safeName = (itineraryTitle || 'itinerary').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      link.href = url;
      link.download = `${safeName}.json`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Wait a moment before cleanup to ensure trigger
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
    // Reset input
    e.target.value = '';
  };

  const handlePrintPDF = () => {
    try {
      if (days.length === 0) {
        sounds.error();
        alert('Please add at least one day or generate an itinerary to export as PDF.');
        return;
      }
      
      sounds.click();
      
      // Focus window and wait a moment for any UI interactions to settle
      window.focus();
      
      setTimeout(() => {
        if (typeof window.print === 'function') {
          window.print();
        } else {
          alert('Print service is not available in this browser environment.');
        }
      }, 250);
    } catch (e) {
      console.error('Print error:', e);
      alert('Could not trigger print dialog. Please try using a different browser.');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative">
      {/* Print-Only Full Itinerary Content (Optimised for PDF Export) */}
      <div className="hidden print:block space-y-8 print-container">
        {/* PDF Print Header */}
        <div className="mb-8 border-b-2 border-paila-blue pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-paila-blue tracking-tighter">PAILA NEPAL</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Tours & Travels Pvt. Ltd.</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold text-slate-900 uppercase">Itinerary Proposal</h2>
              <p className="text-[10px] text-slate-500 font-medium">Ref: PN-ITIN-{Date.now().toString().slice(-6)}</p>
              <p className="text-[10px] text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-900">{itineraryTitle || 'Untitled Itinerary'}</h2>
          <p className="text-sm text-slate-500 mt-1">{days.length} Days Program Overview</p>
        </div>
        
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.id} className="avoid-break border-l-2 border-paila-blue pl-6 py-2">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-800">Day {day.dayNumber}: {day.title}</h3>
                <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded uppercase tracking-wider">
                  {day.overnightLocation}
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{day.description}</p>
              <div className="mt-2 flex gap-4 text-[10px] font-bold text-paila-blue uppercase">
                <span>Meals: {day.mealsIncluded}</span>
              </div>
            </div>
          ))}
        </div>

        {(inclusions || exclusions) && (
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-100">
            {inclusions && (
              <div className="avoid-break">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b pb-2">Includes</h3>
                <div className="text-xs text-slate-600 space-y-1 whitespace-pre-wrap leading-relaxed">
                  {inclusions}
                </div>
              </div>
            )}
            {exclusions && (
              <div className="avoid-break">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b pb-2">Excludes</h3>
                <div className="text-xs text-slate-600 space-y-1 whitespace-pre-wrap leading-relaxed">
                  {exclusions}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111c30] p-6 rounded-2xl border border-slate-200 dark:border-[#22324b] shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue flex items-center justify-center">
            <Map size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Itinerary Builder</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Design tour roadmaps and save as reusable packages</p>
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
              Export JSON
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-paila-blue/10 hover:bg-paila-blue/20 text-paila-blue dark:text-blue-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Printer size={14} />
              Export PDF
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
                    onClick={() => { sounds.click(); setSelectedTemplateId(template.id); }}
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
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">Professional pre-built roadmap for {template.name}.</p>
                    
                    <div className={`absolute bottom-0 left-0 h-1 bg-paila-blue transition-all duration-300 ${
                      selectedTemplateId === template.id ? 'w-full' : 'w-0'
                    }`}></div>
                  </button>
                ))}
              </div>

              {selectedTemplateId && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Generating a <strong>{DESTINATION_TEMPLATES.find(t => t.id === selectedTemplateId)?.baseDuration} day</strong> itinerary for {DESTINATION_TEMPLATES.find(t => t.id === selectedTemplateId)?.name}
                    </p>
                    <button
                      onClick={handleApplyTemplate}
                      className="px-6 py-2.5 bg-paila-blue text-white rounded-xl text-xs font-bold shadow-lg hover:bg-paila-blue-light transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Wand2 size={14} />
                      Generate Itinerary
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] shadow-2xs overflow-hidden">
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
                  title="Clear all days"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {days.length === 0 ? (
                  <div className="py-20 text-center space-y-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
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
          {/* Preview Card */}
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
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{days.length} Day Program</p>
                </div>

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

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-[#012871] to-[#011f58] rounded-2xl p-6 text-white shadow-lg space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Info size={16} />
              Pro Tips
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></div>
                <p className="text-[11px] text-blue-100">Use templates to save 90% time on common routes.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></div>
                <p className="text-[11px] text-blue-100">Overnight stays appear in the guest voucher auto-generation.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></div>
                <p className="text-[11px] text-blue-100">Click "Add Day" anywhere in the list to insert days in sequence.</p>
              </div>
            </div>
            <hr className="border-white/10" />
            <button
              onClick={() => { sounds.click(); setItineraryBuilderMode('automatic'); setSelectedTemplateId(''); setDays([]); }}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
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
      {/* PDF Print Footer (Only visible in Print) */}
      <div className="hidden print:block mt-12 pt-4 border-t border-slate-200">
        <div className="flex justify-between items-end">
          <div className="text-[9px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Paila Nepal Tours & Travels Pvt. Ltd.</p>
            <p>Kathmandu, Nepal | +977-1-XXXXXXX | info@pailanepal.com.np</p>
            <p>www.pailanepal.com.np</p>
          </div>
          <div className="text-right text-[9px] text-slate-400 italic">
            This itinerary is a proposal and subject to availability at the time of booking.
          </div>
        </div>
      </div>
    </div>
  );
}
