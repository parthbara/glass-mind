import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, ChevronDown, ChevronUp, BrainCircuit, Monitor,
  Cpu, MemoryStick, Battery, Clock
} from 'lucide-react';
import { safelyParseInt, getActivityIcon, getDeviceIcon, formatTime } from './helpers';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

// Mock Data
// Demo/placeholder data -- no real personal location or identifying info.
// The phone coordinate below is a public landmark (Kathmandu Durbar Square), used
// only so the map widget has something to render in the demo build.
const INITIAL_DEVICES = [
  { id: 'desktop-main', name: 'Home PC', type: 'desktop', online: true, lastSeen: new Date(), status: 'coding', activeWindow: 'VS Code - GlassMind/src/App.jsx', windowCount: 8, cpu: 32, memory: 67, location: null },
  { id: 'laptop-work', name: 'Work Laptop', type: 'laptop', online: false, lastSeen: new Date(Date.now() - 3600000), status: 'offline', activeWindow: null, windowCount: 0, cpu: 0, memory: 0, location: null },
  { id: 'phone-android', name: 'Phone', type: 'phone', online: true, lastSeen: new Date(), status: 'idle', activeWindow: null, windowCount: 0, cpu: 12, memory: 45, battery: 78, signal: 4, network: '5G', location: { lat: 27.7045, lng: 85.307 } }
];

// Demo/placeholder data -- generic example projects, no real client or family details.
const INITIAL_NODES = [
  { id: 'root', label: 'Roadmap', status: 'active', type: 'root', x: 400, y: 50, children: ['p1', 'p2', 'p3'] },
  { id: 'p1', label: 'Retail POS Build', translatedLabel: 'Client point-of-sale system', status: 'active', type: 'project', progress: 45, x: 150, y: 200, children: ['t1', 't2'] },
  { id: 'p2', label: 'Education App', translatedLabel: 'Android TV learning prototype', status: 'stopped', type: 'project', progress: 10, x: 400, y: 200, children: [] },
  { id: 'p3', label: 'IT Support Queue', translatedLabel: 'General infrastructure tasks', status: 'active', type: 'project', progress: 80, x: 650, y: 200, children: ['t3'] },
  { id: 't1', label: 'Auth System Fix', translatedLabel: 'Fixing the login screen', status: 'done', type: 'task', x: 50, y: 350, children: [] },
  { id: 't2', label: 'Inventory Schema', translatedLabel: 'Organizing product data', status: 'active', type: 'task', x: 250, y: 350, children: [] },
  { id: 't3', label: 'Printer Drivers', translatedLabel: 'Fixing a networked printer', status: 'active', type: 'task', x: 650, y: 350, children: [] }
];

const MOCK_CONTEXT = { p1: 'Client-facing POS build -- billing, inventory, and reporting in one system.', p2: 'Exploring a TV-first UI for an education app concept.', p3: 'General IT support and infrastructure tasks.' };

// Components
const TrafficLight = ({ windowCount, online }) => {
  let color = '#10b981', label = 'Light', pulse = 'pulse-green';
  if (!online) { color = '#64748b'; label = 'Offline'; pulse = ''; }
  else if (windowCount >= 7) { color = '#f43f5e'; label = 'Heavy'; pulse = 'pulse-rose'; }
  else if (windowCount >= 3) { color = '#f59e0b'; label = 'Busy'; pulse = 'pulse-amber'; }
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="traffic-light" style={{ '--glow-color': color }}>
      <div className={`traffic-light-orb ${pulse}`} style={{ background: color }}><Activity size={24} /></div>
      <div className="traffic-light-info"><span className="traffic-light-count">{windowCount}</span><span className="traffic-light-label">{label}</span></div>
    </motion.div>
  );
};

const DeviceSelector = ({ devices, selectedId, onSelect }) => (
  <div className="device-selector">
    <h3 className="device-selector-title"><Monitor size={16} />Active Devices</h3>
    <div className="device-list">
      {devices.map(d => {
        const Icon = getDeviceIcon(d.type); return (
          <motion.button key={d.id} onClick={() => onSelect(d.id)} className={`device-item ${d.id === selectedId ? 'selected' : ''}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <div className="device-icon-wrap"><Icon size={20} /><span className={`device-status-dot ${d.online ? 'online' : 'offline'}`} /></div>
            <div className="device-info"><span className="device-name">{d.name}</span><span className="device-last-seen">{d.online ? 'Online' : formatTime(d.lastSeen)}</span></div>
          </motion.button>
        );
      })}
    </div>
  </div>
);

const LiveStatusCard = ({ device }) => {
  const [showDetails, setShowDetails] = useState(false);
  const titles = { coding: 'Deep in Code', music: 'Vibing to Music', gaming: 'Gaming Session', 'gaming-valorant': 'Gaming Session : Valorant', browsing: 'Browsing Web', break: 'Taking a Break', idle: 'Available', offline: 'Offline', working: 'Working', communicating: 'Communicating' };
  return (
    <motion.div className="live-status-card glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header Status */}
      <div className="live-status-header">
        <div className="live-status-icon">{React.createElement(getActivityIcon(device.status), { size: 28 })}</div>
        <div className="live-status-info">
          <span className="live-status-label">Current Focus</span>
          <h2 className="live-status-title">{!device.online ? 'Offline' : (titles[device.status] || 'Unknown')}</h2>

          <div className="live-status-meta">
            <span className="live-status-subtitle">{device.name}</span>
            {device.battery !== undefined && (
              <span className="meta-badge battery">
                <Battery size={10} className={safelyParseInt(device.battery) < 20 ? 'low' : ''} />
                {safelyParseInt(device.battery)}%
              </span>
            )}
            {device.online && device.cpu !== undefined && (
              <span className="meta-badge cpu">
                <Cpu size={10} />
                {safelyParseInt(device.cpu)}%
              </span>
            )}
            {device.online && device.memory !== undefined && (
              <span className="meta-badge memory">
                <MemoryStick size={10} />
                {safelyParseInt(device.memory)}%
              </span>
            )}
            <span className="meta-badge time">
              <Clock size={10} />
              {formatTime(device.lastSeen)}
            </span>
          </div>
        </div>
        {device.online && (
          <button className="btn btn-ghost btn-icon" aria-label={showDetails ? 'Hide device details' : 'Show device details'} aria-expanded={showDetails} onClick={() => setShowDetails(!showDetails)}>{showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
        )}
      </div>

      {/* Details - Only show if online */}
      <AnimatePresence>
        {showDetails && device.online && (
          <motion.div className="live-status-details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {device.activeWindow && (
              <>
                <div className="detail-row"><BrainCircuit size={14} /><span className="detail-label">Active Window</span></div>
                <p className="detail-window">{device.activeWindow}</p>
              </>
            )}
            <div className="detail-stats">
              {device.cpu !== undefined && <div className="stat-item"><Cpu size={14} /><span>{safelyParseInt(device.cpu)}% CPU</span></div>}
              {device.memory !== undefined && <div className="stat-item"><MemoryStick size={14} /><span>{safelyParseInt(device.memory)}% RAM</span></div>}
              <div className="stat-item"><Monitor size={14} /><span>{device.windowCount} Windows</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Stats Placeholder if needed (like image 2) - BUT NOT FOR PHONES */}
      {!device.online && device.type !== 'phone' && (
        <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className="stat-item"><Cpu size={14} /><span>0% CPU</span></div>
          <div className="stat-item"><MemoryStick size={14} /><span>0% RAM</span></div>
          <div className="stat-item"><Monitor size={14} /><span>0 Windows</span></div>
        </div>
      )}

    </motion.div>
  );
};

export { INITIAL_DEVICES, INITIAL_NODES, MOCK_CONTEXT, TrafficLight, DeviceSelector, LiveStatusCard };
