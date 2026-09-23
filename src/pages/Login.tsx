import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActivities } from '../contexts/ActivityContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import ThemeToggle from '../components/ThemeToggle';
import { Mountain, Eye, EyeOff, LogIn, MapPin, Compass, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/sounds';

export default function Login() {
  const { login, usersList } = useAuth();
  const { settings } = useCompanySettings();
  const { logActivity } = useActivities();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sessionTimeoutNotice, setSessionTimeoutNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const timeoutMsg = localStorage.getItem('paila_session_timeout_msg');
      if (timeoutMsg) {
        setSessionTimeoutNotice(timeoutMsg);
        localStorage.removeItem('paila_session_timeout_msg');
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      if (!result.success) {
        sounds.error();
        setError(result.error || 'Invalid credentials. Please verify your email and password from the database.');
        setLoading(false);
      } else {
        sounds.success();
        setSuccess(true);
        
        const loggedInUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (loggedInUser) {
          logActivity({
            type: 'USER_LOGIN',
            category: 'LOGIN',
            title: `${loggedInUser.name} Logged In`,
            description: `Authenticated into system with ${loggedInUser.role.replace('_', ' ')} privileges.`,
            actor: {
              name: loggedInUser.name,
              email: loggedInUser.email,
              role: loggedInUser.role,
            },
            metadata: {
              details: `Device: Web Browser • Time: ${new Date().toLocaleTimeString()}`,
            },
          });
        }
        setTimeout(() => setLoading(false), 500);
      }
    } catch {
      sounds.error();
      setError('Unable to reach authentication server. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-amber-50 dark:from-slate-950 dark:via-[#091122] dark:to-[#060c18] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Floating Theme Switcher - Hidden on mobile devices */}
      <div className="hidden sm:flex absolute top-4 right-4 z-50 items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Theme:</span>
        <ThemeToggle variant="pill" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200/80 via-sky-100/50 to-amber-50/40 dark:from-slate-950 dark:via-[#0c162c] dark:to-[#060d1d] transition-colors" />
        
        {/* Prayer Flags - Top */}
        <div className={`absolute top-0 left-0 right-0 z-0 h-14 sm:h-18 overflow-hidden pointer-events-none transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
          <svg viewBox="0 0 1440 90" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="flagBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </linearGradient>
              <linearGradient id="flagWhite" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e5e7eb" />
              </linearGradient>
              <linearGradient id="flagRed" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
              <linearGradient id="flagGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="flagYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a16207" />
              </linearGradient>
            </defs>
            {/* String */}
            <path d="M0,10 Q360,28 720,14 T1440,18" stroke="#64748b" strokeWidth="1.5" fill="none" opacity="0.6" />
            {/* Flags */}
            {[...Array(24)].map((_, i) => {
              const x = i * 60;
              const y = 8 + Math.sin(i * 0.5) * 6;
              const colors = ['flagBlue', 'flagWhite', 'flagRed', 'flagGreen', 'flagYellow'];
              const color = colors[i % 5];
              return (
                <g key={i} className="animate-flag-wave" style={{ animationDelay: `${i * 0.1}s` }}>
                  <rect x={x} y={y} width="40" height="42" fill={`url(#${color})`} opacity="0.9" rx="2" />
                  <text x={x + 20} y={y + 26} textAnchor="middle" fill="rgba(0,0,0,0.25)" fontSize="7" fontFamily="serif">
                    ॐ
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Buddha's Eyes - Top Right */}
        <div className={`absolute top-20 right-10 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <svg width="120" height="120" viewBox="0 0 120 120" className="animate-float">
            <defs>
              <linearGradient id="eyeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Stupa base */}
            <path d="M60,110 L40,90 L80,90 Z" fill="url(#eyeGold)" />
            <rect x="45" y="70" width="30" height="20" fill="url(#eyeGold)" />
            {/* Eyes */}
            <g transform="translate(60, 50)">
              {/* Left eye */}
              <ellipse cx="-12" cy="0" rx="10" ry="14" fill="white" stroke="#1e293b" strokeWidth="2" />
              <circle cx="-12" cy="2" r="6" fill="#1e293b" />
              <circle cx="-10" cy="0" r="2" fill="white" />
              {/* Right eye */}
              <ellipse cx="12" cy="0" rx="10" ry="14" fill="white" stroke="#1e293b" strokeWidth="2" />
              <circle cx="12" cy="2" r="6" fill="#1e293b" />
              <circle cx="14" cy="0" r="2" fill="white" />
              {/* Nose (question mark in Nepali) */}
              <path d="M0,18 Q-3,22 0,26 Q3,22 0,18" fill="#1e293b" />
              {/* Third eye */}
              <circle cx="0" cy="-8" r="3" fill="#dc2626" />
            </g>
          </svg>
        </div>

        {/* Mountains with Temples */}
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <svg viewBox="0 0 1440 500" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mountain1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id="mountain2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="templeGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            
            {/* Back mountains */}
            <path d="M0,500 L0,350 L200,250 L400,300 L600,200 L800,280 L1000,180 L1200,260 L1440,220 L1440,500 Z" fill="url(#mountain2)" opacity="0.6" />
            
            {/* Swayambhunath (Monkey Temple) - Left */}
            <g transform="translate(200, 280)">
              {/* Hill */}
              <ellipse cx="0" cy="50" rx="80" ry="40" fill="url(#mountain1)" />
              {/* Stupa */}
              <rect x="-20" y="10" width="40" height="30" fill="white" />
              <path d="M-25,10 L0,-20 L25,10 Z" fill="url(#templeGold)" />
              {/* Spire */}
              <rect x="-3" y="-40" width="6" height="20" fill="url(#templeGold)" />
              {/* Eyes */}
              <circle cx="-8" cy="20" r="3" fill="#1e293b" />
              <circle cx="8" cy="20" r="3" fill="#1e293b" />
            </g>

            {/* Front mountains */}
            <path d="M0,500 L0,400 L300,350 L600,380 L900,340 L1200,370 L1440,350 L1440,500 Z" fill="url(#mountain1)" opacity="0.8" />

            {/* Boudhanath Stupa - Center */}
            <g transform="translate(720, 320)">
              {/* Base platform */}
              <rect x="-60" y="40" width="120" height="20" fill="#d4d4d8" />
              <rect x="-50" y="30" width="100" height="10" fill="#e5e7eb" />
              {/* Dome */}
              <ellipse cx="0" cy="10" rx="45" ry="35" fill="white" />
              {/* Harmika (square base with eyes) */}
              <rect x="-20" y="-25" width="40" height="35" fill="url(#templeGold)" />
              {/* Eyes on harmika */}
              <circle cx="-8" cy="-10" r="4" fill="white" />
              <circle cx="-8" cy="-10" r="2" fill="#1e293b" />
              <circle cx="8" cy="-10" r="4" fill="white" />
              <circle cx="8" cy="-10" r="2" fill="#1e293b" />
              {/* Spire */}
              <path d="M-15,-25 L0,-60 L15,-25 Z" fill="url(#templeGold)" />
              {/* Rings on spire */}
              {[...Array(8)].map((_, i) => (
                <rect key={i} x="-12" y={-55 + i * 4} width="24" height="2" fill="#92400e" opacity="0.6" />
              ))}
              {/* Umbrella top */}
              <circle cx="0" cy="-65" r="8" fill="url(#templeGold)" />
            </g>

            {/* Pashupatinath Temple - Right */}
            <g transform="translate(1100, 340)">
              {/* Platform */}
              <rect x="-50" y="30" width="100" height="15" fill="#a8a29e" />
              {/* Main temple body */}
              <rect x="-35" y="0" width="70" height="30" fill="#d4d4d8" />
              {/* Pagoda roofs */}
              <path d="M-45,0 L0,-30 L45,0 Z" fill="#78350f" />
              <path d="M-35,-25 L0,-50 L35,-25 Z" fill="#92400e" />
              <path d="M-25,-45 L0,-65 L25,-45 Z" fill="#a16207" />
              {/* Golden pinnacle */}
              <rect x="-3" y="-75" width="6" height="10" fill="url(#templeGold)" />
              <circle cx="0" cy="-80" r="5" fill="url(#templeGold)" />
              {/* Doors */}
              <rect x="-10" y="10" width="20" height="20" fill="#44403c" rx="2" />
            </g>

            {/* River (Bagmati) */}
            <path d="M0,450 Q360,440 720,450 T1440,445 L1440,500 L0,500 Z" fill="#60a5fa" opacity="0.4" />
          </svg>
        </div>

        {/* Floating clouds */}
        <div className="absolute top-32 left-20 animate-cloud-drift">
          <svg width="100" height="40" viewBox="0 0 100 40">
            <ellipse cx="30" cy="20" rx="25" ry="15" fill="white" opacity="0.6" />
            <ellipse cx="50" cy="18" rx="30" ry="18" fill="white" opacity="0.6" />
            <ellipse cx="70" cy="22" rx="20" ry="12" fill="white" opacity="0.6" />
          </svg>
        </div>
        <div className="absolute top-48 right-40 animate-cloud-drift-slow">
          <svg width="80" height="30" viewBox="0 0 80 30">
            <ellipse cx="25" cy="15" rx="20" ry="12" fill="white" opacity="0.5" />
            <ellipse cx="45" cy="13" rx="25" ry="15" fill="white" opacity="0.5" />
            <ellipse cx="60" cy="17" rx="15" ry="10" fill="white" opacity="0.5" />
          </svg>
        </div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between px-12 pb-12 pt-24 xl:pt-28">
        {/* Logo */}
        <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-paila-orange to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-paila-orange/30 shrink-0">
              <Mountain className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {settings.companyName || 'Paila Nepal Holidays Pvt. Ltd.'}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 tracking-wide">
                {settings.tagline || 'Trekking • Mountaineering • Institutional Excursions'}
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          <div className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-5xl font-bold text-slate-900 dark:text-white leading-tight">
              Namaste!
              <span className="block mt-2 bg-gradient-to-r from-paila-orange via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Welcome Home
              </span>
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 mt-4 max-w-md leading-relaxed">
              Enterprise travel management system for Nepal's premier trekking and tour operations.
            </p>
          </div>

          {/* Feature cards */}
          <div className={`space-y-3 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              { icon: <Compass size={18} />, title: 'Smart Itineraries', desc: 'Build day-by-day tour plans' },
              { icon: <Users size={18} />, title: 'Team Collaboration', desc: 'Real-time field updates' },
              { icon: <MapPin size={18} />, title: 'Vendor Network', desc: '200+ verified partners' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-lg transition-all duration-300 group cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-paila-orange/20 to-paila-orange/5 border border-paila-orange/30 flex items-center justify-center text-paila-orange group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{feature.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <span>🏔️ Kathmandu, Nepal</span>
            <span>•</span>
            <span>Est. 2015</span>
            <span>•</span>
            <span>v2.0.0</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 pt-20 lg:pt-6 relative z-10">
        <div className={`w-full max-w-md transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-paila-orange to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-paila-orange/30 shrink-0">
              <Mountain className="text-white" size={24} />
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {settings.companyName || 'Paila Nepal Holidays Pvt. Ltd.'}
              </h1>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                {settings.tagline || 'Trekking • Mountaineering • Institutional Excursions'}
              </p>
            </div>
          </div>

          {/* Glass card */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-paila-orange/20 via-sky-400/20 to-amber-400/20 rounded-3xl blur-xl opacity-60" />
            
            <div className="relative bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-slate-700/60 shadow-2xl p-6 md:p-8">
              {/* Success state */}
              {success ? (
                <div className="text-center py-12 animate-fade-in">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-success-pulse">
                    <CheckCircle2 size={48} className="text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back!</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-base">Redirecting to your dashboard...</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">Sign in</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-base mt-2">Access your TravelCMS dashboard</p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {sessionTimeoutNotice && (
                      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                        <span className="text-base leading-none mt-0.5">⏱️</span>
                        <div>
                          <strong className="font-bold block text-amber-800 dark:text-amber-200">Session Expired</strong>
                          <span>{sessionTimeoutNotice}</span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-shake flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        {error}
                      </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@pailanepal.com"
                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-paila-orange/50 focus:border-paila-orange outline-none transition-all text-sm font-medium shadow-2xs"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-4 py-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-paila-orange/50 focus:border-paila-orange outline-none transition-all text-sm font-medium pr-12 shadow-2xs"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember & Forgot */}
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-paila-orange focus:ring-paila-orange/50 dark:bg-slate-800" />
                        <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-medium">Remember me</span>
                      </label>
                      <span className="text-paila-orange hover:text-paila-orange-light font-medium cursor-pointer">
                        Forgot password?
                      </span>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative w-full group overflow-hidden rounded-xl mt-4 cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-paila-orange to-orange-600 transition-all duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-paila-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center justify-center gap-2 py-3.5 text-white font-bold text-sm md:text-base">
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <LogIn size={18} />
                            <span>Sign In</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </div>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-slate-500 mt-6">
            Protected by enterprise-grade security • © 2026 Paila Nepal Holidays
          </p>
        </div>
      </div>
    </div>
  );
}
