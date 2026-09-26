import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react';
import { sounds } from '../utils/sounds';

export default function VolumeControl() {
  const [volume, setVolume] = useState(sounds.getVolume());
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [showSlider, setShowSlider] = useState(false);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    sounds.setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      sounds.setMuted(false);
    }
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    sounds.setMuted(newMuteState);
    sounds.click();
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={16} className="text-red-500" />;
    if (volume < 0.3) return <Volume size={16} className="text-slate-500 dark:text-slate-400" />;
    if (volume < 0.7) return <Volume1 size={16} className="text-slate-600 dark:text-slate-300" />;
    return <Volume2 size={16} className="text-paila-blue" />;
  };

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        onClick={toggleMute}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isMuted ? "Unmute system sounds" : "Mute system sounds"}
      >
        {getVolumeIcon()}
      </button>

      {showSlider && (
        <div className="absolute top-full right-0 mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200 min-w-[140px]">
          <span className="text-[10px] font-bold text-slate-400 w-6">{Math.round(volume * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-paila-blue"
          />
        </div>
      )}
    </div>
  );
}
