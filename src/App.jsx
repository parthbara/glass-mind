import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, Eye, Heart, Sun, Moon } from 'lucide-react';
import { INITIAL_DEVICES, INITIAL_NODES, MOCK_CONTEXT, TrafficLight, DeviceSelector, LiveStatusCard } from './components/core';
import { ChatWidget, MapWidget, ProjectCard } from './components/widgets';
import { MindMapCanvas, AdminSidebar } from './components/admin';
import './App.css';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || '';
// Demo builds (no Firebase env vars set) run fully client-side -- no network calls, nothing to sync.
const DEMO_MODE = !import.meta.env.VITE_FIREBASE_API_KEY;



class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#ffebee' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (APP_PASSWORD && password === APP_PASSWORD) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="login-screen">
      <motion.div
        className="login-card glass-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="login-icon"><BrainCircuit size={48} /></div>
        <h1 className="login-title">Glass Mind</h1>
        <p className="login-subtitle">Syncing thoughts...</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Access Code"
            className={`login-input ${error ? 'error' : ''}`}
            autoFocus
          />
          <button type="submit" className="login-btn">
            Access System
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!APP_PASSWORD) return true; // no password configured -- login screen disabled
    return localStorage.getItem('glass_auth') === 'true';
  });

  const handleLogin = () => {
    localStorage.setItem('glass_auth', 'true');
    setIsAuthenticated(true);
  };

  return (
    <ErrorBoundary>
      {isAuthenticated ? <AppContent /> : <LoginScreen onLogin={handleLogin} />}
    </ErrorBoundary>
  );
}

function AppContent() {
  const [viewMode, setViewMode] = useState('partner');
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState('desktop-main');
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [activeNodeId, setActiveNodeId] = useState('t2');
  const [dmMessages, setDmMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Update 'now' every 5 seconds to check online status
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Demo mode: simulate light activity locally so the dashboard feels alive, with zero network calls.
  useEffect(() => {
    if (!DEMO_MODE) return;
    const tick = setInterval(() => {
      setDevices(prev => prev.map(d => d.id === 'desktop-main'
        ? { ...d, lastSeen: new Date(), cpu: Math.max(15, Math.min(85, d.cpu + (Math.random() * 10 - 5))), memory: Math.max(30, Math.min(90, d.memory + (Math.random() * 6 - 3))) }
        : d));
    }, 4000);
    return () => clearInterval(tick);
  }, []);

  // Sync devices and nodes from Firebase (skipped entirely in demo mode)
  useEffect(() => {
    if (DEMO_MODE) return;
    import('./firebase').then(({ syncDevices, syncNodes, saveNodes, syncMessages }) => {
      try {
        // Devices Sync
        syncDevices((data) => {
          if (data && data.length > 0) {
            setDevices(prev => {
              const newDevices = [...prev];
              data.forEach(d => {
                const idx = newDevices.findIndex(od => od.id === d.id);
                if (idx >= 0) newDevices[idx] = { ...newDevices[idx], ...d };
                else newDevices.push(d);
              });
              return newDevices;
            });
          }
        });

        // Nodes Sync
        syncNodes((data) => {
          if (data && data.length > 0) {
            // Sanitize: Firebase drops empty arrays, so we must restore children: []
            const sanitizedData = data.map(n => ({ ...n, children: n.children || [] }));
            setNodes(sanitizedData);
          } else {
            // If DB is empty, initialize it with our default nodes
            saveNodes(INITIAL_NODES);
          }
        });

        // Messages Sync
        syncMessages((data) => {
          setDmMessages(data);
        });

      } catch (e) {
        console.log("Firebase sync error", e);
      }
    }).catch(e => console.log("Firebase import failed", e));
  }, []);

  // Auto-save nodes to Firebase whenever they change locally (Debounced to prevent jitter)
  useEffect(() => {
    if (DEMO_MODE) return; // demo builds don't persist anywhere
    if (nodes !== INITIAL_NODES) {
      const handler = setTimeout(() => {
        import('./firebase').then(({ saveNodes }) => {
          saveNodes(nodes);
        });
      }, 1000); // Wait 1 second after last change

      return () => clearTimeout(handler);
    }
  }, [nodes]);

  const handleSendMessage = (msg) => {
    if (DEMO_MODE) {
      // Demo builds keep chat local to your session -- nothing is sent anywhere.
      setDmMessages(prev => [...prev, msg]);
      return;
    }
    import('./firebase').then(({ sendMessage }) => {
      sendMessage(msg);
    });
  };

  const processedDevices = useMemo(() => {
    return devices.map(d => {
      if (!d.lastSeen) return d;
      const lastSeenTime = new Date(d.lastSeen).getTime();

      // Dynamic timeout: 60s for PC (fast updates), 1 hour for Phone (battery saving/MacroDroid)
      const timeout = d.type === 'phone' ? 3600000 : 60000;

      // For phones, trust the timestamp (MacroDroid might not send 'online: true')
      // For PCs, require both the 'online' flag AND a recent heartbeat
      const isOnline = d.type === 'phone'
        ? (!isNaN(lastSeenTime) && (now - lastSeenTime < timeout))
        : (d.online && !isNaN(lastSeenTime) && (now - lastSeenTime < timeout));

      return { ...d, online: isOnline };
    });
  }, [devices, now]);

  const selectedDevice = useMemo(() => processedDevices.find(d => d.id === selectedDeviceId) || processedDevices[0], [processedDevices, selectedDeviceId]);
  const currentContext = useMemo(() => {
    // 1. Try to find context on the active node itself
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (activeNode && activeNode.aiContext) return activeNode.aiContext;

    // 2. If not, try to find context on the parent node (if this is a child task)
    const parent = nodes.find(n => n.children?.includes(activeNodeId));
    if (parent && parent.aiContext) return parent.aiContext;

    // 3. Fallback to Mock
    return parent && MOCK_CONTEXT[parent.id] ? MOCK_CONTEXT[parent.id] : null;
  }, [activeNodeId, nodes]);

  return (
    <div className="app">
      <div className="ambient-glow" />
      {DEMO_MODE && (
        <div style={{ background: '#6366f1', color: '#fff', textAlign: 'center', fontSize: '12.5px', padding: '7px 12px', fontFamily: 'monospace', letterSpacing: '.02em' }}>
          DEMO BUILD -- simulated data, no live backend, no personal data connected. Chat runs in local-only demo mode.
        </div>
      )}
      <header className="app-header">
        <div className="header-brand"><div className="brand-icon"><BrainCircuit size={20} /></div><span className="brand-name">Glass Mind</span></div>
        <div className="header-tabs">
          <button className={`header-tab ${viewMode === 'admin' ? 'active' : ''}`} onClick={() => setViewMode('admin')}><Eye size={16} />My Brain</button>
          <button className={`header-tab ${viewMode === 'partner' ? 'active' : ''}`} onClick={() => setViewMode('partner')}><Heart size={16} />Public View</button>
        </div>
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>
      <main className="app-main">
        <AnimatePresence mode="wait">
          {viewMode === 'partner' ? (
            <motion.div key="partner" className="partner-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="partner-content">
                <TrafficLight windowCount={selectedDevice.windowCount} online={selectedDevice.online} />
                <DeviceSelector devices={processedDevices} selectedId={selectedDeviceId} onSelect={setSelectedDeviceId} />
                <LiveStatusCard device={selectedDevice} context={currentContext} />
                <MapWidget devices={processedDevices} />
                <div className="projects-grid">
                  {nodes.filter(n => n.type === 'project').map(p => <ProjectCard key={p.id} node={p} childNodes={nodes.filter(n => (p.children || []).includes(n.id))} />)}
                </div>
                <ChatWidget device={selectedDevice} context={currentContext} nodes={nodes} dmMessages={dmMessages} onSendMessage={handleSendMessage} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="admin" className="admin-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MindMapCanvas nodes={nodes} setNodes={setNodes} activeId={activeNodeId} setActiveId={setActiveNodeId} />
              <AdminSidebar nodes={nodes} setNodes={setNodes} dmMessages={dmMessages} onSendMessage={handleSendMessage} activeId={activeNodeId} setActiveId={setActiveNodeId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
