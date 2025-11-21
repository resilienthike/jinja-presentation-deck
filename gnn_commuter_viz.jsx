import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Network, Grid, Activity, Terminal as TerminalIcon } from 'lucide-react';

// --- Constants & Styles ---
const COLORS = {
  background: '#0f1115', // Deep dark grey/black
  node: '#333333',
  nodeActive: '#ffffff',
  edge: '#2a2a2a',
  edgeActive: '#3b82f6',
  commuter: '#00ff9d',   // Green for data packets
  text: '#e5e5e5',
  accent: '#0ea5e9',
};

// --- Helper Math ---
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const CommuterGNN = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // State
  const [logs, setLogs] = useState(['> Kernel initialized.']);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [layoutMode, setLayoutMode] = useState('GNN'); // 'GNN' (organic) or 'NN' (layered)
  
  // Refs for animation loop
  const stateRef = useRef({
    nodes: [],
    edges: [],
    commuters: [],
    isPlaying: false,
    dragNode: null,
    width: 800,
    height: 600
  });

  const addLog = useCallback((msg) => {
    setLogs(prev => [msg, ...prev].slice(0, 8));
  }, []);

  // --- Initialization ---
  const initGraph = useCallback(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Update ref dimensions
    stateRef.current.width = width;
    stateRef.current.height = height;

    // Graph Parameters
    const layers = 4;
    const nodesPerLayer = [5, 7, 7, 4]; // Slightly reduced for cleaner visual
    const newNodes = [];
    const newEdges = [];
    let idCounter = 0;

    // 1. Generate Nodes
    nodesPerLayer.forEach((count, layerIdx) => {
      for (let i = 0; i < count; i++) {
        // Base Position
        let x, y;

        if (layoutMode === 'NN') {
            // Structured / Grid Layout (Standard Neural Net)
            const xStep = width / (layers + 1);
            const yStep = height / (count + 1);
            x = xStep * (layerIdx + 1);
            y = yStep * (i + 1);
        } else {
            // Organic / Graph Layout (GNN)
            // We still use layers loosely to guide flow left-to-right, but with noise
            const xStep = width / (layers + 1);
            const xNoise = (Math.random() - 0.5) * (width * 0.25); // High horizontal noise
            const yNoise = (Math.random() - 0.5) * (height * 0.8); // Full vertical spread
            
            x = (xStep * (layerIdx + 1)) + xNoise;
            y = (height / 2) + yNoise;

            // Clamp to screen padding
            x = Math.max(50, Math.min(width - 50, x));
            y = Math.max(50, Math.min(height - 50, y));
        }

        newNodes.push({
          id: idCounter++,
          x,
          y,
          layer: layerIdx,
          val: Math.random().toFixed(2),
          active: 0,
          radius: layoutMode === 'NN' ? 8 : 6 + Math.random() * 6, // Uniform size for NN, varied for GNN
        });
      }
    });

    // 2. Generate Edges
    newNodes.forEach(source => {
      newNodes.forEach(target => {
        let shouldConnect = false;

        if (layoutMode === 'NN') {
            // NN: Strictly feed-forward adjacent layers
            if (source.layer === target.layer - 1) {
                 // Connect densely (high probability)
                 if (Math.random() > 0.2) shouldConnect = true;
            }
        } else {
            // GNN: Topology based on proximity (k-NNish) + some long range
            const dist = distance(source, target);
            const isForward = target.layer > source.layer; 
            
            // Connect if close and generally moving forward (or same layer)
            if (dist < 150 && isForward && Math.random() > 0.4) {
                shouldConnect = true;
            }
            // Small chance of random long-distance connection
            if (isForward && Math.random() > 0.92) {
                shouldConnect = true;
            }
        }

        if (shouldConnect) {
             newEdges.push({ source: source.id, target: target.id, weight: Math.random() });
        }
      });
    });

    stateRef.current.nodes = newNodes;
    stateRef.current.edges = newEdges;
    stateRef.current.commuters = []; // Clear moving packets
    
    // Don't stop playing if we just resized, but do reset if explicit switch
    if (!stateRef.current.isPlaying) {
        setLogs(['> Graph constructed.', `> Mode: ${layoutMode === 'NN' ? 'Feed-Forward Network' : 'Graph Topology'}`]);
    }
  }, [layoutMode]);

  // --- Interaction Handlers ---
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const clickedNode = stateRef.current.nodes.find(n => distance(n, { x: mouseX, y: mouseY }) < n.radius + 10);
    
    if (clickedNode) {
      stateRef.current.dragNode = clickedNode;
      setSelectedNode(clickedNode);
      // Only log if not dragging continuously
      addLog(`> Node ${clickedNode.id} selected.`);
    }
  };

  const handleMouseMove = (e) => {
    if (stateRef.current.dragNode) {
      const rect = canvasRef.current.getBoundingClientRect();
      stateRef.current.dragNode.x = e.clientX - rect.left;
      stateRef.current.dragNode.y = e.clientY - rect.top;
    }
  };

  const handleMouseUp = () => {
    stateRef.current.dragNode = null;
  };

  // --- Simulation Logic ---
  const triggerCommute = () => {
    if (stateRef.current.isPlaying) return;

    setIsPlaying(true);
    stateRef.current.isPlaying = true;
    addLog('> Executing Message Passing...');
    
    const newCommuters = [];
    stateRef.current.edges.forEach(edge => {
      const source = stateRef.current.nodes.find(n => n.id === edge.source);
      const target = stateRef.current.nodes.find(n => n.id === edge.target);
      
      if (source && target) {
        newCommuters.push({
          x: source.x,
          y: source.y,
          targetId: target.id,
          progress: 0,
          speed: 0.015 + (Math.random() * 0.01), // Varied speed
        });
      }
    });
    stateRef.current.commuters = newCommuters;
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    stateRef.current.isPlaying = false;
    stateRef.current.commuters = [];
    stateRef.current.nodes.forEach(n => n.active = 0);
    setLogs(['> Kernel history cleared.', '> System ready.']); // Reset logs
  };

  const toggleLayout = () => {
      setLayoutMode(prev => prev === 'NN' ? 'GNN' : 'NN');
  };

  // --- Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      if (!canvas) return;

      // Clear
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Edges
      ctx.lineWidth = layoutMode === 'NN' ? 0.5 : 1; // thinner edges for dense NN
      stateRef.current.edges.forEach(edge => {
        const s = stateRef.current.nodes.find(n => n.id === edge.source);
        const t = stateRef.current.nodes.find(n => n.id === edge.target);
        if (!s || !t) return;

        const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(255,255,255,0.05)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // Update & Draw Commuters
      if (stateRef.current.isPlaying) {
        const commuters = stateRef.current.commuters;
        for (let i = commuters.length - 1; i >= 0; i--) {
          const c = commuters[i];
          c.progress += c.speed;
          
          const targetNode = stateRef.current.nodes.find(n => n.id === c.targetId);
          if (targetNode) {
             const currX = c.x + (targetNode.x - c.x) * c.progress;
             const currY = c.y + (targetNode.y - c.y) * c.progress;

             // Draw Packet
             ctx.shadowBlur = 6;
             ctx.shadowColor = COLORS.commuter;
             ctx.fillStyle = COLORS.commuter;
             ctx.beginPath();
             ctx.arc(currX, currY, 2, 0, Math.PI * 2);
             ctx.fill();
             ctx.shadowBlur = 0;

             // Arrival
             if (c.progress >= 1) {
                commuters.splice(i, 1);
                targetNode.active = Math.min(targetNode.active + 0.3, 1.0);
                // Flash
                ctx.strokeStyle = COLORS.commuter;
                ctx.beginPath();
                ctx.arc(currX, currY, 8, 0, Math.PI * 2);
                ctx.stroke();
             }
          }
        }
        
        // Auto-stop loop visually but keep 'isPlaying' true until reset for UX
        if (commuters.length === 0 && stateRef.current.isPlaying) {
             // Optional: Auto-reset or stay in finished state
        }
      }

      // Draw Nodes
      stateRef.current.nodes.forEach(node => {
        // Decay activation
        if (node.active > 0) {
            ctx.shadowBlur = node.active * 15;
            ctx.shadowColor = COLORS.accent;
            node.active *= 0.96;
        } else {
            ctx.shadowBlur = 0;
        }

        // Draw Node
        ctx.fillStyle = selectedNode?.id === node.id ? COLORS.accent : (node.active > 0.1 ? COLORS.nodeActive : COLORS.node);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Stroke
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [layoutMode, selectedNode]); // Re-bind render when mode changes

  // --- Window Resize Handling ---
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
            initGraph(); // Re-generate graph to fit new bounds
        }
    };

    // Initial sizing
    handleResize();

    // Observer for robust resizing
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [initGraph]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0f1115] overflow-hidden flex font-sans text-slate-200 select-none">
      
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="block touch-none cursor-crosshair"
      />

      {/* Node Inspector (Top Left - Minimal) */}
      {selectedNode && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur border border-white/10 rounded-lg p-3 text-xs font-mono text-white/70 shadow-xl pointer-events-none animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold">
                  <Activity size={12} /> NODE_{selectedNode.id}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span>VAL:</span> <span className="text-white">{selectedNode.val}</span>
                  <span>LAYER:</span> <span className="text-white">{selectedNode.layer}</span>
                  <span>ACT:</span> <span className="text-white">{selectedNode.active > 0.1 ? 'HIGH' : 'IDLE'}</span>
              </div>
          </div>
      )}

      {/* Floating Controls (Top Right - Minimal Icon Only) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        
        {/* View Toggle */}
        <button 
            onClick={toggleLayout}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl text-white transition-all border border-white/5 shadow-lg group relative"
            title={layoutMode === 'NN' ? "Switch to Graph View" : "Switch to Layered View"}
        >
            {layoutMode === 'NN' ? <Network size={18} /> : <Grid size={18} />}
            <span className="absolute right-full mr-2 bg-black px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {layoutMode === 'NN' ? "NN Mode (Layered)" : "GNN Mode (Graph)"}
            </span>
        </button>

        <div className="h-px w-full bg-white/10 my-1"></div>

        {/* Run */}
        <button 
            onClick={triggerCommute}
            disabled={isPlaying}
            className={`w-10 h-10 flex items-center justify-center backdrop-blur rounded-xl transition-all border border-white/5 shadow-lg ${isPlaying ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Run Message Passing"
        >
            <Play size={18} fill={isPlaying ? "currentColor" : "none"} />
        </button>

        {/* Reset */}
        <button 
            onClick={resetSimulation}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500/20 hover:text-red-400 backdrop-blur rounded-xl text-white transition-all border border-white/5 shadow-lg"
            title="Reset & Clear Logs"
        >
            <RotateCcw size={18} />
        </button>
      </div>

      {/* Logs (Bottom Right - Integrated) */}
      <div className="absolute bottom-4 right-4 w-64 pointer-events-none">
        <div className="flex items-center gap-2 mb-2 px-2">
            <TerminalIcon size={10} className="text-white/30" />
            <span className="text-[10px] font-bold text-white/30 tracking-widest font-mono">KERNEL LOG</span>
        </div>
        <div className="bg-black/50 backdrop-blur-sm border-l-2 border-white/10 pl-3 py-1 font-mono text-[10px] flex flex-col gap-1 text-white/50">
            {logs.map((log, i) => (
                <div key={i} className={i === 0 ? 'text-emerald-400 animate-pulse' : ''}>{log}</div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default CommuterGNN;