"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, Search, CheckCircle2, MoreHorizontal, PenTool } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function NotesIndex() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Note Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem("nv_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.workspaces?.length > 0) {
          const ws = parsed.workspaces[0];
          setWorkspace(ws);
          try {
            const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${ws.workspaceId}?userId=${parsed.id}&userRole=${ws.role}`);
            if (pRes.ok) {
               const pData = await pRes.json();
               setProjects(pData);
               if (pData.length > 0) setSelectedProjectId(pData[0].id);
            }
          } catch(e) {}
        }
      }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) fetchNotes();
  }, [selectedProjectId]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes/project/${selectedProjectId}`);
      if (res.ok) setNotes(await res.json());
    } catch(e) {}
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !selectedProjectId || !user) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          projectId: selectedProjectId,
          authorId: user.id
        })
      });
      if (res.ok) {
        const newNote = await res.json();
        router.push(`/notes/${newNote.id}`);
      }
    } catch(e) {}
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Notes" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col items-start justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
             <h1 className="text-3xl font-black tracking-tight flex items-center space-x-2">
                <PenTool className="h-6 w-6 text-indigo-500" />
                <span>Knowledge Base</span>
             </h1>
             <p className="mt-1 text-sm text-slate-500">Collaborative technical documentation & specs.</p>
          </div>
          
          {projects.length > 0 && (
            <div className="flex items-center space-x-3">
              <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>New Doc</span>
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading library...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
             <FileText className="h-10 w-10 mx-auto text-slate-300 mb-4" />
             <p className="font-semibold text-lg">No Projects Available</p>
             <p className="text-sm text-slate-500">You need to be in a project to create documentation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
             <AnimatePresence>
               {notes.map((note, i) => (
                 <motion.div 
                   key={note.id} 
                   onClick={() => router.push(`/notes/${note.id}`)}
                   initial={{ opacity: 0, y: 15 }} 
                   animate={{ opacity: 1, y: 0 }} 
                   transition={{ delay: i * 0.05 }} 
                   className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all dark:border-slate-800 dark:bg-slate-800/40 dark:shadow-none"
                 >
                    <div className="absolute top-0 right-0 h-1 bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors w-full"></div>
                    <div>
                       <div className="flex items-start justify-between mb-4">
                          <div className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                             note.status === "Approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                             note.status === "Pending Review" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                             "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}>
                            {note.status}
                          </div>
                       </div>
                       <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white leading-tight">{note.title}</h3>
                       <p className="text-xs font-semibold text-slate-400 max-w-full overflow-hidden text-ellipsis whitespace-nowrap mb-6">
                         Last edited by {note.author?.name || "Unknown"}
                       </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                       <span className="text-[11px] font-medium text-slate-400">
                          {new Date(note.updatedAt).toLocaleDateString()}
                       </span>
                       <div className="flex -space-x-2">
                          <div className="h-6 w-6 rounded-full border-2 border-white bg-indigo-100 text-[10px] font-bold text-indigo-600 flex items-center justify-center dark:border-slate-800 dark:bg-indigo-900 dark:text-indigo-400">
                            {note.author?.name ? note.author.name.charAt(0) : "U"}
                          </div>
                          {note.approver && (
                            <div className="h-6 w-6 rounded-full border-2 border-white bg-emerald-100 text-[10px] font-bold text-emerald-600 flex items-center justify-center dark:border-slate-800 dark:bg-emerald-900 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                            </div>
                          )}
                       </div>
                    </div>
                 </motion.div>
               ))}
               
               {notes.length === 0 && (
                 <div className="col-span-full py-12 text-center text-slate-500">
                    No documents exist in this project yet. Break the ice!
                 </div>
               )}
             </AnimatePresence>
          </div>
        )}
      </main>

      {/* New Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="p-6">
                <h2 className="mb-4 text-xl font-bold">Name your Document</h2>
                <form onSubmit={handleCreateNote}>
                  <input 
                    required autoFocus type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} 
                    className="mb-6 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700" 
                    placeholder="e.g. Q3 Architecture Spec" 
                  />
                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                    <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700">Create</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
