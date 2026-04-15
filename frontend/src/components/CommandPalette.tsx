"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckSquare, Flag, Loader2 } from "lucide-react";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{notes:any[], tasks:any[], milestones:any[]}>({notes:[], tasks:[], milestones:[]});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults({notes:[], tasks:[], milestones:[]});
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const storedUser = localStorage.getItem("nv_user");
        if (storedUser) {
           const parsed = JSON.parse(storedUser);
           if (parsed.workspaces?.length > 0) {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${parsed.workspaces[0].workspaceId}/search?q=${encodeURIComponent(query)}`);
              if (res.ok) setResults(await res.json());
           }
        }
      } catch(e) {}
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 pt-[10vh] backdrop-blur-sm p-4">
      {/* Click outside to close map wrapper */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-800">
           <Search className="h-5 w-5 text-slate-400" />
           <input
             autoFocus
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="w-full bg-transparent p-4 text-sm outline-none placeholder:text-slate-400 dark:text-white"
             placeholder="Search across notes, tasks, and milestones..."
           />
           {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <div className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">ESC</div>}
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
           {!query ? (
              <div className="p-8 text-center text-sm text-slate-400">Type something to trigger a workspace search</div>
           ) : (results.notes.length === 0 && results.tasks.length === 0 && results.milestones.length === 0 && !loading) ? (
              <div className="p-8 text-center text-sm text-slate-400">No results found for "{query}"</div>
           ) : (
              <div className="space-y-4 p-2">
                 {results.notes.length > 0 && (
                    <div>
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-2 flex items-center space-x-1.5"><FileText className="h-3.5 w-3.5"/><span>Notes</span></h4>
                       {results.notes.map(n => (
                          <div key={n.id} onClick={() => { setIsOpen(false); router.push(`/notes/${n.id}`); }} className="flex items-center space-x-3 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                             <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500"><FileText className="h-4 w-4" /></div>
                             <div>
                                <p className="text-sm font-semibold dark:text-slate-200">{n.title}</p>
                                <p className="text-xs text-slate-400 line-clamp-1">{n.content}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
                 {results.tasks.length > 0 && (
                    <div>
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-2 flex items-center space-x-1.5"><CheckSquare className="h-3.5 w-3.5"/><span>Tasks</span></h4>
                       {results.tasks.map(t => (
                          <div key={t.id} onClick={() => { setIsOpen(false); router.push(`/tasks`); }} className="flex items-center space-x-3 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                             <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500"><CheckSquare className="h-4 w-4" /></div>
                             <div>
                                <p className="text-sm font-semibold dark:text-slate-200">{t.name}</p>
                                <p className="text-xs text-slate-400 line-clamp-1">{t.description}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
                 {results.milestones.length > 0 && (
                    <div>
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-2 flex items-center space-x-1.5"><Flag className="h-3.5 w-3.5"/><span>Milestones</span></h4>
                       {results.milestones.map(m => (
                          <div key={m.id} onClick={() => { setIsOpen(false); router.push(`/milestones`); }} className="flex items-center space-x-3 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                             <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-500"><Flag className="h-4 w-4" /></div>
                             <div>
                                <p className="text-sm font-semibold dark:text-slate-200">{m.name}</p>
                                <p className="text-xs text-slate-400 line-clamp-1">{m.description}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
