// Shared helpers used by core.jsx and widgets.jsx.
// These live outside the component modules so React Fast Refresh keeps working --
// a module that exports components should not also export plain functions.
import {
  Activity, Code, Music, Globe, Coffee, Gamepad2, MessageSquare,
  Monitor, Laptop, Smartphone, WifiOff
} from 'lucide-react';

export const safelyParseInt = (val) => {
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'string') {
    // Remove non-numeric chars mostly for safety (keep points if float)
    const num = parseFloat(val.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num);
  }
  return 0;
};

export const getActivityIcon = (s) => ({ coding: Code, music: Music, gaming: Gamepad2, 'gaming-valorant': Gamepad2, browsing: Globe, break: Coffee, idle: Activity, offline: WifiOff, working: Activity, communicating: MessageSquare }[s] || Activity);

export const getDeviceIcon = (t) => ({ desktop: Monitor, laptop: Laptop, phone: Smartphone }[t] || Monitor);

export const formatTime = (d) => {
  if (!d) return 'Unknown';
  // Handle numeric string timestamp
  if (typeof d === 'string' && /^\d+$/.test(d)) {
    d = parseInt(d, 10);
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return 'Unknown';

  const diff = Date.now() - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};
