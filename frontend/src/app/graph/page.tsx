"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Network, ZoomIn, ZoomOut, MousePointer2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function RelationshipGraph() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.workspaces?.length > 0) {
         fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${parsed.workspaces[0].workspaceId}/graph`)
           .then(res => res.json())
           .then(data => {
              setNodes(data.nodes);
              setLinks(data.links);
           });
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 font-sans text-white md:flex-row overflow-hidden">
      <Sidebar activePage="Graph View" />

      <main className="flex-1 relative">
        <header className="absolute top-0 left-0 w-full z-10 p-6 pointer-events-none flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 text-white drop-shadow-md">
              <Network className="h-6 w-6 text-blue-400" />
              <h1 className="text-2xl font-black tracking-tight">Knowledge Graph</h1>
            </div>
            <p className="mt-1 text-sm text-slate-300 drop-shadow-md max-w-sm">
              An interactive constellation of every Project, Document, and Task inside your workspace.
            </p>
          </div>
           <div className="flex space-x-2 pointer-events-auto">
             <button onClick={() => setScale(s => Math.min(s + 0.2, 2))} className="rounded-xl bg-slate-800/80 p-2.5 backdrop-blur-md hover:bg-slate-700 transition"><ZoomIn className="h-4 w-4" /></button>
             <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="rounded-xl bg-slate-800/80 p-2.5 backdrop-blur-md hover:bg-slate-700 transition"><ZoomOut className="h-4 w-4" /></button>
          </div>
        </header>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-10 bg-slate-800/80 p-4 rounded-xl backdrop-blur-md border border-slate-700 pointer-events-auto shadow-xl">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Legend</h3>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-sm shadow-[#3B82F6]/50"></div><span className="text-sm font-medium">Projects</span></div>
            <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm shadow-[#10B981]/50"></div><span className="text-sm font-medium">Notes</span></div>
            <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-sm shadow-[#F59E0B]/50"></div><span className="text-sm font-medium">Tasks</span></div>
          </div>
        </div>

        {/* Graph Canvas */}
        <div 
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black relative overflow-hidden"
        >
           {/* Grid Pattern */}
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
           
           <motion.div 
             className="w-full h-full transform-origin-center absolute inset-0"
             animate={{ scale }}
             transition={{ type: "spring", stiffness: 300, damping: 30 }}
           >
              {/* SVG Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                 {links.map((link, i) => {
                   const source = nodes.find(n => n.id === link.source);
                   const target = nodes.find(n => n.id === link.target);
                   if (!source || !target) return null;
                   return (
                     <line 
                       key={i} 
                       x1={source.x} y1={source.y} 
                       x2={target.x} y2={target.y} 
                       stroke="rgba(148, 163, 184, 0.2)" 
                       strokeWidth="2" 
                     />
                   )
                 })}
              </svg>

              {/* Nodes */}
              {nodes.map((node) => (
                <motion.div
                  drag
                  dragMomentum={false}
                  onDrag={(e, info) => {
                     setNodes(prev => prev.map(n => n.id === node.id ? { ...n, x: n.x + info.delta.x / scale, y: n.y + info.delta.y / scale } : n))
                  }}
                  key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.random() * 0.5 }}
                  style={{ backgroundColor: node.color, x: node.x, y: node.y }}
                  className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-900 shadow-xl shadow-black/50 cursor-pointer hover:ring-4 hover:ring-white/20 active:scale-95 transition-shadow"
                >
                  <MousePointer2 className="h-5 w-5 opacity-50 absolute -bottom-6 -right-6 text-white" />
                  <span className="absolute -bottom-8 whitespace-nowrap text-xs font-bold text-slate-300 drop-shadow-md bg-slate-900/80 px-2 py-1 rounded-lg backdrop-blur-sm">
                    {node.label}
                  </span>
                </motion.div>
              ))}
           </motion.div>
        </div>
      </main>
    </div>
  );
}
