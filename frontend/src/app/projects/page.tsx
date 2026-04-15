"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FolderKanban, MoreHorizontal, Loader2, X, Users, Link as LinkIcon, Copy, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ProjectsPage() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Project Modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  
  // Add Member to Project Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Invite Link Generation Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      if (parsedUser.workspaces?.length > 0) {
        const activeWs = parsedUser.workspaces[0];
        setWorkspace(activeWs);
        
        try {
          // Fetch Projects based on role visibility
          const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${activeWs.workspaceId}?userId=${parsedUser.id}&userRole=${activeWs.role}`);
          if (pRes.ok) setProjects(await pRes.json());

          // Pre-fetch workspace members for the "Add Member" dropdown
          const mRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${activeWs.workspaceId}/members`);
          if (mRes.ok) setWorkspaceMembers(await mRes.json());
          
        } catch (error) {
          console.error("Failed to load projects");
        }
      }
    }
    setLoading(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !user) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          workspaceId: workspace.workspaceId,
          userId: user.id,
          userRole: workspace.role
        })
      });

      if (res.ok) {
        setIsProjectModalOpen(false);
        setNewProjectName("");
        setNewProjectDesc("");
        loadData(); // Refresh list
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || (!selectedUserId && !inviteEmail) || !workspace) return;
    setLoading(true);

    try {
      if (inviteEmail) {
         // Invite external by email
         const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${selectedProjectId}/invite-email`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ email: inviteEmail, inviterRole: workspace.role, workspaceId: workspace.workspaceId })
         });
         if (res.ok) {
           setIsMemberModalOpen(false);
           setInviteEmail("");
           setSelectedUserId("");
           loadData();
         }
      } else {
         // Add existing workspace member
         const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${selectedProjectId}/members`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ targetUserId: selectedUserId, inviterRole: workspace.role })
         });
         if (res.ok) {
           setIsMemberModalOpen(false);
           setSelectedUserId("");
           setInviteEmail("");
           loadData(); // Refresh to update member counts
         }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateLink = async (projectId: string) => {
    if (!workspace) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${projectId}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterRole: workspace.role,
          workspaceId: workspace.workspaceId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedLink(data.link);
        setIsLinkModalOpen(true);
        setCopiedLink(false);
      }
    } catch (err) {
      console.error("Link Generation Failed");
    }
  };

  const mapToClipBoard = () => {
     navigator.clipboard.writeText(generatedLink);
     setCopiedLink(true);
     setTimeout(() => setCopiedLink(false), 2000);
  };

  const canManageProjects = workspace?.role === "Admin" || workspace?.role === "Team Lead";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Projects" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Handle your workspace initiatives.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full rounded-2xl border-none bg-white py-2 pl-10 pr-4 text-sm shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:ring-slate-700 dark:focus:ring-blue-500 transition-all"
              />
            </div>
            {canManageProjects && (
              <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center space-x-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : projects.length === 0 ? (
           <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 py-24 text-center dark:border-slate-800">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
               <FolderKanban className="h-8 w-8" />
             </div>
             <h3 className="mb-1 text-lg font-bold">No Projects Found</h3>
             <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
               {canManageProjects ? "Create your first project to organize tasks and assign team members." : "You haven't been assigned to any projects yet."}
             </p>
           </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {projects.map((p, i) => (
                <motion.div 
                  key={p.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }} 
                  className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      
                      {canManageProjects && (
                        <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button 
                            onClick={() => handleGenerateLink(p.id)}
                            title="Generate Invite Link"
                            className="flex items-center justify-center rounded-full bg-slate-100 p-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setIsMemberModalOpen(true);
                            }}
                            title="Add Existing Member"
                            className="flex items-center justify-center rounded-full bg-slate-100 p-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                    <p className="mb-6 line-clamp-2 text-xs text-slate-500">{p.description || "No description provided."}</p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
                      <Users className="h-4 w-4" />
                      <span>{p._count?.members || 1} Members</span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium dark:bg-slate-800">
                      {p._count?.tasks || 0} Tasks
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="text-lg font-bold">New Project</h2>
                <button onClick={() => setIsProjectModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Project Name</label>
                  <input required type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" placeholder="Website Redesign" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Description</label>
                  <textarea rows={3} value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" placeholder="What is this initiative about?" />
                </div>
                <div className="mt-8 flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700">Create</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="text-lg font-bold">Add Member to Project</h2>
                <button onClick={() => setIsMemberModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Select Workspace Member</label>
                  <select 
                    value={selectedUserId} 
                    onChange={(e) => { setSelectedUserId(e.target.value); setInviteEmail(""); }} 
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
                  >
                    <option value="">Select a user...</option>
                    {workspaceMembers.map(m => (
                      <option key={m.userId} value={m.userId} className="dark:bg-slate-800">
                        {m.user.name || m.user.email} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center py-2">
                   <div className="h-px w-full bg-slate-200 dark:bg-slate-700"></div>
                   <span className="px-3 text-xs text-slate-400">OR</span>
                   <div className="h-px w-full bg-slate-200 dark:bg-slate-700"></div>
                </div>

                <div>
                   <label className="mb-1.5 block text-sm font-medium">Invite by Email (External)</label>
                   <input 
                     type="email" 
                     value={inviteEmail} 
                     onChange={(e) => { setInviteEmail(e.target.value); setSelectedUserId(""); }} 
                     placeholder="colleague@domain.com" 
                     className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" 
                   />
                </div>
                <div className="mt-8 flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsMemberModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700">Add Member</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Link Modal */}
      <AnimatePresence>
        {isLinkModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex flex-col items-center justify-center border-b border-slate-100 p-6 text-center dark:border-slate-800">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                   <LinkIcon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold">Project Invite Link Generated</h2>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">Send this link to anyone you want to join this project as an Employee. They will authenticate and be automatically assigned.</p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center space-x-2">
                   <input readOnly value={generatedLink} className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" />
                   <button 
                     onClick={mapToClipBoard}
                     className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                   >
                     {copiedLink ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                   </button>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button onClick={() => setIsLinkModalOpen(false)} className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">Done</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
