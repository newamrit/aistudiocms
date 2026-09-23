import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FieldActivityProvider, useFieldActivity } from './contexts/FieldActivityContext';
import { BookingProvider } from './contexts/BookingContext';
import { PackageProvider } from './contexts/PackageContext';
import { VendorProvider } from './contexts/VendorContext';
import { OperationsProvider } from './contexts/OperationsContext';
import { AlertProvider, useAlerts } from './contexts/AlertContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { CompanySettingsProvider, useCompanySettings } from './contexts/CompanySettingsContext';
import { BackupProvider } from './contexts/BackupContext';
import ThemeToggle from './components/ThemeToggle';
import DatabaseStatusBulbs from './components/DatabaseStatusBulbs';
import { SessionTimeoutModal } from './components/SessionTimeoutModal';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import NewBooking from './pages/NewBooking';
import BookingDetail from './pages/BookingDetail';
import Operations from './pages/Operations';
import Vendors from './pages/Vendors';
import AccountsPayable from './pages/AccountsPayable';
import AccountsReceivable from './pages/AccountsReceivable';
import Packages from './pages/Packages';
import UsersPage from './pages/Users';
import TourLeaderPortal from './pages/TourLeaderPortal';
import FieldActivity from './pages/FieldActivity';
import Alerts from './pages/Alerts';
import SettingsPage from './pages/Settings';
import { Settings as SettingsIcon, AlertTriangle, AlertCircle, ArrowRight, X, Compass, MapPin } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const { settings } = useCompanySettings();
  const { latestIncomingAlert, clearLatestIncomingAlert } = useAlerts();
  const { latestIncomingActivity, clearLatestIncomingActivity } = useFieldActivity();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  // Inactivity session timeout management (15 minutes)
  const { showWarningModal, secondsRemaining, extendSession, logoutNow } = useSessionTimeout();

  // Auto-dismiss activity toast after 10s
  useEffect(() => {
    if (latestIncomingActivity) {
      const timer = setTimeout(() => {
        clearLatestIncomingActivity();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [latestIncomingActivity, clearLatestIncomingActivity]);

  // Set the correct page based on user role when user changes (login/logout)
  useEffect(() => {
    if (user) {
      // User just logged in - set appropriate default page
      if (user.role === 'TOUR_OPERATOR') {
        setCurrentPage('tour-leader-portal');
      } else {
        setCurrentPage('dashboard');
      }
    } else {
      // User logged out - reset to dashboard
      setCurrentPage('dashboard');
    }
  }, [user]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (page: string, id?: number) => {
    if (isTourLeader) {
      setCurrentPage('tour-leader-portal');
      return;
    }
    setCurrentPage(page);
    if (id !== undefined) {
      setSelectedBookingId(id);
    }
  };

  const renderPage = () => {
    if (isTourLeader) {
      return <TourLeaderPortal />;
    }
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'bookings':
        return <Bookings onNavigate={handleNavigate} />;
      case 'new-booking':
        return <NewBooking onNavigate={handleNavigate} />;
      case 'booking-detail':
        return selectedBookingId ? <BookingDetail bookingId={selectedBookingId} onNavigate={handleNavigate} /> : <Bookings onNavigate={handleNavigate} />;
      case 'operations':
        return <Operations />;
      case 'vendors':
        return <Vendors />;
      case 'accounts-payable':
        return <AccountsPayable />;
      case 'accounts-receivable':
        return <AccountsReceivable />;
      case 'packages':
        return <Packages />;
      case 'users':
        return <UsersPage />;
      case 'tour-leader-portal':
        return <TourLeaderPortal />;
      case 'field-activity':
        return <FieldActivity />;
      case 'alerts':
        return <Alerts />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      default:
        return <Dashboard />;
    }
  };

  const isTourLeader = user?.role === 'TOUR_OPERATOR';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {!isTourLeader && <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />}
      <main className="flex-1 overflow-auto relative">
        {/* Real-Time Live Emergency Alert Toast for Admin & Ops */}
        {!isTourLeader && latestIncomingAlert && (
          <div className="fixed top-4 right-6 z-50 max-w-md w-full bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border-2 border-red-500/80 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                {latestIncomingAlert.severity === 'CRITICAL' ? (
                  <AlertCircle size={22} className="animate-pulse" />
                ) : (
                  <AlertTriangle size={22} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                    latestIncomingAlert.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                  }`}>
                    {latestIncomingAlert.severity} ALERT
                  </span>
                  <span className="text-xs text-slate-400">Live from Field</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{latestIncomingAlert.title}</h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{latestIncomingAlert.description}</p>
                <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                  <span>Leader: <strong className="text-slate-200">{latestIncomingAlert.tour_leader_name || 'Tour Leader'}</strong></span>
                  {latestIncomingAlert.booking_code && (
                    <span>• {latestIncomingAlert.booking_code}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      handleNavigate('alerts');
                      clearLatestIncomingAlert();
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-lg shadow-red-900/30"
                  >
                    View in Alerts <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={clearLatestIncomingAlert}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={clearLatestIncomingAlert}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Real-Time Live Daily Update / Field Activity Toast for Admin & Ops */}
        {!isTourLeader && !latestIncomingAlert && latestIncomingActivity && (
          <div className="fixed top-4 right-6 z-50 max-w-md w-full bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-500/80 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/30">
                {latestIncomingActivity.type === 'CHECK_IN' ? (
                  <Compass size={22} className="animate-spin-slow text-emerald-400" />
                ) : (
                  <MapPin size={22} className="text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-500 text-slate-950">
                    {latestIncomingActivity.type === 'CHECK_IN' ? 'DAILY UPDATE' : 'FIELD ACTIVITY'}
                  </span>
                  <span className="text-xs text-slate-400">Live Checkpoint</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{latestIncomingActivity.title}</h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{latestIncomingActivity.description}</p>
                <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                  <span>Leader: <strong className="text-slate-200">{latestIncomingActivity.tourLeaderName}</strong></span>
                  {latestIncomingActivity.bookingCode && (
                    <span>• {latestIncomingActivity.bookingCode}</span>
                  )}
                  {latestIncomingActivity.metadata?.weather && (
                    <span>• {latestIncomingActivity.metadata.weather}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      handleNavigate('field-activity');
                      clearLatestIncomingActivity();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-lg shadow-emerald-900/30"
                  >
                    View in Field Activity <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={clearLatestIncomingActivity}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={clearLatestIncomingActivity}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Top Bar - Hidden for Tour Leaders */}
        {!isTourLeader && (
          <header className="bg-white dark:bg-[#111c30] border-b border-slate-200 dark:border-[#22324b] px-6 py-3 flex items-center justify-between no-print sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                {currentPage === 'accounts-payable' ? 'Accounts Payable' :
                 currentPage === 'accounts-receivable' ? 'Accounts Receivable' :
                 currentPage === 'field-activity' ? 'Field Activity Monitor' :
                 currentPage === 'settings' ? 'Company & System Settings' :
                 currentPage.replace(/-/g, ' ')}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Database & Sync Status Glowing Bulbs */}
              <DatabaseStatusBulbs />

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

              {/* Quick Settings Shortcut for Super Admin */}
              {user?.role === 'SUPER_ADMIN' && currentPage !== 'settings' && (
                <button
                  onClick={() => handleNavigate('settings')}
                  className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-paila-blue dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Configure Company Name, PAN/VAT, Domain, Phone & Address"
                >
                  <SettingsIcon size={13} />
                  Settings
                </button>
              )}

              {/* Theme Selector Toggle */}
              <ThemeToggle variant="dropdown" />
              
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              
              <span className="text-xs text-slate-400 hidden sm:inline">{settings.companyName} © {new Date().getFullYear()}</span>
            </div>
          </header>
        )}
        
        {/* Page Content */}
        <div className={isTourLeader ? 'min-h-screen' : 'min-h-[calc(100vh-52px)]'}>
          {renderPage()}
        </div>

        {/* 15-Minute Inactivity Session Timeout Warning & Countdown Modal */}
        <SessionTimeoutModal
          isOpen={showWarningModal}
          secondsRemaining={secondsRemaining}
          onExtend={extendSession}
          onLogout={logoutNow}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CompanySettingsProvider>
          <ActivityProvider>
            <FieldActivityProvider>
              <BookingProvider>
                <PackageProvider>
                  <VendorProvider>
                    <OperationsProvider>
                      <AlertProvider>
                        <BackupProvider>
                          <AppContent />
                        </BackupProvider>
                      </AlertProvider>
                    </OperationsProvider>
                  </VendorProvider>
                </PackageProvider>
              </BookingProvider>
            </FieldActivityProvider>
          </ActivityProvider>
        </CompanySettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
