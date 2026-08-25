import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Send, Bot, Heart, Minimize2, Sparkles, MapPin, CheckCircle2, Circle, PauseCircle, Battery, BatteryCharging, Wifi, Signal } from 'lucide-react';
import { formatTime } from './core';
import { GEMINI_API_KEY } from '../config';

// Chat Widget - Two separate chats: AI assistant and direct messages
export const ChatWidget = ({ device, context, nodes, dmMessages, onSendMessage }) => {
    const [openChat, setOpenChat] = useState(null); // null, 'ai', or 'hubby'
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([{ sender: 'ai', text: "Hello! I am the Glass Mind Butler. I can update you on his status, or help YOU with anything you need. How may I be of service?" }]);
    const [isTyping, setIsTyping] = useState(false);
    const [lastSeenCount, setLastSeenCount] = useState(0);

    // Count unread messages (sender === 'me' means from the admin side)
    const unreadCount = dmMessages ? dmMessages.filter(m => m.sender === 'me').length - lastSeenCount : 0;
    const hasUnread = unreadCount > 0;

    const generateAIResponse = async (q) => {
        const apiKey = localStorage.getItem('glass_gemini_key') || GEMINI_API_KEY;

        // --- GEMINI API CALL ---
        if (apiKey) {
            try {
                const systemPrompt = `
You are "Alfred", the Glass Mind Butler.
Your master (the one being monitored) is currently:
- Activity: ${device?.status || 'Active'}
- Working on: ${device?.activeWindow || 'Unknown Task'}
- Current Context: ${context || 'No specific context provided'}

Your Role:
- You are a polite, warm, and helpful assistant for whoever is viewing this dashboard.
- You can answer questions about the master's current status based on the info above.
- You are also a general-purpose assistant: happy to help with ideas, drafts, quick lookups, or casual questions.
- Always be courteous, supportive, and slightly formal but warm.
- Keep answers concise (under 80 words) unless asked for more.
                `;

                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt + "\n\nUser Question: " + q }] }]
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error.message);

                if (data.candidates && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                }
            } catch (e) {
                console.error("Gemini API Error", e);
                return `AI Error: ${e.message}`;
            }
        }

        return "This public build runs in demo mode, so there is no live AI backend connected -- this is where Alfred would answer using real context about what is being worked on.";
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (openChat === 'ai') {
            const userText = input;
            setInput(''); // Clear immediately
            setMessages(prev => [...prev, { sender: 'user', text: userText }]);
            setIsTyping(true);

            const response = await generateAIResponse(userText);

            setMessages(prev => [...prev, { sender: 'ai', text: response }]);
            setIsTyping(false);
        } else {
            // Use onSendMessage to save to Firebase
            if (onSendMessage) {
                onSendMessage({
                    sender: 'partner',
                    text: input,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
            setInput('');
        }
    };

    const openHubbyChat = () => {
        setOpenChat('hubby');
        // Mark all as read when opening
        const hubbyMsgCount = dmMessages ? dmMessages.filter(m => m.sender === 'me').length : 0;
        setLastSeenCount(hubbyMsgCount);
    };

    // Show FABs when closed
    if (!openChat) return (
        <div className="chat-fabs">
            <motion.button className="chat-fab ai-fab" onClick={() => setOpenChat('ai')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Sparkles size={20} /><span>AI Assistant</span>
            </motion.button>
            <motion.button className="chat-fab hubby-fab" onClick={openHubbyChat} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Heart size={20} /><span>Messages</span>
                {hasUnread && <span className="notif-dot" />}
            </motion.button>
        </div>
    );

    return (
        <motion.div className="chat-widget" initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            <div className="chat-header">
                <div className="chat-title">
                    {openChat === 'ai' ? <><Sparkles size={16} /> AI Assistant</> : <><Heart size={16} /> Messages</>}
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setOpenChat(null)}><Minimize2 size={18} /></button>
            </div>
            <div className="chat-messages">
                {openChat === 'ai' ? (<>
                    {messages.map((m, i) => <motion.div key={i} className={`chat-message ${m.sender}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        {m.sender === 'ai' && <div className="message-sender"><Sparkles size={12} /> GLASS MIND</div>}
                        <div className="message-text">{m.text}</div>
                    </motion.div>)}
                    {isTyping && <div className="chat-message ai"><div className="typing-indicator"><span></span><span></span><span></span></div></div>}
                </>) : (<>
                    {(!dmMessages || dmMessages.length === 0) && <div className="dm-empty">No messages yet. Send him a love note! 💕</div>}
                    {dmMessages && dmMessages.map((m, i) => (
                        <motion.div
                            key={i}
                            className={`chat-message dm ${m.sender === 'partner' ? 'sent' : 'received'}`}
                            initial={{ opacity: 0, x: m.sender === 'partner' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <div className="message-text">{m.text}</div>
                            <div className="message-time">{m.time}</div>
                        </motion.div>
                    ))}
                </>)}
            </div>
            <div className="chat-input-wrap">
                <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={openChat === 'ai' ? 'Ask about his status...' : 'Send a message...'} />
                <button className="btn btn-primary btn-icon" onClick={handleSend}><Send size={18} /></button>
            </div>
        </motion.div>
    );
};


// Map Widget - Uses phone location only
export const MapWidget = ({ devices }) => {
    // Find phone device for location
    const phone = devices?.find(d => d.type === 'phone');
    const location = phone?.location;

    // Sanitize: ensure numbers
    const lat = location ? parseFloat(location.lat) : 0;
    const lng = location ? parseFloat(location.lng) : 0;
    const isValidLocation = location && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

    if (!isValidLocation) return (
        <div className="map-widget">
            <div className="map-placeholder">
                <MapPin size={32} />
                <p>Phone location not available</p>
            </div>
        </div>
    );

    // Battery Logic
    const batteryLevel = phone.battery || 0;
    // const isCharging = phone.isCharging; // Removed as user requested generic icon
    let batteryColor = '#10b981'; // Green
    if (batteryLevel < 20) batteryColor = '#ef4444'; // Red
    else if (batteryLevel < 50) batteryColor = '#f59e0b'; // Orange

    // Signal Logic
    const signalStrength = phone.signal || 0; // 0-4
    const renderSignalBars = () => {
        return (
            <div className="signal-bars" style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
                {[1, 2, 3, 4].map(bar => (
                    <div key={bar} style={{
                        width: '3px',
                        height: `${bar * 3}px`,
                        background: bar <= signalStrength ? 'var(--text)' : 'var(--border)',
                        borderRadius: '1px'
                    }} />
                ))}
            </div>
        );
    };

    return (
        <motion.div className="map-widget" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="map-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} /><span>{phone.name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '8px' }}>{formatTime(phone.lastSeen)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="status-item" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '500' }}>
                        {renderSignalBars()}
                        <span>{phone.network || 'LTE'}</span>
                    </div>
                    <div className="status-item" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '500', color: batteryColor }}>
                        <Battery size={14} />
                        <span>{batteryLevel}%</span>
                    </div>
                </div>
            </div>
            <div className="map-container">
                <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[lat, lng]}><Popup><strong>{phone.name}</strong><br />{phone.online ? '🟢 Online now' : `Last seen ${formatTime(phone.lastSeen)}`}</Popup></Marker>
                </MapContainer>
            </div>
        </motion.div>
    );
};

// Project Card
export const ProjectCard = ({ node, childNodes }) => {
    const isStopped = node.status === 'stopped';
    const completed = childNodes.filter(n => n.status === 'done').length;
    const percent = childNodes.length === 0 ? node.progress : Math.round((completed / childNodes.length) * 100);
    return (
        <motion.div className={`project-card ${isStopped ? 'paused' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}>
            <div className="project-header">
                <div><h3 className="project-title">{node.translatedLabel}{isStopped && <span className="badge-paused">Paused</span>}</h3><span className="project-code">{node.label}</span></div>
                {!isStopped && <div className="project-progress-ring"><svg viewBox="0 0 36 36"><path className="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path className="progress-fill" strokeDasharray={`${percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg><span className="progress-text">{percent}%</span></div>}
            </div>
            {!isStopped && <div className="project-bar"><motion.div className="project-bar-fill" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1 }} /></div>}
            <div className="project-tasks">
                {childNodes.slice(0, 3).map(c => <div key={c.id} className={`task-item ${c.status}`}>{c.status === 'done' ? <CheckCircle2 size={16} className="task-icon done" /> : c.status === 'stopped' ? <PauseCircle size={16} className="task-icon paused" /> : <Circle size={16} className="task-icon" />}<span className="task-label">{c.translatedLabel}</span></div>)}
                {childNodes.length === 0 && <p className="no-tasks">No active tasks</p>}
            </div>
        </motion.div>
    );
};
