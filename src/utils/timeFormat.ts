/**
 * Format timestamp to Nepal Local Time (NPT - UTC+5:45)
 */
export const formatNepalTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  
  // Nepal is UTC+5:45
  const nepalOffset = 5 * 60 + 45; // in minutes
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const nepalTime = new Date(utc + (nepalOffset * 60000));
  
  // Format: "Jan 15, 2026, 2:30 PM"
  return nepalTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format timestamp to show relative time (e.g., "2 hours ago", "Just now")
 */
export const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatNepalTime(timestamp);
};

/**
 * Get current Nepal time
 */
export const getCurrentNepalTime = (): string => {
  return formatNepalTime(new Date().toISOString());
};
