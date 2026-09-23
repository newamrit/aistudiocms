import { useState } from 'react';
import { useVendors } from '../contexts/VendorContext';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { Vendor, VendorCategory, VehicleType } from '../types';
import { 
  Search, Plus, Building2, Truck, UtensilsCrossed, Mountain, 
  UserCheck, Edit, Phone, MapPin, X, CheckCircle, CreditCard, 
  FileText, Trash2, Check, AlertCircle, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { sounds } from '../utils/sounds';

const VEHICLE_TYPES: VehicleType[] = ['712 Bus', 'Super Bus', 'Tourist Bus', 'Scorpio', 'Bolero', 'Hiace', 'EV Hiace', 'Taxi'];

interface VendorFormData {
  id?: number;
  name: string;
  category: VendorCategory | '';
  location: string;
  contactPerson: string;
  phone: string;
  panVatNumber: string;
  bankAccountDetails: string;
  vehicleType?: VehicleType | '';
  plateNumber?: string;
  isActive: boolean;
}

const emptyForm: VendorFormData = {
  name: '',
  category: '',
  location: '',
  contactPerson: '',
  phone: '',
  panVatNumber: '',
  bankAccountDetails: '',
  vehicleType: '',
  plateNumber: '',
  isActive: true,
};

// Phone regex: allows international + prefix, spaces, dashes, parentheses and 7-15 digits
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
// Nepali PAN/VAT format: 9 numeric digits
const PAN_REGEX = /^\d{9}$/;

export default function Vendors() {
  const { vendors, isLoading, error, addVendor, updateVendor, deleteVendor } = useVendors();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filtered = Array.from(
    new Map(
      vendors
        .filter(v => {
          const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.location.toLowerCase().includes(search.toLowerCase()) ||
            v.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
            (v.plateNumber && v.plateNumber.toLowerCase().includes(search.toLowerCase()));
          const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
          return matchesSearch && matchesCategory;
        })
        .map(v => [v.id, v])
    ).values()
  );

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'HOTEL': return <Building2 size={18} className="text-blue-600 dark:text-blue-400" />;
      case 'VEHICLE': return <Truck size={18} className="text-emerald-600 dark:text-emerald-400" />;
      case 'RESTAURANT': return <UtensilsCrossed size={18} className="text-orange-600 dark:text-orange-400" />;
      case 'ACTIVITY': return <Mountain size={18} className="text-purple-600 dark:text-purple-400" />;
      case 'GUIDE_PERMIT': return <UserCheck size={18} className="text-teal-600 dark:text-teal-400" />;
      default: return <Building2 size={18} className="text-slate-600 dark:text-slate-400" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'HOTEL': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
      case 'VEHICLE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'RESTAURANT': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300';
      case 'ACTIVITY': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
      case 'GUIDE_PERMIT': return 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const handleOpenAddModal = () => {
    setEditingVendorId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setTouchedFields({});
    setShowModal(true);
  };

  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setFormData({
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      location: vendor.location,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      panVatNumber: vendor.panVatNumber || '',
      bankAccountDetails: vendor.bankAccountDetails || '',
      vehicleType: vendor.vehicleType || '',
      plateNumber: vendor.plateNumber || '',
      isActive: vendor.isActive,
    });
    setFormErrors({});
    setTouchedFields({});
    setSelectedVendor(null);
    setShowModal(true);
  };

  const validateField = (name: keyof VendorFormData, value: any, currentData: VendorFormData): string => {
    switch (name) {
      case 'name':
        if (!value || !value.toString().trim()) {
          return 'Vendor / Business name is required.';
        }
        if (value.toString().trim().length < 2) {
          return 'Vendor name must be at least 2 characters long.';
        }
        return '';

      case 'category':
        if (!value) {
          return 'Please select a vendor category.';
        }
        return '';

      case 'location':
        if (!value || !value.toString().trim()) {
          return 'Location / Destination is required.';
        }
        if (value.toString().trim().length < 2) {
          return 'Location must be at least 2 characters long.';
        }
        return '';

      case 'phone':
        if (!value || !value.toString().trim()) {
          return 'Primary phone number is required.';
        }
        const cleanedPhone = value.toString().trim();
        const digitsCount = cleanedPhone.replace(/\D/g, '').length;
        if (digitsCount < 7) {
          return 'Phone number must contain at least 7 digits.';
        }
        if (!PHONE_REGEX.test(cleanedPhone)) {
          return 'Please enter a valid phone number (e.g., +977-9841234567 or 01-4700123).';
        }
        return '';

      case 'vehicleType':
        if (currentData.category === 'VEHICLE' && (!value || !value.toString().trim())) {
          return 'Vehicle category requires selecting a vehicle type.';
        }
        return '';

      case 'plateNumber':
        if (currentData.category === 'VEHICLE') {
          if (!value || !value.toString().trim()) {
            return 'License plate / registration number is required for transport vendors.';
          }
          if (value.toString().trim().length < 3) {
            return 'Plate number must be at least 3 characters (e.g. Ba 2 Kha 5678).';
          }
        }
        return '';

      case 'panVatNumber':
        if (value && value.toString().trim()) {
          const trimmedPan = value.toString().trim();
          if (!PAN_REGEX.test(trimmedPan)) {
            return 'PAN/VAT should be a 9-digit number (e.g., 601234567).';
          }
        }
        return '';

      case 'contactPerson':
        if (value && value.toString().trim().length > 0 && value.toString().trim().length < 2) {
          return 'Contact person name should be at least 2 characters.';
        }
        return '';

      default:
        return '';
    }
  };

  const handleFieldChange = (field: keyof VendorFormData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    // Live validation if the field was already touched
    if (touchedFields[field]) {
      const errorMsg = validateField(field, value, updatedData);
      setFormErrors(prev => ({
        ...prev,
        [field]: errorMsg,
      }));
    }
  };

  const handleFieldBlur = (field: keyof VendorFormData) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field], formData);
    setFormErrors(prev => ({
      ...prev,
      [field]: errorMsg,
    }));
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};

    (Object.keys(formData) as Array<keyof VendorFormData>).forEach(key => {
      touched[key] = true;
      const err = validateField(key, formData[key], formData);
      if (err) {
        errors[key] = err;
      }
    });

    setTouchedFields(touched);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      sounds.warning();
      return;
    }

    if (editingVendorId) {
      // Update existing vendor
      const updatedVendor: Vendor = {
        id: editingVendorId,
        name: formData.name.trim(),
        category: formData.category as VendorCategory,
        location: formData.location.trim(),
        contactPerson: formData.contactPerson.trim() || 'N/A',
        phone: formData.phone.trim(),
        panVatNumber: formData.panVatNumber.trim(),
        bankAccountDetails: formData.bankAccountDetails.trim(),
        isActive: formData.isActive,
        ...(formData.category === 'VEHICLE' ? {
          vehicleType: formData.vehicleType as VehicleType,
          plateNumber: formData.plateNumber?.trim().toUpperCase(),
        } : {}),
      };

      await updateVendor(editingVendorId, updatedVendor);
      sounds.success();
      showToast(`Vendor "${updatedVendor.name}" updated successfully!`);
    } else {
      const newVendor = await addVendor({
        name: formData.name.trim(),
        category: formData.category as VendorCategory,
        location: formData.location.trim(),
        contactPerson: formData.contactPerson.trim() || 'N/A',
        phone: formData.phone.trim(),
        panVatNumber: formData.panVatNumber.trim(),
        bankAccountDetails: formData.bankAccountDetails.trim(),
        isActive: true,
        ...(formData.category === 'VEHICLE' ? {
          vehicleType: formData.vehicleType as VehicleType,
          plateNumber: formData.plateNumber?.trim().toUpperCase(),
        } : {}),
      });

      sounds.success();
      showToast(`Vendor "${newVendor.name}" added successfully!`);
    }

    setShowModal(false);
  };

  const handleDeleteVendor = async (vendorId: number) => {
    const vendorToDelete = vendors.find(v => v.id === vendorId);
    if (!vendorToDelete) return;
    
    await deleteVendor(vendorId);
    setSelectedVendor(null);
    sounds.click();
    showToast(`Vendor "${vendorToDelete.name}" removed.`);
  };

  const hasFormErrors = Object.values(formErrors).some(err => Boolean(err));

  return (
    <div className="p-6 animate-fade-in max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vendors Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage hotels, restaurants, vehicles, activities & tour guides</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-paila-blue hover:bg-paila-blue-light text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          Add Vendor
        </button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { cat: 'HOTEL', label: 'Hotels', count: vendors.filter(v => v.category === 'HOTEL').length },
          { cat: 'RESTAURANT', label: 'Restaurants', count: vendors.filter(v => v.category === 'RESTAURANT').length },
          { cat: 'VEHICLE', label: 'Vehicles', count: vendors.filter(v => v.category === 'VEHICLE').length },
          { cat: 'ACTIVITY', label: 'Activities', count: vendors.filter(v => v.category === 'ACTIVITY').length },
          { cat: 'GUIDE_PERMIT', label: 'Guides', count: vendors.filter(v => v.category === 'GUIDE_PERMIT').length },
        ].map(item => (
          <button
            key={item.cat}
            onClick={() => setCategoryFilter(categoryFilter === item.cat as VendorCategory ? 'ALL' : item.cat as VendorCategory)}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              categoryFilter === item.cat 
                ? 'border-paila-blue bg-blue-50/70 dark:bg-blue-950/40 shadow-sm ring-1 ring-paila-blue' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {getCategoryIcon(item.cat)}
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.count}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors by name, location, contact person, or vehicle plate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none transition-all"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={vendors.length === 0 ? "No Vendors in Database" : "No Vendors Found"}
          description={
            vendors.length === 0
              ? "Your vendor directory is empty. Click below to register your first partner hotel, vehicle supplier, or guide."
              : "No vendors match your search filters. Try adjusting your search query or category filter."
          }
          actionText={vendors.length === 0 ? "Add New Vendor" : undefined}
          onAction={vendors.length === 0 ? handleOpenAddModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(vendor => (
            <div key={vendor.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${getCategoryColor(vendor.category)}`}>
                      {getCategoryIcon(vendor.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{vendor.name}</h3>
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full mt-0.5 ${getCategoryColor(vendor.category)}`}>
                        {vendor.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(vendor)}
                      title="Edit Vendor"
                      className="p-1.5 text-slate-400 hover:text-paila-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVendor(vendor)}
                      title="View Details"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold"
                    >
                      View
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{vendor.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <UserCheck size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{vendor.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <a href={`tel:${vendor.phone}`} className="text-paila-blue dark:text-blue-400 font-medium hover:underline truncate">
                      {vendor.phone}
                    </a>
                  </div>
                  
                  {/* Vehicle-specific info */}
                  {vendor.category === 'VEHICLE' && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {vendor.vehicleType && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold rounded-md">
                          <Truck size={12} className="text-emerald-600 dark:text-emerald-400" />
                          {vendor.vehicleType}
                        </span>
                      )}
                      {vendor.plateNumber && (
                        <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded tracking-wider">
                          {vendor.plateNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {vendor.panVatNumber && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>PAN/VAT: {vendor.panVatNumber}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vendor Details</h3>
              <button onClick={() => setSelectedVendor(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getCategoryColor(selectedVendor.category)}`}>
                  {getCategoryIcon(selectedVendor.category)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-base">{selectedVendor.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{selectedVendor.category.replace('_', ' ')} • {selectedVendor.location}</p>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl p-4 space-y-3 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Contact Person</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVendor.contactPerson}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Phone</span>
                  <a href={`tel:${selectedVendor.phone}`} className="font-bold text-paila-blue dark:text-blue-400 hover:underline">
                    {selectedVendor.phone}
                  </a>
                </div>
                {/* Vehicle details */}
                {selectedVendor.category === 'VEHICLE' && (
                  <>
                    {selectedVendor.vehicleType && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Vehicle Type</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVendor.vehicleType}</span>
                      </div>
                    )}
                    {selectedVendor.plateNumber && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Plate Number</span>
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold rounded text-[11px]">
                          {selectedVendor.plateNumber}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {selectedVendor.panVatNumber && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">PAN / VAT</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedVendor.panVatNumber}</span>
                  </div>
                )}
                {selectedVendor.bankAccountDetails && (
                  <div className="py-1">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Bank Account</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 block">
                      {selectedVendor.bankAccountDetails}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedVendor)}
                className="flex-1 py-2.5 bg-paila-blue hover:bg-paila-blue-light text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={14} /> Edit Vendor
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVendor(selectedVendor.id)}
                className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors"
                title="Delete Vendor"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-scale-up my-8 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-paila-blue/10 dark:bg-blue-950 flex items-center justify-center text-paila-blue dark:text-blue-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingVendorId ? 'Edit Vendor Profile' : 'Register New Vendor'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Please provide verified vendor and operational payment info</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Summary Banner */}
            {hasFormErrors && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fade-in">
                <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Please correct the highlighted fields before submitting:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                    {Object.entries(formErrors).map(([key, err]) => (
                      err ? <li key={key}>{err}</li> : null
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitVendor} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendor Name */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Vendor / Business Name <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Min. 2 chars</span>
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="e.g., Hotel Lake Star, Pokhara Luxury Transport"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${
                      touchedFields.name && formErrors.name 
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 focus:ring-rose-200 focus:border-rose-500' 
                        : touchedFields.name && !formErrors.name && formData.name.trim()
                        ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 focus:ring-emerald-200 focus:border-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  />
                  {touchedFields.name && formErrors.name && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => {
                      const newCat = e.target.value as VendorCategory;
                      handleFieldChange('category', newCat);
                      if (newCat !== 'VEHICLE') {
                        setFormErrors(prev => ({ ...prev, vehicleType: '', plateNumber: '' }));
                      }
                    }}
                    onBlur={() => handleFieldBlur('category')}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 outline-none transition-all ${
                      touchedFields.category && formErrors.category 
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 focus:ring-rose-200' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  >
                    <option value="">Select category...</option>
                    <option value="HOTEL">🏢 Hotel / Resort</option>
                    <option value="RESTAURANT">🍽️ Restaurant / Dining</option>
                    <option value="VEHICLE">🚐 Vehicle / Transport</option>
                    <option value="ACTIVITY">🏔️ Activity / Adventure</option>
                    <option value="GUIDE_PERMIT">👤 Guide / Permit Agency</option>
                    <option value="OTHER">📦 Other Supplier</option>
                  </select>
                  {touchedFields.category && formErrors.category && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.category}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location / Region <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => handleFieldChange('location', e.target.value)}
                    onBlur={() => handleFieldBlur('location')}
                    placeholder="e.g., Lakeside, Pokhara or Thamel, KTM"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${
                      touchedFields.location && formErrors.location 
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 focus:ring-rose-200' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  />
                  {touchedFields.location && formErrors.location && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.location}
                    </p>
                  )}
                </div>

                {/* Vehicle-specific fields */}
                {formData.category === 'VEHICLE' && (
                  <div className="sm:col-span-2 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
                        <Truck size={16} className="text-emerald-700 dark:text-emerald-400" />
                        Vehicle & Fleet Specifications
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Required for dispatch</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                          Vehicle Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.vehicleType || ''}
                          onChange={e => handleFieldChange('vehicleType', e.target.value as VehicleType)}
                          onBlur={() => handleFieldBlur('vehicleType')}
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-semibold focus:ring-2 outline-none ${
                            touchedFields.vehicleType && formErrors.vehicleType 
                              ? 'border-rose-400 bg-rose-50/50' 
                              : 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500/20'
                          }`}
                        >
                          <option value="">Select vehicle model...</option>
                          {VEHICLE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        {touchedFields.vehicleType && formErrors.vehicleType && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">{formErrors.vehicleType}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                          Plate / Registration Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.plateNumber || ''}
                          onChange={e => handleFieldChange('plateNumber', e.target.value.toUpperCase())}
                          onBlur={() => handleFieldBlur('plateNumber')}
                          placeholder="e.g., Ba 2 Kha 5678"
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 outline-none ${
                            touchedFields.plateNumber && formErrors.plateNumber 
                              ? 'border-rose-400 bg-rose-50/50' 
                              : 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500/20'
                          }`}
                        />
                        {touchedFields.plateNumber && formErrors.plateNumber && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">{formErrors.plateNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Person */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Contact Person</label>
                    <span className="text-[10px] text-slate-400">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => handleFieldChange('contactPerson', e.target.value)}
                    onBlur={() => handleFieldBlur('contactPerson')}
                    placeholder="e.g., Ram Bahadur Thapa"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white outline-none transition-all"
                  />
                  {touchedFields.contactPerson && formErrors.contactPerson && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.contactPerson}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Mobile / Landline</span>
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="+977-98XXXXXXXX or 01-XXXXXXX"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${
                      touchedFields.phone && formErrors.phone 
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 focus:ring-rose-200' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  />
                  {touchedFields.phone && formErrors.phone && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* PAN / VAT */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      PAN / VAT Number
                    </label>
                    <span className="text-[10px] text-slate-400">9 digits for official billing</span>
                  </div>
                  <input
                    type="text"
                    maxLength={9}
                    value={formData.panVatNumber}
                    onChange={e => {
                      const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 9);
                      handleFieldChange('panVatNumber', numericOnly);
                    }}
                    onBlur={() => handleFieldBlur('panVatNumber')}
                    placeholder="e.g., 601234567"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono focus:ring-2 outline-none transition-all ${
                      touchedFields.panVatNumber && formErrors.panVatNumber 
                        ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 focus:ring-rose-200' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  />
                  {touchedFields.panVatNumber && formErrors.panVatNumber ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.panVatNumber}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Required for VAT invoicing & TDS accounts reconciliation
                    </p>
                  )}
                </div>

                {/* Bank Account Details */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Account Settlement Details
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountDetails}
                    onChange={e => handleFieldChange('bankAccountDetails', e.target.value)}
                    placeholder="e.g., Nabil Bank, Lakeside Branch, A/C: 08701234567890 (A/C Name)"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Used by Accounts team for direct EFT payouts
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-paila-blue hover:bg-paila-blue-light text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Check size={16} />
                  {editingVendorId ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
