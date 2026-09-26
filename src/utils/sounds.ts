// Sound utility using Web Audio API - no external files needed

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.5;
  private muted: boolean = false;

  constructor() {
    // Try to initialize audio context
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Load initial state from localStorage
        const storedVolume = localStorage.getItem('paila_system_volume');
        if (storedVolume !== null) {
          this.masterVolume = parseFloat(storedVolume);
        }
        
        const storedMute = localStorage.getItem('paila_system_muted');
        if (storedMute !== null) {
          this.muted = storedMute === 'true';
        }
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.audioContext || !this.enabled || this.muted) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const finalVolume = volume * this.masterVolume;
      gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Error playing sound:', e);
    }
  }

  // Success sound - ascending notes
  success() {
    this.playTone(523.25, 0.1, 'sine', 0.2); // C5
    setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.2), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.2), 200); // G5
  }

  // Click sound - short beep
  click() {
    this.playTone(800, 0.05, 'square', 0.1);
  }

  // Tab switch sound
  tabSwitch() {
    this.playTone(600, 0.04, 'sine', 0.08);
  }

  // Notification sound - two quick beeps
  notification() {
    this.playTone(880, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(880, 0.08, 'sine', 0.15), 150);
  }

  // Warning sound - descending
  warning() {
    this.playTone(440, 0.1, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(330, 0.15, 'sawtooth', 0.15), 100);
  }

  // Error sound - low buzz
  error() {
    this.playTone(220, 0.2, 'sawtooth', 0.2);
  }

  // Cash register sound - cha-ching
  cashRegister() {
    this.playTone(1046.5, 0.05, 'sine', 0.2); // C6
    setTimeout(() => this.playTone(1318.5, 0.05, 'sine', 0.2), 50); // E6
    setTimeout(() => this.playTone(1568, 0.1, 'sine', 0.25), 100); // G6
  }

  // Toggle on sound
  toggleOn() {
    this.playTone(600, 0.05, 'sine', 0.15);
    setTimeout(() => this.playTone(800, 0.05, 'sine', 0.15), 50);
  }

  // Toggle off sound
  toggleOff() {
    this.playTone(800, 0.05, 'sine', 0.15);
    setTimeout(() => this.playTone(600, 0.05, 'sine', 0.15), 50);
  }

  // Delete sound
  delete() {
    this.playTone(400, 0.1, 'square', 0.15);
    setTimeout(() => this.playTone(300, 0.15, 'square', 0.15), 100);
  }

  // Modal open sound
  modalOpen() {
    this.playTone(500, 0.08, 'sine', 0.1);
  }

  // Modal close sound
  modalClose() {
    this.playTone(400, 0.08, 'sine', 0.1);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('paila_system_volume', this.masterVolume.toString());
  }

  getVolume() {
    return this.masterVolume;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem('paila_system_muted', this.muted.toString());
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

// Export singleton instance
export const sounds = new SoundManager();
