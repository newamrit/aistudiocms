import { useState } from 'react';
import { vendors as initialVendors } from '../data/mockData';
import { Vendor, VendorCategory, VehicleType } from '../types';
import { Search, Plus, Building2, Truck, UtensilsCrossed, Mountain, UserCheck, Edit, Phone, MapPin, X } from 'lucide-react';

const VEHICLE_TYPES: VehicleType[] = ['712 Bus', 'Super Bus', 'Tourist Bus', 'Scorpio', 'Bolero', 'Hiace', 'EV Hiace', 'Taxi'];

export default function Vendors() {
  const [vendorsList] = useState<Vendor[]>(initialVendors);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | 'ALL'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  // Form state for add vendor modal
  const [newVendorCategory, setNewVendorCategory] = useState<string>('');
  const [newVendorType, setNewVendorType] = useState<string>('');
  const [newVendorPlate, setNewVendorPlate] = useState<string>('');

  const filtered = vendorsList.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'HOTEL': return <Building2 size={18} className="text-blue-600" />;
      case 'VEHICLE': return <Truck size={18} className="text-green-600" />;
      case 'RESTAURANT': return <UtensilsCrossed size={18} className="text-orange-600" />;
      case 'ACTIVITY': return <Mountain size={18} className="text-purple-600" />;
      case 'GUIDE_PERMIT': return <UserCheck size={18} className="text-teal-600" />;
      default: return <Building2 size={18} className="text-slate-600" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'HOTEL': return 'bg-blue-100 text-blue-700';
      case 'VEHICLE': return 'bg-green-100 text-green-700';
      case 'RESTAURANT': return 'bg-orange-100 text-orange-700';
      case 'ACTIVITY': return 'bg-purple-100 text-purple-700';
      case 'GUIDE_PERMIT': return 'bg-teal-100 text-teal-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors Directory</h1>
          <p className="text-slate-500 text-sm mt-1">Manage hotels, restaurants, vehicles, activities & guides</p>
        </div>
        <button
          onClick={() => { setNewVendorCategory(''); setNewVendorType(''); setNewVendorPlate(''); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-paila-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { cat: 'HOTEL', label: 'Hotels', count: vendorsList.filter(v => v.category === 'HOTEL').length },
          { cat: 'RESTAURANT', label: 'Restaurants', count: vendorsList.filter(v => v.category === 'RESTAURANT').length },
          { cat: 'VEHICLE', label: 'Vehicles', count: vendorsList.filter(v => v.category === 'VEHICLE').length },
          { cat: 'ACTIVITY', label: 'Activities', count: vendorsList.filter(v => v.category === 'ACTIVITY').length },
          { cat: 'GUIDE_PERMIT', label: 'Guides', count: vendorsList.filter(v => v.category === 'GUIDE_PERMIT').length },
        ].map(item => (
          <button
            key={item.cat}
            onClick={() => setCategoryFilter(categoryFilter === item.cat as VendorCategory ? 'ALL' : item.cat as VendorCategory)}
            className={`p-3 rounded-xl border transition-all ${
              categoryFilter === item.cat ? 'border-paila-blue bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getCategoryIcon(item.cat)}
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{item.count}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors by name, location, or contact person..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(vendor => (
          <div key={vendor.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(vendor.category)}`}>
                  {getCategoryIcon(vendor.category)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{vendor.name}</h3>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${getCategoryColor(vendor.category)}`}>
                    {vendor.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendor(vendor)}
                className="p-1.5 text-slate-400 hover:text-paila-blue hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Edit size={14} />
              </button>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin size={12} className="text-slate-400" />
                <span>{vendor.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <UserCheck size={12} className="text-slate-400" />
                <span>{vendor.contactPerson}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone size={12} className="text-slate-400" />
                <span>{vendor.phone}</span>
              </div>
              {/* Vehicle-specific info */}
              {vendor.category === 'VEHICLE' && vendor.vehicleType && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Truck size={12} className="text-green-500" />
                  <span className="font-medium">{vendor.vehicleType}</span>
                </div>
              )}
              {vendor.category === 'VEHICLE' && vendor.plateNumber && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded tracking-wider">
                    {vendor.plateNumber}
                  </span>
                </div>
              )}
              {vendor.panVatNumber && (
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  PAN/VAT: {vendor.panVatNumber}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Vendor Details</h3>
              <button onClick={() => setSelectedVendor(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(selectedVendor.category)}`}>
                  {getCategoryIcon(selectedVendor.category)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedVendor.name}</p>
                  <p className="text-xs text-slate-500">{selectedVendor.category.replace('_', ' ')} • {selectedVendor.location}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Contact Person</p>
                  <p className="text-sm font-medium">{selectedVendor.contactPerson}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium">{selectedVendor.phone}</p>
                </div>
                {/* Vehicle-specific details */}
                {selectedVendor.category === 'VEHICLE' && (
                  <>
                    {selectedVendor.vehicleType && (
                      <div>
                        <p className="text-xs text-slate-500">Vehicle Type</p>
                        <p className="text-sm font-medium">{selectedVendor.vehicleType}</p>
                      </div>
                    )}
                    {selectedVendor.plateNumber && (
                      <div>
                        <p className="text-xs text-slate-500">Plate Number</p>
                        <p className="text-sm font-medium">
                          <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold rounded tracking-wider">
                            {selectedVendor.plateNumber}
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
                {selectedVendor.panVatNumber && (
                  <div>
                    <p className="text-xs text-slate-500">PAN/VAT Number</p>
                    <p className="text-sm font-medium">{selectedVendor.panVatNumber}</p>
                  </div>
                )}
                {selectedVendor.bankAccountDetails && (
                  <div>
                    <p className="text-xs text-slate-500">Bank Details</p>
                    <p className="text-sm font-medium">{selectedVendor.bankAccountDetails}</p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedVendor(null)}
              className="w-full mt-4 px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add New Vendor</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor Name *</label>
                  <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" placeholder="e.g., Hotel Mountain View" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
                  <select
                    value={newVendorCategory}
                    onChange={e => { setNewVendorCategory(e.target.value); setNewVendorType(''); setNewVendorPlate(''); }}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="HOTEL">Hotel / Resort</option>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="VEHICLE">Vehicle / Transport</option>
                    <option value="ACTIVITY">Activity Provider</option>
                    <option value="GUIDE_PERMIT">Guide / Permit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Location *</label>
                  <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" placeholder="e.g., Pokhara" />
                </div>

                {/* Vehicle-specific fields */}
                {newVendorCategory === 'VEHICLE' && (
                  <>
                    <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                      <Truck size={16} className="text-green-700 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-800">Vehicle Details Required</p>
                        <p className="text-[10px] text-green-700 mt-0.5">Please specify the vehicle type and plate number for transport vendors.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Vehicle Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newVendorType}
                        onChange={e => setNewVendorType(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                      >
                        <option value="">Select vehicle type...</option>
                        {VEHICLE_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Plate Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newVendorPlate}
                        onChange={e => setNewVendorPlate(e.target.value.toUpperCase())}
                        placeholder="e.g., Ba 2 Kha 5678"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Format: Province Code Zone Letter Number (e.g., Ba 2 Kha 5678)</p>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person</label>
                  <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
                  <input type="tel" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" placeholder="+977-..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">PAN/VAT Number</label>
                  <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Account Details</label>
                  <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" placeholder="Bank name, account number" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => { alert('Vendor added! (Demo)'); setShowAddModal(false); }} className="px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors">
                Add Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
