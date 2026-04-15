"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, CheckSquare, FileText, Activity, Clock, Box, Plus, MessageSquare
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ChangelogPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  
  const [annotatingId, setAnnotatingId] = useState<string | null>(null);
  const [annotationText, setAnnotationText] = useState("");

  const loadData = () => {
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed.workspaces?.length > 0) {
         setWorkspace(parsed.workspaces[0]);
         fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${parsed.workspaces[0].workspaceId}/changelog`)
           .then(res => res.json())
           .then(data => {
              setEvents(data);
              setLoading(false);
           });
      }
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddAnnotation = async (e: React.FormEvent, targetId: string) => {
    e.preventDefault();
    if (!annotationText || !workspace) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${workspace.workspaceId}/changelog/annotations`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            targetId,
            text: annotationText,
            authorId: user.id,
            authorName: user.name
         })
      });
      if (res.ok) {
         setAnnotatingId(null);
         setAnnotationText("");
         loadData();
      }
    } catch(err) {}
  };

  const getEventIcon = (type: string) => {
    if (type === "Document") return <FileText className="h-5 w-5 text-indigo-500" />;
    if (type === "Task") return <CheckSquare className="h-5 w-5 text-emerald-500" />;
    return <Activity className="h-5 w-5 text-blue-500" />;
  };

  const isApprover = workspace?.role === "Admin" || workspace?.role === "Team Lead";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Changelog" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-end md:space-y-0 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div>
             <h1 className="text-3xl font-black tracking-tight flex items-center space-x-2">
                <Activity className="h-6 w-6 text-indigo-500" />
                <span>Workspace Audit Log</span>
             </h1>
             <p className="mt-1 text-sm text-slate-500 max-w-lg">
                Your authenticated workspace activity feed. Track everything that happens across your projects in real-time.
             </p>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
             <input
               type="text"
               placeholder="Search activity..."
               className="w-full md:w-80 rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
             />
          </div>
        </header>

        {loading ? (
           <div className="flex justify-center p-12"><Activity className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : events.length === 0 ? (
           <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
              <Clock className="h-10 w-10 mx-auto text-slate-300 mb-4" />
              <p className="font-semibold text-lg">No Recent Activity</p>
              <p className="text-sm text-slate-500">Your workspace is incredibly quiet. Create a task or note to get started.</p>
           </div>
        ) : (
           <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 py-4 space-y-8">
             <AnimatePresence>
               {events.map((evt, i) => (
                 <motion.div 
                   key={evt.id} 
                   initial={{ opacity: 0, x: -20 }} 
                   animate={{ opacity: 1, x: 0 }} 
                   transition={{ delay: i * 0.05 }} 
                   className="relative pl-8"
                 >
                    {/* Event Node */}
                    <div className="absolute -left-[18px] top-1.5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 bg-white shadow-sm dark:border-slate-900 dark:bg-slate-800">
                        {getEventIcon(evt.type)}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/40 hover:shadow-md transition-shadow">
                       <div className="flex flex-col md:flex-row md:items-start justify-between">
                          <div className="flex-1 pr-6">
                             <div className="flex items-center space-x-2 mb-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-400">
                                   {evt.authorImage}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                   <span className="font-bold text-slate-900 dark:text-white">{evt.author}</span> {evt.action}
                                </p>
                             </div>
                             
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white">{evt.title}</h3>
                             <div className="mt-3 flex items-center space-x-3 mb-4">
                               <span className="flex items-center space-x-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  <Box className="h-3 w-3 mr-1" />
                                  {evt.project}
                               </span>
                               <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                  {evt.type}
                               </span>
                             </div>

                             {/* Annotations */}
                             {evt.annotations && evt.annotations.length > 0 && (
                               <div className="mt-4 space-y-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                                  {evt.annotations.map((a: any) => (
                                     <div key={a.id} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-50 dark:border-indigo-900/40">
                                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">{a.authorName} <span className="font-normal text-slate-500 ml-1">annotated</span></p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{a.text}</p>
                                     </div>
                                  ))}
                               </div>
                             )}

                             {/* Add Annotation Form */}
                             {annotatingId === evt.id ? (
                               <form onSubmit={(e) => handleAddAnnotation(e, evt.id)} className="mt-4 flex space-x-2">
                                  <input autoFocus type="text" value={annotationText} onChange={e=>setAnnotationText(e.target.value)} placeholder="Add specific release details, context, etc..." className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700" />
                                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700">Save</button>
                                  <button type="button" onClick={() => setAnnotatingId(null)} className="text-slate-500 text-sm px-2">Cancel</button>
                               </form>
                             ) : isApprover && (
                               <button onClick={() => setAnnotatingId(evt.id)} className="mt-4 flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 opacity-60 hover:opacity-100 transition">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span>Annotate Change</span>
                               </button>
                             )}

                          </div>
                          
                          <div className="mt-4 md:mt-0 text-xs font-semibold text-slate-400 flex items-center space-x-1.5 shrink-0">
                             <Clock className="h-3.5 w-3.5" />
                             <span>{evt.date}</span>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           </div>
        )}
      </main>
    </div>
  );
}
