import React, { useState, useRef } from 'react';
import {
    Plus, Trash2, CheckCircle2, PauseCircle, PlayCircle, Send, Heart,
    Bell, FileText, Target, Layers, Circle, BrainCircuit, Sparkles
} from 'lucide-react';

const nodeColors = [
    { name: 'default', bg: 'rgba(255, 255, 255, 0.92)' },
    { name: 'blue', bg: 'rgba(219, 234, 254, 0.92)' },
    { name: 'purple', bg: 'rgba(243, 232, 255, 0.92)' },
    { name: 'green', bg: 'rgba(236, 253, 245, 0.92)' },
    { name: 'amber', bg: 'rgba(254, 243, 199, 0.92)' },
    { name: 'rose', bg: 'rgba(255, 228, 230, 0.92)' }
];

// MindMapCanvas: Simplified & Robust
export const MindMapCanvas = ({ nodes, setNodes, activeId, setActiveId }) => {
    const [connecting, setConnecting] = useState(null); // {from: nodeId}
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // Helpers
    const toggleStatus = (e, id, action) => {
        e.stopPropagation();
        setNodes(nodes.map(n => {
            if (n.id === id) {
                if (action === 'done') return { ...n, status: n.status === 'done' ? 'active' : 'done' };
                if (action === 'pause') return { ...n, status: n.status === 'stopped' ? 'active' : 'stopped' };
            }
            return n;
        }));
    };

    const deleteNode = (e, id) => {
        e.stopPropagation();
        setNodes(nodes.map(n => ({
            ...n,
            children: n.children ? n.children.filter(c => c !== id) : []
        })).filter(n => n.id !== id));
    };

    const startConnection = (e, nodeId) => {
        e.stopPropagation();
        setConnecting({ from: nodeId });
    };

    const completeConnection = (e, toNodeId) => {
        e.stopPropagation();
        if (connecting && connecting.from !== toNodeId) {
            setNodes(nodes.map(n => {
                if (n.id === connecting.from) {
                    const children = n.children || [];
                    if (!children.includes(toNodeId)) {
                        return { ...n, children: [...children, toNodeId] };
                    }
                }
                return n;
            }));
        }
        setConnecting(null);
    };

    const removeConnection = (e, fromId, toId) => {
        e.stopPropagation();
        setNodes(nodes.map(n => {
            if (n.id === fromId) {
                return { ...n, children: (n.children || []).filter(c => c !== toId) };
            }
            return n;
        }));
    };

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleCanvasClick = () => {
        setConnecting(null);
        setActiveId(null);
    };

    // Calculate lines purely from state
    const lines = [];
    nodes.forEach(node => {
        if (!node.children?.length) return;
        node.children.forEach(childId => {
            const child = nodes.find(n => n.id === childId);
            if (!child) return;

            // Simple Logic: Center of Node Width (180px) is +90px
            const startX = node.x + 90;
            const startY = node.y + 105; // Bottom handle approx
            const endX = child.x + 90;
            const endY = child.y;      // Top handle approx

            const midY = (startY + endY) / 2;
            const path = `M${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

            lines.push(
                <g key={`${node.id}-${childId}`} className="connection-group">
                    {/* Tick invisible hit path */}
                    <path d={path} stroke="transparent" strokeWidth="15" fill="none"
                        onClick={(e) => removeConnection(e, node.id, childId)} style={{ cursor: 'pointer' }} />
                    {/* Visible line */}
                    <path d={path} stroke="#6366f1" strokeWidth="2" fill="none" className="connection-line" />
                    {/* Delete button (simple circle) */}
                    <circle cx={(startX + endX) / 2} cy={(startY + endY) / 2} r="8" fill="white" stroke="#f43f5e"
                        onClick={(e) => removeConnection(e, node.id, childId)} style={{ cursor: 'pointer' }} />
                    <text x={(startX + endX) / 2} y={(startY + endY) / 2 + 3} textAnchor="middle" fill="#f43f5e" fontSize="10" pointerEvents="none">×</text>
                </g>
            );
        });
    });

    // Preview Line
    let previewLine = null;
    if (connecting) {
        const fromNode = nodes.find(n => n.id === connecting.from);
        if (fromNode) {
            const startX = fromNode.x + 90;
            const startY = fromNode.y + 105;
            previewLine = (
                <path d={`M${startX} ${startY} L${mousePos.x} ${mousePos.y}`}
                    stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" fill="none" />
            );
        }
    }

    return (
        <div ref={canvasRef} className="mindmap-canvas" onClick={handleCanvasClick} onMouseMove={handleMouseMove}>
            <svg className="mindmap-connections" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                {lines}
                {previewLine}
            </svg>
            <div className="mindmap-nodes-container" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                {/* Nodes need pointerEvents: all */}
                {nodes.map(node => (
                    <div key={node.id} style={{ pointerEvents: 'all', display: 'inline-block' }}>
                        <NodeCard
                            node={node}
                            nodes={nodes}
                            setNodes={setNodes}
                            isActive={activeId === node.id}
                            setActiveId={setActiveId}
                            toggleStatus={toggleStatus}
                            deleteNode={deleteNode}
                            startConnection={startConnection}
                            completeConnection={completeConnection}
                            connecting={connecting}
                        />
                    </div>
                ))}
            </div>
            {connecting && (
                <div className="connecting-hint" style={{ zIndex: 100 }}>
                    Click another node's top handle to connect
                </div>
            )}
        </div>
    );
};

const NodeCard = ({
    node, nodes, setNodes, isActive, setActiveId,
    toggleStatus, deleteNode, startConnection, completeConnection, connecting
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const nodeRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('node-handle')) return;
        e.preventDefault();
        setIsDragging(true);
        startPosRef.current = { x: e.clientX - node.x, y: e.clientY - node.y };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = Math.max(0, e.clientX - startPosRef.current.x);
        const newY = Math.max(0, e.clientY - startPosRef.current.y);
        setNodes(prevNodes => prevNodes.map(n => n.id === node.id ? { ...n, x: newX, y: newY } : n));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    const bgColor = node.color ? nodeColors.find(c => c.name === node.color)?.bg : nodeColors[0].bg;

    return (
        <div
            ref={nodeRef}
            className={`mindmap-node ${node.status || ''} ${node.type || ''} ${isActive ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${connecting ? 'can-connect' : ''}`}
            id={`node-${node.id}`}
            style={{
                left: node.x,
                top: node.y,
                background: bgColor,
                cursor: isDragging ? 'grabbing' : 'grab',
                minHeight: '110px' // Ensure enough height for handles
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                // If connecting and clicked on body, we can also complete
                if (connecting) {
                    completeConnection(e, node.id);
                } else {
                    setActiveId(node.id);
                }
            }}
        >
            {/* Top Handle (Input) */}
            <div
                className="node-handle top"
                style={{ zIndex: 20 }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (connecting) completeConnection(e, node.id);
                }}
                title="Input Connection"
            />

            {/* Bottom Handle (Output) */}
            <div
                className="node-handle bottom"
                style={{ zIndex: 20 }}
                onClick={(e) => {
                    e.stopPropagation();
                    startConnection(e, node.id);
                }}
                title="Drag to connect"
            />

            <div className="node-header">
                <span className={`node-type-badge ${node.type || ''}`}>
                    {node.status === 'stopped' ? '⏸' : node.status === 'done' ? '✓' : ''} {node.type || 'node'}
                </span>
                <div className="node-actions">
                    <button onClick={e => toggleStatus(e, node.id, 'done')} aria-label="Mark node done" className={node.status === 'done' ? 'active' : ''}>
                        <CheckCircle2 size={13} />
                    </button>
                    <button onClick={e => toggleStatus(e, node.id, 'pause')} aria-label={node.status === 'stopped' ? 'Resume node' : 'Pause node'}>
                        {node.status === 'stopped' ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                    </button>
                    <button onClick={e => deleteNode(e, node.id)} aria-label="Delete node" className="delete-btn">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
            <input
                className="node-label-input"
                value={node.label || ''}
                onChange={e => setNodes(nodes.map(n => n.id === node.id ? { ...n, label: e.target.value } : n))}
                placeholder="Node label..."
            />
            {node.translatedLabel && (
                <input
                    className="node-translated-input"
                    value={node.translatedLabel || ''}
                    onChange={e => setNodes(nodes.map(n => n.id === node.id ? { ...n, translatedLabel: e.target.value } : n))}
                    placeholder="Description..."
                />
            )}
            {isActive && (
                <div className="node-color-picker">
                    {nodeColors.map(color => (
                        <button
                            key={color.name}
                            aria-label={`Set node colour: ${color.name}`}
                            className={`color-option ${node.color === color.name ? 'active' : ''}`}
                            style={{ background: color.bg }}
                            onClick={e => {
                                e.stopPropagation();
                                setNodes(nodes.map(n => n.id === node.id ? { ...n, color: color.name } : n));
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Admin Chat (Direct Message)
export const AdminChat = ({ messages, onSendMessage }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;

        if (onSendMessage) {
            onSendMessage({
                sender: 'me',
                text: input,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
        setInput('');
    };

    return (
        <div className="admin-chat-section">
            <h4 className="section-title"><Heart size={14} style={{ color: '#f43f5e' }} /> Message Log</h4>
            <div className="admin-chat-messages">
                {messages.length === 0 && <div className="chat-empty">No messages yet</div>}
                {messages.map((msg, i) => (
                    <div key={i} className={`admin-chat-message ${msg.sender === 'me' ? 'me' : 'partner'}`}>
                        <div className="message-bubble">{msg.text}</div>
                    </div>
                ))}
            </div>
            <div className="admin-chat-input">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Message..."
                />
                <button onClick={handleSend} disabled={!input.trim()} aria-label="Send message"><Send size={18} /></button>
            </div>
        </div>
    );
};

// AI Context Chat & Settings
// AI Context Chat & Settings
import { GEMINI_API_KEY } from '../config';

export const AIContextChat = ({ nodes }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { sender: 'ai', text: "Ready. I have context on all your projects. How can I help you build, plan, or write today?" }
    ]);
    const [apiKey, setApiKey] = useState(localStorage.getItem('glass_gemini_key') || GEMINI_API_KEY);
    const [showSettings, setShowSettings] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const saveKey = (val) => {
        setApiKey(val);
        localStorage.setItem('glass_gemini_key', val);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userText = input;
        setMessages(prev => [...prev, { sender: 'me', text: userText }]);
        setInput('');
        setIsTyping(true);

        // Build Context from Nodes
        const memory = nodes
            .filter(n => n.aiContext || n.translatedLabel || n.label)
            .map(n => `- ${n.label} (${n.type}): ${n.aiContext || n.translatedLabel || 'No details'}`)
            .join('\n');

        if (apiKey) {
            try {
                const systemPrompt = `
You are the "Cortex Assistant", a helpful AI embedded in the user's brain extension (Glass Mind).

Current Project Context (Read-Only Memory):
${memory}

Your Goal:
Be a highly capable general assistant. Help the user with brainstorming, drafting text, writing code, planning tasks, or basic conversation.
- You CAN use the Project Context above to give smarter answers (e.g., if they ask "Draft a tweet about the Zoom project").
- But you are NOT limited to it. You can answer general questions too.
- Keep replies concise and professional.

User Query: ${userText}
`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: systemPrompt }]
                        }]
                    })
                });
                const data = await res.json();
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response from Gemini.";
                setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
            } catch {
                setMessages(prev => [...prev, { sender: 'ai', text: "Error connecting to Gemini. Check API Key." }]);
            }
        } else {
            // Fallback Mock
            setTimeout(() => {
                setMessages(prev => [...prev, { sender: 'ai', text: "I'm in simulation mode. Add a Gemini API Key to make me smart!" }]);
            }, 1000);
        }
        setIsTyping(false);
    };

    return (
        <div className="admin-chat-section" style={{ minHeight: '200px' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 className="section-title" style={{ margin: 0 }}>
                    <Sparkles size={14} style={{ color: '#6366f1' }} /> Cortex Assistant
                </h4>
                <button onClick={() => setShowSettings(!showSettings)} aria-label="Assistant settings" aria-expanded={showSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
                    <Layers size={14} />
                </button>
            </div>

            {showSettings ? (
                <div className="api-key-settings" style={{ marginBottom: '10px', padding: '10px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 500 }}>Gemini API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={e => saveKey(e.target.value)}
                        placeholder="Paste AI Studio Key..."
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}
                    />
                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                        Get free key from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>aistudio.google.com</a>
                    </div>
                </div>
            ) : (
                <div className="admin-chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`admin-chat-message ${msg.sender === 'ai' ? 'partner' : 'me'}`}>
                            <div className="message-bubble" style={msg.sender === 'ai' ? { background: 'var(--bg)', border: '1px solid var(--border)' } : { background: 'var(--text)', color: 'var(--bg)' }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && <div className="admin-chat-message partner"><div className="message-bubble" style={{ background: 'var(--bg)', border: '1px solid var(--border)', fontStyle: 'italic', opacity: 0.7 }}>Thinking...</div></div>}
                </div>
            )}

            {!showSettings && (
                <div className="admin-chat-input">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ask me anything..."
                    />
                    <button onClick={handleSend} disabled={!input.trim()} aria-label="Send to assistant" style={{ background: 'var(--text)' }}>
                        <Send size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

// Node Management Panel - Context aware (edit selected or add new)
export const NodeManagement = ({ nodes, setNodes, activeId, setActiveId }) => {
    const [newLabel, setNewLabel] = useState('');
    const [newType, setNewType] = useState('task');

    const nodeTypes = [
        { value: 'task', label: 'Task', icon: CheckCircle2 },
        { value: 'field', label: 'Field', icon: Layers },
        { value: 'reminder', label: 'Reminder', icon: Bell },
        { value: 'note', label: 'Note', icon: FileText },
        { value: 'goal', label: 'Goal', icon: Target }
    ];

    const nodeColors = [
        { name: 'default', bg: 'rgba(255, 255, 255, 0.92)', label: 'Default' },
        { name: 'blue', bg: 'rgba(219, 234, 254, 0.92)', label: 'Blue' },
        { name: 'purple', bg: 'rgba(243, 232, 255, 0.92)', label: 'Purple' },
        { name: 'green', bg: 'rgba(236, 253, 245, 0.92)', label: 'Green' },
        { name: 'amber', bg: 'rgba(254, 243, 199, 0.92)', label: 'Amber' },
        { name: 'rose', bg: 'rgba(255, 228, 230, 0.92)', label: 'Rose' }
    ];

    const selectedNode = activeId ? nodes.find(n => n.id === activeId) : null;

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        const newNode = {
            id: `node_${Date.now()}`,
            label: newLabel,
            translatedLabel: '',
            status: 'active',
            type: newType,
            x: 100 + Math.random() * 300,
            y: 100 + Math.random() * 200,
            children: []
        };
        setNodes([...nodes, newNode]);
        setNewLabel('');
    };

    const updateNode = (field, value) => {
        setNodes(nodes.map(n => n.id === activeId ? { ...n, [field]: value } : n));
    };

    const deleteSelectedNode = () => {
        setNodes(nodes.map(n => ({
            ...n,
            children: n.children ? n.children.filter(c => c !== activeId) : []
        })).filter(n => n.id !== activeId));
        setActiveId(null);
    };

    return (
        <div className="node-management-section">
            <h4 className="section-title">
                <Layers size={14} />
                {selectedNode ? 'Edit Node' : 'Add Node'}
            </h4>

            {selectedNode ? (
                // EDIT MODE - Selected node details
                <div className="node-edit-form">
                    <div className="form-group">
                        <label>Label</label>
                        <input
                            value={selectedNode.label || ''}
                            onChange={e => updateNode('label', e.target.value)}
                            placeholder="Node label..."
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <input
                            value={selectedNode.translatedLabel || ''}
                            onChange={e => updateNode('translatedLabel', e.target.value)}
                            placeholder="What this means..."
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>AI Context (Secret)</label>
                        <textarea
                            value={selectedNode.aiContext || ''}
                            onChange={e => updateNode('aiContext', e.target.value)}
                            placeholder="Context for Gemini (e.g., 'This project needs strict budget')..."
                            className="form-input"
                            style={{ minHeight: '60px', resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <div className="node-type-selector">
                            {nodeTypes.map(t => {
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.value}
                                        className={`type-btn ${selectedNode.type === t.value ? 'active' : ''}`}
                                        onClick={() => updateNode('type', t.value)}
                                    >
                                        <Icon size={13} />
                                        <span>{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <div className="status-selector">
                            <button
                                className={`status-btn ${selectedNode.status === 'active' ? 'active' : ''}`}
                                onClick={() => updateNode('status', 'active')}
                            >
                                <Circle size={12} /> Active
                            </button>
                            <button
                                className={`status-btn done ${selectedNode.status === 'done' ? 'active' : ''}`}
                                onClick={() => updateNode('status', 'done')}
                            >
                                <CheckCircle2 size={12} /> Done
                            </button>
                            <button
                                className={`status-btn paused ${selectedNode.status === 'stopped' ? 'active' : ''}`}
                                onClick={() => updateNode('status', 'stopped')}
                            >
                                <PauseCircle size={12} /> Paused
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Color</label>
                        <div className="color-selector">
                            {nodeColors.map(color => (
                                <button
                                    key={color.name}
                                    aria-label={`Set colour: ${color.label}`}
                                    className={`color-btn ${selectedNode.color === color.name ? 'active' : ''}`}
                                    style={{ background: color.bg }}
                                    onClick={() => updateNode('color', color.name)}
                                    title={color.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn-deselect" onClick={() => setActiveId(null)}>
                            Deselect
                        </button>
                        <button className="btn-delete" onClick={deleteSelectedNode}>
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>
            ) : (
                // ADD MODE - New node form
                <>
                    <div className="node-type-selector">
                        {nodeTypes.map(t => {
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.value}
                                    className={`type-btn ${newType === t.value ? 'active' : ''}`}
                                    onClick={() => setNewType(t.value)}
                                >
                                    <Icon size={13} />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="node-add-input">
                        <input
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder={`New ${newType}...`}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        />
                        <button onClick={handleAdd} disabled={!newLabel.trim()} aria-label="Add node">
                            <Plus size={18} />
                        </button>
                    </div>
                </>
            )}

            <div className="node-stats">
                <div className="stat">
                    <Circle size={10} className="stat-icon active" />
                    <span>{nodes.filter(n => n.status === 'active').length} Active</span>
                </div>
                <div className="stat">
                    <CheckCircle2 size={10} className="stat-icon done" />
                    <span>{nodes.filter(n => n.status === 'done').length} Done</span>
                </div>
                <div className="stat">
                    <PauseCircle size={10} className="stat-icon paused" />
                    <span>{nodes.filter(n => n.status === 'stopped').length} Paused</span>
                </div>
            </div>
        </div>
    );
};

// Sidebar
export const AdminSidebar = ({ nodes, setNodes, dmMessages, onSendMessage, activeId, setActiveId }) => {
    return (
        <div className="admin-sidebar">
            <h2 className="sidebar-title"><BrainCircuit size={20} /> Cortex Control</h2>

            <NodeManagement
                nodes={nodes}
                setNodes={setNodes}
                activeId={activeId}
                setActiveId={setActiveId}
            />

            <AIContextChat nodes={nodes} />
            <AdminChat messages={dmMessages || []} onSendMessage={onSendMessage} />
        </div>
    );
};
