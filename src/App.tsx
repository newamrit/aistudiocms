import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FieldActivityProvider } from './contexts/FieldActivityContext';
import { BookingProvider } from './contexts/BookingContext';
import { AlertProvider } from './contexts/AlertContext';
import { ActivityProvider } from './contexts/ActivityContext';
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

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

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
    setCurrentPage(page);
    if (id !== undefined) {
      setSelectedBookingId(id);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
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
      default:
        return <Dashboard />;
    }
  };

  const isTourLeader = user?.role === 'TOUR_OPERATOR';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!isTourLeader && <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />}
      <main className="flex-1 overflow-auto">
        {/* Top Bar - Hidden for Tour Leaders */}
        {!isTourLeader && (
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between no-print sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700 capitalize">
                {currentPage === 'accounts-payable' ? 'Accounts Payable' :
                 currentPage === 'accounts-receivable' ? 'Accounts Receivable' :
                 currentPage === 'field-activity' ? 'Field Activity Monitor' :
                 currentPage.replace(/-/g, ' ')}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Paila Nepal Holidays © 2026</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="System Online" />
            </div>
          </header>
        )}
        
        {/* Page Content */}
        <div className={isTourLeader ? 'min-h-screen' : 'min-h-[calc(100vh-52px)]'}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ActivityProvider>
        <FieldActivityProvider>
          <BookingProvider>
            <AlertProvider>
              <AppContent />
            </AlertProvider>
          </BookingProvider>
        </FieldActivityProvider>
      </ActivityProvider>
    </AuthProvider>
  );
}
