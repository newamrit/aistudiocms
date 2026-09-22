import { useState } from 'react';
import { packages as initialPackages } from '../data/mockData';
import { Clock, DollarSign, X, Eye, Edit, Trash2, Plus, GripVertical, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { Package, ItineraryDay } from '../types';
import { sounds } from '../utils/sounds';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activePackage, setActivePackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState<Partial<Package>>({
    title: '',
    slug: '',
    durationDays: 1,
    durationNights: 0,
    standardPrice: 0,
    overview: '',
    inclusions: '',
    exclusions: '',
    category: 'Trekking',
    itineraryDays: []
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      durationDays: 1,
      durationNights: 0,
      standardPrice: 0,
      overview: '',
      inclusions: '',
      exclusions: '',
      category: 'Trekking',
      itineraryDays: []
    });
  };

  const openCreateModal = () => {
    resetForm();
    setActivePackage(null);
    setModalMode('create');
  };

  const openEditModal = (pkg: Package) => {
    setFormData({
      ...pkg,
      itineraryDays: pkg.itineraryDays || []
    });
    setActivePackage(pkg);
    setModalMode('edit');
  };

  const openViewModal = (pkg: Package) => {
    setActivePackage(pkg);
    setModalMode('view');
  };

  const handleSave = () => {
    if (!formData.title || !formData.slug) {
      alert('Please fill in required fields (Title and Slug)');
      return;
    }

    if (modalMode === 'create') {
      const newPkg: Package = {
        id: Math.max(...packages.map(p => p.id), 0) + 1,
        title: formData.title || '',
        slug: formData.slug || '',
        durationDays: formData.durationDays || 1,
        durationNights: formData.durationNights || 0,
        standardPrice: formData.standardPrice || 0,
        overview: formData.overview || '',
        inclusions: formData.inclusions || '',
        exclusions: formData.exclusions || '',
        category: formData.category || 'Trekking',
        itineraryDays: formData.itineraryDays || []
      };
      setPackages([...packages, newPkg]);
      sounds.success();
      alert('Package created successfully!');
    } else if (modalMode === 'edit' && activePackage) {
      setPackages(packages.map(p => p.id === activePackage.id ? { ...p, ...formData } as Package : p));
      sounds.success();
      alert('Package updated successfully!');
    }

    setModalMode(null);
    setActivePackage(null);
    resetForm();
  };

  const handleDelete = (id: number) => {
    setPackages(packages.filter(p => p.id !== id));
    sounds.delete();
    setShowDeleteConfirm(null);
  };

  // Itinerary management
  const addDay = () => {
    const newDay: ItineraryDay = {
      id: Date.now(),
      dayNumber: (formData.itineraryDays?.length || 0) + 1,
      title: '',
      description: '',
      overnightLocation: '',
      mealsIncluded: 'B, L, D'
    };
    setFormData({ ...formData, itineraryDays: [...(formData.itineraryDays || []), newDay] });
  };

  const updateDay = (id: number, field: keyof ItineraryDay, value: string | number) => {
    const updated = (formData.itineraryDays || []).map(d => d.id === id ? { ...d, [field]: value } : d);
    setFormData({ ...formData, itineraryDays: updated });
  };

  const removeDay = (id: number) => {
    const updated = (formData.itineraryDays || [])
      .filter(d => d.id !== id)
      .map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setFormData({ ...formData, itineraryDays: updated });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Trekking: 'bg-blue-100 text-blue-700',
      Tour: 'bg-green-100 text-green-700',
      Educational: 'bg-purple-100 text-purple-700',
      Cultural: 'bg-amber-100 text-amber-700',
      Adventure: 'bg-red-100 text-red-700',
      Wildlife: 'bg-emerald-100 text-emerald-700'
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Package Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Pre-built itineraries for quick booking creation</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-paila-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
        >
          <Plus size={16} />
          New Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
            <div className="h-2 bg-gradient-to-r from-paila-blue to-paila-orange" />

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getCategoryColor(pkg.category)}`}>
                  {pkg.category}
                </span>
                <span className="text-xs text-slate-400">#{pkg.id}</span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-paila-blue transition-colors">{pkg.title}</h3>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock size={12} /> {pkg.durationDays}D/{pkg.durationNights}N</span>
                <span className="flex items-center gap-1"><DollarSign size={12} /> NPR {pkg.standardPrice.toLocaleString()}/pax</span>
                {pkg.itineraryDays && pkg.itineraryDays.length > 0 && (
                  <span className="flex items-center gap-1 text-paila-blue">
                    <MapPin size={12} /> {pkg.itineraryDays.length} days
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-3 line-clamp-3">{pkg.overview}</p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Inclusions</p>
                <p className="text-xs text-slate-600 line-clamp-2">{pkg.inclusions}</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openViewModal(pkg)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                >
                  <Eye size={12} />
                  View
                </button>
                <button
                  onClick={() => openEditModal(pkg)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-paila-blue/10 text-paila-blue rounded-lg text-xs font-medium hover:bg-paila-blue/20 transition-colors"
                >
                  <Edit size={12} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(pkg.id)}
                  className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No packages yet. Create your first package!</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                {modalMode === 'create' ? 'Create New Package' : 'Edit Package'}
              </h3>
              <button onClick={() => { setModalMode(null); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Package Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Annapurna Base Camp Trek"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug *</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g., annapurna-base-camp-trek"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    >
                      <option value="Trekking">Trekking</option>
                      <option value="Tour">Tour</option>
                      <option value="Educational">Educational</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Wildlife">Wildlife</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Standard Price (NPR)</label>
                    <input
                      type="number"
                      value={formData.standardPrice}
                      onChange={e => setFormData({ ...formData, standardPrice: Number(e.target.value) })}
                      min="0"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (Days)</label>
                    <input
                      type="number"
                      value={formData.durationDays}
                      onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                      min="1"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (Nights)</label>
                    <input
                      type="number"
                      value={formData.durationNights}
                      onChange={e => setFormData({ ...formData, durationNights: Number(e.target.value) })}
                      min="0"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Description</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Overview</label>
                    <textarea
                      value={formData.overview}
                      onChange={e => setFormData({ ...formData, overview: e.target.value })}
                      rows={3}
                      placeholder="Brief description of the package..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Inclusions</label>
                    <textarea
                      value={formData.inclusions}
                      onChange={e => setFormData({ ...formData, inclusions: e.target.value })}
                      rows={2}
                      placeholder="What's included (comma-separated)..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Exclusions</label>
                    <textarea
                      value={formData.exclusions}
                      onChange={e => setFormData({ ...formData, exclusions: e.target.value })}
                      rows={2}
                      placeholder="What's not included (comma-separated)..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Itinerary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    Itinerary ({formData.itineraryDays?.length || 0} days)
                  </h4>
                  <button
                    onClick={addDay}
                    className="flex items-center gap-1 px-3 py-1.5 bg-paila-orange text-white rounded-lg text-xs font-semibold hover:bg-paila-orange-light transition-colors"
                  >
                    <Plus size={14} />
                    Add Day
                  </button>
                </div>

                {(formData.itineraryDays?.length || 0) === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 mb-3">No itinerary days added yet</p>
                    <button
                      onClick={addDay}
                      className="px-4 py-2 bg-paila-blue text-white rounded-lg text-xs font-medium hover:bg-paila-blue-light transition-colors"
                    >
                      Add First Day
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.itineraryDays?.map((day) => (
                      <div key={day.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <GripVertical size={14} className="text-slate-300" />
                            <div className="w-8 h-8 bg-paila-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {day.dayNumber}
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={day.title}
                                onChange={e => updateDay(day.id, 'title', e.target.value)}
                                placeholder={`Day ${day.dayNumber} title...`}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                              />
                              <button
                                onClick={() => removeDay(day.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <textarea
                              value={day.description}
                              onChange={e => updateDay(day.id, 'description', e.target.value)}
                              placeholder="Describe activities, route, highlights..."
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={day.overnightLocation}
                                onChange={e => updateDay(day.id, 'overnightLocation', e.target.value)}
                                placeholder="Overnight at..."
                                className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                              />
                              <input
                                type="text"
                                value={day.mealsIncluded}
                                onChange={e => updateDay(day.id, 'mealsIncluded', e.target.value)}
                                placeholder="Meals: B, L, D"
                                className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-3 border-t border-slate-100">
              <button
                onClick={() => { setModalMode(null); resetForm(); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
              >
                {modalMode === 'create' ? 'Create Package' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && activePackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{activePackage.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">#{activePackage.id} • {activePackage.slug}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Header info */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold uppercase">Category</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{activePackage.category}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold uppercase">Duration</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{activePackage.durationDays}D/{activePackage.durationNights}N</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold uppercase">Price/Pax</p>
                <p className="text-sm font-bold text-slate-900 mt-1">NPR {activePackage.standardPrice.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold uppercase">Itinerary</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{activePackage.itineraryDays?.length || 0} days</p>
              </div>
            </div>

            {/* Overview */}
            {activePackage.overview && (
              <div className="mb-5">
                <h4 className="text-sm font-bold text-slate-900 mb-2">Overview</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{activePackage.overview}</p>
              </div>
            )}

            {/* Inclusions / Exclusions */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <h4 className="text-sm font-bold text-green-700 mb-2">✓ Inclusions</h4>
                <ul className="text-xs text-slate-700 space-y-1">
                  {activePackage.inclusions.split(',').map((item, i) => item.trim() && (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-green-600">•</span>
                      <span>{item.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-700 mb-2">✗ Exclusions</h4>
                <ul className="text-xs text-slate-700 space-y-1">
                  {activePackage.exclusions.split(',').map((item, i) => item.trim() && (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-red-600">•</span>
                      <span>{item.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Itinerary */}
            {activePackage.itineraryDays && activePackage.itineraryDays.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-paila-blue" />
                  Day-by-Day Itinerary
                </h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-4">
                    {activePackage.itineraryDays.map((day) => (
                      <div key={day.id} className="relative pl-12">
                        <div className="absolute left-2 top-1 w-5 h-5 bg-paila-blue text-white rounded-full flex items-center justify-center text-[10px] font-bold z-10">
                          {day.dayNumber}
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <h5 className="text-sm font-bold text-slate-900">{day.title}</h5>
                          <p className="text-xs text-slate-600 mt-1">{day.description}</p>
                          <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                            {day.overnightLocation && (
                              <span className="flex items-center gap-0.5">
                                <MapPin size={10} className="text-paila-orange" /> {day.overnightLocation}
                              </span>
                            )}
                            <span>🍽️ {day.mealsIncluded}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!activePackage.itineraryDays || activePackage.itineraryDays.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No itinerary added yet</p>
                <button
                  onClick={() => {
                    setModalMode('edit');
                    setFormData({ ...activePackage, itineraryDays: activePackage.itineraryDays || [] });
                  }}
                  className="mt-3 px-4 py-2 bg-paila-blue text-white rounded-lg text-xs font-medium hover:bg-paila-blue-light transition-colors"
                >
                  Add Itinerary
                </button>
              </div>
            ) : null}

            <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-3 border-t border-slate-100">
              <button
                onClick={() => setModalMode(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => openEditModal(activePackage)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
              >
                <Edit size={14} />
                Edit Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Package</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{packages.find(p => p.id === showDeleteConfirm)?.title}</span>?
              This package will no longer be available for new bookings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
