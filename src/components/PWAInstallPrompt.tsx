import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, Check, ArrowRight, ShieldCheck, WifiOff } from 'lucide-react';
import { sounds } from '../utils/sounds';

interface PWAInstallPromptProps {
  bannerVariant?: 'floating' | 'banner' | 'compact';
  onDismiss?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  bannerVariant = 'banner',
  onDismiss
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, hasNativePrompt, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed as PWA or user dismissed this banner session
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    sounds.click();
    if (hasNativePrompt) {
      const outcome = await install();
      if (outcome === 'accepted') {
        sounds.success();
        return;
      }
    }
    // If iOS or native prompt wasn't triggered, open guided instructions
    setShowGuideModal(true);
  };

  const handleCloseGuide = () => {
    sounds.click();
    setShowGuideModal(false);
  };

  const handleDismissBanner = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (bannerVariant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f35500] to-[#d94b00] hover:from-[#e04e00] hover:to-[#c44300] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all"
        >
          <Smartphone size={14} className="animate-bounce" />
          <span>Install Now</span>
        </button>

        {showGuideModal && <InstallGuideModal isIOS={isIOS} isAndroid={isAndroid} onClose={handleCloseGuide} />}
      </>
    );
  }

  return (
    <>
      {/* Top Banner on Mobile or Tour Leader Portal */}
      <div className="bg-gradient-to-r from-[#012871] via-[#013596] to-[#012871] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-blue-400/30 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#f35500]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* App Icon */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f35500] to-[#b33e00] flex items-center justify-center shrink-0 shadow-lg border border-white/20 p-2">
              <Smartphone size={22} className="text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Paila Leader App
                </h3>
                <span className="bg-[#f35500] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Mobile PWA
                </span>
              </div>
              <p className="text-xs text-blue-100/90 truncate mt-0.5">
                {isIOS ? 'Install on iPhone / iPad for offline tour guidance' : 'Install for instant field access & offline GPS'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-gradient-to-r from-[#f35500] to-[#d94b00] hover:from-[#e04e00] hover:to-[#c04200] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-orange-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Download size={15} className="animate-pulse" />
              <span>Install Now</span>
            </button>

            <button
              onClick={handleDismissBanner}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {showGuideModal && <InstallGuideModal isIOS={isIOS} isAndroid={isAndroid} onClose={handleCloseGuide} />}
    </>
  );
};

export interface InstallGuideModalProps {
  isIOS: boolean;
  isAndroid: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isIOS, isAndroid, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative animate-in slide-in-from-bottom-6 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f35500] to-[#b33e00] flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/20">
            <Smartphone size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Install Paila Leader App
            </h2>
            <p className="text-xs text-slate-400">
              {isIOS ? 'Add to iPhone / iPad Home Screen' : 'Download & Install for Android'}
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
            <WifiOff size={16} className="text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-200">Works 100% Offline</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
            <ShieldCheck size={16} className="text-paila-orange shrink-0" />
            <span className="text-[11px] font-medium text-slate-200">SOS Emergency Hub</span>
          </div>
        </div>

        {/* Step-by-step instructions based on OS */}
        {isIOS ? (
          <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/40">
                1
              </div>
              <div className="text-xs text-slate-200">
                Tap the <strong className="text-white inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded mx-1"><Share size={12} /> Share</strong> button in your Safari bottom toolbar.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/40">
                2
              </div>
              <div className="text-xs text-slate-200">
                Scroll down and tap <strong className="text-white inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded mx-1"><PlusSquare size={12} /> Add to Home Screen</strong>.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/40">
                3
              </div>
              <div className="text-xs text-slate-200">
                Tap <strong className="text-emerald-400 font-bold">Add</strong> in the top right corner. The app icon will be installed on your Home screen.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-600/30 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/40">
                1
              </div>
              <div className="text-xs text-slate-200">
                Tap the <strong className="text-white bg-slate-700 px-1.5 py-0.5 rounded mx-1">⋮ Menu</strong> button in Chrome / Browser top right.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-600/30 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/40">
                2
              </div>
              <div className="text-xs text-slate-200">
                Select <strong className="text-white inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded mx-1"><Download size={12} /> Install App</strong> or <strong>Add to Home Screen</strong>.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-600/30 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/40">
                3
              </div>
              <div className="text-xs text-slate-200">
                Confirm <strong className="text-emerald-400 font-bold">Install</strong>. Paila Leader will launch as a standalone mobile application.
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-[#012871] to-[#013f9c] hover:from-[#01205c] hover:to-[#013380] text-white font-bold text-sm rounded-xl border border-blue-400/30 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <Check size={16} />
          <span>Got It</span>
        </button>
      </div>
    </div>
  );
};
