"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { ArrowLeft, Save, CheckCircle2, ShieldAlert, XCircle, Loader2, Tag, Plus, Link as LinkIcon, CheckSquare } from "lucide-react";

export default function CollaborativeEditor() {
  const { id: noteId } = useParams();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [note, setNote] = useState<any>(null);
  
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Draft");
  const [tags, setTags] = useState("");
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // New Link/Task states
  const [newTaskName, setNewTaskName] = useState("");
  const [newLinkedNoteId, setNewLinkedNoteId] = useState("");
  const [workspaceNotes, setWorkspaceNotes] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.workspaces?.length > 0) {
         setWorkspace(parsedUser.workspaces[0]);
         const ws = parsedUser.workspaces[0];
         // Pre-fetch notes for linking dropdown
         fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${ws.workspaceId}?userId=${parsedUser.id}&userRole=${ws.role}`)
           .then(res => res.json())
           .then(async (projects) => {
              if (projects.length > 0) {
                 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes/project/${projects[0].id}`);
                 if (res.ok) setWorkspaceNotes(await res.json());
              }
           });
      }
    }
    
    // Fetch initial Note Data
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes/${noteId}`)
      .then(res => res.json())
      .then(data => {
        setNote(data);
        setContent(data.content || "");
        setStatus(data.status);
        setTags(data.tags || "");
        setTasks(data.tasks || []);
        setLinks(data.linksOut || []);
      });
  }, [noteId]);

  useEffect(() => {
    const s = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}`);
    setSocket(s);
    s.emit("join-note", noteId);
    s.on("receive-note-change", (data) => {
      setContent(data.content);
    });
    setActiveUsers(Math.floor(Math.random() * 3) + 1);

    return () => {
      s.emit("leave-note", noteId);
      s.disconnect();
    };
  }, [noteId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (socket) socket.emit("note-change", { noteId, content: newContent });
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags })
      });
    } catch(e) {}
    setIsSaving(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes/${noteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          approverId: newStatus === "Approved" ? user.id : null
        })
      });
      if (res.ok) setStatus(newStatus);
    } catch(e) {}
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName || !note) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/tasks`, {
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          projectId: note.projectId,
          name: newTaskName,
          priority: "Medium",
          userRole: workspace?.role,
          noteId: note.id
        })
      });
      if (res.ok) {
        const t = await res.json();
        setTasks([...tasks, t]);
        setNewTaskName("");
      }
    } catch(e) {}
  };

  const handleLinkNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkedNoteId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/notes/${noteId}/links`, {
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ targetId: newLinkedNoteId })
      });
      if (res.ok) {
         setLinks([...links, { targetId: newLinkedNoteId, target: workspaceNotes.find(n => n.id === newLinkedNoteId) }]);
         setNewLinkedNoteId("");
      }
    } catch(e) {}
  };

  if (!note) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  const isApprover = workspace?.role === "Admin" || workspace?.role === "Team Lead";

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {/* Editor Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
         <header className="flex h-16 items-center justify-between border-b border-slate-200 px-4 md:px-8 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/notes')} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold md:text-base">{note.title}</h1>
              <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-500">
                <span>Authored by {note.author?.name}</span>
                {status === "Pending Review" && <span className="text-amber-500">Needs Approval</span>}
                {status === "Rejected" && <span className="text-red-500 flex items-center space-x-1"><XCircle className="h-3 w-3" /> <span>Rejected</span></span>}
                {status === "Approved" && <span className="text-emerald-500 flex items-center space-x-1"><CheckCircle2 className="h-3 w-3" /> <span>Approved</span></span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 mr-4">
              <span className="text-xs font-semibold text-slate-400">{activeUsers} online</span>
            </div>

            {/* Workflow Gates */}
            {(status === "Draft" || status === "Rejected") && (
              <button onClick={() => handleUpdateStatus("Pending Review")} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                Submit for Review
              </button>
            )}

            {status === "Pending Review" && isApprover && (
               <div className="flex space-x-2">
                  <button onClick={() => handleUpdateStatus("Rejected")} className="flex items-center space-x-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 shadow-md shadow-red-500/20">
                     <XCircle className="h-3.5 w-3.5" />
                     <span>Reject</span>
                  </button>
                  <button onClick={() => handleUpdateStatus("Approved")} className="flex items-center space-x-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-500/20">
                     <ShieldAlert className="h-3.5 w-3.5" />
                     <span>Approve</span>
                  </button>
               </div>
            )}

            <button onClick={handleManualSave} className="flex items-center space-x-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white active:scale-95">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden md:inline">Save</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-[#0B1120] relative">
          <div className="mx-auto max-w-4xl py-12 px-6">
             <textarea
                autoFocus
                value={content}
                onChange={handleChange}
                placeholder="Start typing your document..."
                className="w-full resize-none bg-transparent text-lg text-slate-700 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 min-h-[500px] leading-relaxed"
             />
          </div>
        </main>
      </div>

      {/* Utilities Sidebar */}
      <aside className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto shrink-0 flex flex-col space-y-6 p-6">
         
         {/* Metadata & Tagging */}
         <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center"><Tag className="h-4 w-4 mr-1.5" /> Note Tags</h3>
            <input 
               type="text" 
               value={tags} 
               onChange={(e) => setTags(e.target.value)} 
               placeholder="api, design, frontend..."
               className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700" 
            />
            <p className="text-[10px] text-slate-400 mt-1.5">Comma-separated keywords. Click Save on top right to assign.</p>
         </section>

         {/* Linked Tasks */}
         <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center"><CheckSquare className="h-4 w-4 mr-1.5" /> Mentioned Tasks</h3>
            <div className="space-y-2">
               {tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No tasks created off this note yet.</p>
               ) : (
                  tasks.map(t => (
                     <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-start">
                        <span className="text-xs font-semibold">{t.name}</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded">{t.status}</span>
                     </div>
                  ))
               )}
            </div>
            {isApprover && (
               <form onSubmit={handleCreateTask} className="mt-3 flex items-center space-x-2">
                  <input type="text" value={newTaskName} onChange={e=>setNewTaskName(e.target.value)} placeholder="New task name" className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700" />
                  <button type="submit" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-200 transition"><Plus className="h-4 w-4" /></button>
               </form>
            )}
         </section>

         {/* Referencing Links */}
         <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center"><LinkIcon className="h-4 w-4 mr-1.5" /> Note Links</h3>
            <div className="space-y-2">
               {links.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">This note doesn't reference any others.</p>
               ) : (
                  links.map(l => (
                     <div key={l.targetId} className="p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center">
                        <LinkIcon className="h-3 w-3 mr-2 text-slate-400" />
                        {l.target?.title || l.targetId}
                     </div>
                  ))
               )}
            </div>
            <form onSubmit={handleLinkNote} className="mt-3 flex flex-col space-y-2">
               <div className="flex space-x-2">
                  <select value={newLinkedNoteId} onChange={e=>setNewLinkedNoteId(e.target.value)} className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700">
                     <option value="">Select note...</option>
                     {workspaceNotes.filter(n => n.id !== noteId && !links.find(l => l.targetId === n.id)).map(n => (
                        <option key={n.id} value={n.id} className="dark:bg-slate-800">{n.title}</option>
                     ))}
                  </select>
                  <button type="submit" disabled={!newLinkedNoteId} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-300 transition disabled:opacity-50"><LinkIcon className="h-4 w-4" /></button>
               </div>
            </form>
         </section>

      </aside>

    </div>
  );
}
