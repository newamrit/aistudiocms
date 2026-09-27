import { useAuth, hasAccess } from '../contexts/AuthContext';
import { useFieldActivity } from '../contexts/FieldActivityContext';
import { useAlerts } from '../contexts/AlertContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import ThemeToggle from './ThemeToggle';
import DatabaseStatusBulbs from './DatabaseStatusBulbs';
import { UserRole } from '../types';
import {
  LayoutDashboard, CalendarPlus, CalendarDays, Map, Building2,
  Wallet, Users, LogOut, Mountain, ChevronLeft, ChevronRight, ChevronDown, Navigation, Activity, TrendingUp, Bell, Settings
} from 'lucide-react';
import { useState } from 'react';
import { sounds } from '../utils/sounds';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  subItems?: { id: string; label: string; roles: UserRole[] }[];
}

const navItems: NavItem[] = [
  { id: 'tour-leader-portal', label: 'Tour Leader Portal', icon: <Navigation size={20} />, roles: ['TOUR_OPERATOR'] },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['SUPER_ADMIN', 'SALES', 'OPERATIONS'] },
  { id: 'field-activity', label: 'Field Activity', icon: <Activity size={20} />, roles: ['SUPER_ADMIN'] },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={20} />, roles: ['SUPER_ADMIN', 'OPERATIONS'] },
  { 
    id: 'bookings-parent', 
    label: 'Bookings', 
    icon: <CalendarDays size={20} />, 
    roles: ['SUPER_ADMIN', 'SALES', 'OPERATIONS'],
    subItems: [
      { id: 'bookings', label: 'All Bookings', roles: ['SUPER_ADMIN', 'SALES', 'OPERATIONS'] },
      { id: 'new-booking', label: 'Add New', roles: ['SUPER_ADMIN', 'SALES'] },
    ]
  },
  { id: 'packages', label: 'Packages', icon: <Mountain size={20} />, roles: ['SUPER_ADMIN', 'SALES'] },
  { id: 'itinerary', label: 'Itinerary', icon: <Map size={20} />, roles: ['SUPER_ADMIN', 'SALES', 'OPERATIONS'] },
  { id: 'operations', label: 'Operations', icon: <Map size={20} />, roles: ['SUPER_ADMIN', 'OPERATIONS'] },
  { id: 'vendors', label: 'Vendors', icon: <Building2 size={20} />, roles: ['SUPER_ADMIN', 'OPERATIONS'] },
  { id: 'accounts-payable', label: 'Accounts Payable', icon: <Wallet size={20} />, roles: ['SUPER_ADMIN'] },
  { id: 'accounts-receivable', label: 'Accounts Receivable', icon: <TrendingUp size={20} />, roles: ['SUPER_ADMIN'] },
  { id: 'users', label: 'Users', icon: <Users size={20} />, roles: ['SUPER_ADMIN'] },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, roles: ['SUPER_ADMIN'] },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { settings } = useCompanySettings();
  const { getUnacknowledgedCount } = useFieldActivity();
  const { unreadCount: alertCount } = useAlerts();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['bookings-parent']);

  if (!user) return null;

  const toggleMenu = (id: string) => {
    sounds.click();
    setExpandedMenus(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const filteredNav = navItems.filter(item => hasAccess(user.role, item.roles));
  const unacknowledgedCount = getUnacknowledgedCount();

  const brandInitials = (settings?.companyName || 'Paila Nepal')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || 'PN';

  const getRoleBadge = (role: UserRole) => {
    const badges: Record<UserRole, string> = {
      SUPER_ADMIN: 'Admin',
      SALES: 'Sales',
      OPERATIONS: 'Ops Manager',
      TOUR_OPERATOR: 'Tour Leader'
    };
    return badges[role];
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-[#012871] to-[#011f58] text-white flex flex-col transition-all duration-300 no-print min-h-screen shadow-xl`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {settings?.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-xl bg-white border border-white/10 p-0.5 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-[#f35500] to-[#d94b00] rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-orange-500/20">
                {brandInitials}
              </div>
            )}
            {!collapsed && (
              <div className="animate-slide-in overflow-hidden">
                <h1 className="font-bold text-sm leading-tight truncate">{settings.companyName}</h1>
                <p className="text-[11px] text-blue-200">ERP & TravelCMS</p>
              </div>
            )}
          </div>
          {/* Alert Bell Icon */}
          {alertCount > 0 && (
            <button
              onClick={() => {
                sounds.notification();
                onNavigate('alerts');
              }}
              className="relative p-2 hover:bg-white/10 rounded-xl transition-colors"
              title={`${alertCount} unread alert${alertCount !== 1 ? 's' : ''}`}
            >
              <Bell size={20} className={alertCount > 0 ? 'text-[#f35500] animate-pulse' : 'text-blue-200'} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-lg">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
        {filteredNav.map(item => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenus.includes(item.id);
          const isActive = currentPage === item.id || (hasSubItems && item.subItems?.some(sub => sub.id === currentPage));

          return (
            <div key={item.id} className="mx-2 mb-1">
              <button
                onClick={() => {
                  if (hasSubItems) {
                    toggleMenu(item.id);
                    if (collapsed) setCollapsed(false);
                  } else {
                    sounds.click();
                    onNavigate(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl
                  ${(currentPage === item.id && !hasSubItems) || (isActive && hasSubItems && !isExpanded)
                    ? 'bg-white/15 text-white shadow-lg shadow-black/10 border-l-4 border-[#f35500]'
                    : 'text-blue-100 hover:bg-white/8 hover:text-white'
                  }`}
              >
                <span className="shrink-0 relative">
                  {item.icon}
                  {item.id === 'field-activity' && unacknowledgedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 font-medium">
                    <span className="animate-slide-in flex items-center gap-2">
                      {item.label}
                      {item.id === 'field-activity' && unacknowledgedCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {unacknowledgedCount}
                        </span>
                      )}
                    </span>
                    {hasSubItems && (
                      <span className="text-blue-300">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Sub Items */}
              {hasSubItems && isExpanded && !collapsed && (
                <div className="mt-1 ml-4 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {item.subItems?.filter(sub => hasAccess(user.role, sub.roles)).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        sounds.click();
                        onNavigate(sub.id);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] transition-all rounded-lg
                        ${currentPage === sub.id
                          ? 'bg-white/10 text-white font-bold'
                          : 'text-blue-200 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentPage === sub.id ? 'bg-[#f35500]' : 'bg-blue-400/40'}`} />
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Theme */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {!collapsed ? (
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-blue-200/70">Theme</span>
              <ThemeToggle variant="pill" showLabel={false} />
            </div>

            <div className="flex items-center gap-3 mb-2 p-2 rounded-xl bg-white/5">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[#f35500] to-[#d94b00] rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                  {(user?.name || 'User').split(' ').filter(Boolean).map(n => n[0]).join('') || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-blue-200">{getRoleBadge(user.role)}</p>
                  <DatabaseStatusBulbs compact theme="dark" />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                sounds.warning();
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
            >
              <LogOut size={14} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 flex flex-col items-center">
            <DatabaseStatusBulbs compact theme="dark" />
            <ThemeToggle variant="button" />
            <button onClick={() => { sounds.warning(); logout(); }} className="w-full flex justify-center py-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-paila-blue border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-paila-blue-light transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
