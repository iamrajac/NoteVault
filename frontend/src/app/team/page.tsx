"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Users, Shield, User as UserIcon, X, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiAction, apiFetch, NETWORK_ERROR } from "@/lib/api";
import { saveUser, setActiveWorkspace } from "@/lib/session";
import { getActiveWorkspace } from "@/lib/session";

export default function TeamPage() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [inviteRole, setInviteRole] = useState("Employee");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const storedUser = localStorage.getItem("nv_user");
      const storedToken = localStorage.getItem("nv_token");
      
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Find active workspace (first one for now)
        if (parsedUser.workspaces?.length > 0) {
          const activeWs = getActiveWorkspace(parsedUser)!;
          setWorkspace(activeWs);
          
          try {
            const res = await apiFetch(`/api/workspaces/${activeWs.workspaceId}/members`);
            if (res.ok) {
              const data = await res.json();
              setMembers(data);
            }
          } catch (error) {
            console.error("Failed to fetch members");
          }
        }
      }
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");

    try {
      const res = await apiFetch(`/api/auth/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to invite user");
      } else {
        // The person appears in the member list once they accept.
        setInviteNotice(data.emailSent ? `Invitation sent to ${inviteEmail}.` : `Email could not be sent. Share this link with ${inviteEmail}: ${data.link}`);
        setIsModalOpen(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("Employee");
      }
    } catch (error) {
      setInviteError(NETWORK_ERROR);
    } finally {
      setInviteLoading(false);
    }
  };

  const isAdmin = workspace?.role === "Admin";
  const visibleMembers = members.filter((m) =>
    `${m.user.name || ""} ${m.user.email} ${m.role}`.toLowerCase().includes(memberSearch.trim().toLowerCase())
  );

  const handleRoleChange = async (member: any, role: string) => {
    const updated = await apiAction(`/api/workspaces/${workspace.workspaceId}/members/${member.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }, "Could not change the role.");
    if (updated) setMembers((prev) => prev.map((m) => (m.userId === member.userId ? { ...m, role: updated.role } : m)));
  };

  const handleRemove = async (member: any) => {
    const self = member.userId === user?.id;
    const who = member.user.name || member.user.email;
    const question = self
      ? "Leave this workspace? You will lose access to its projects and notes."
      : `Remove ${who} from the workspace? They lose access to all its projects, and their tasks become unassigned.`;
    if (!window.confirm(question)) return;

    const data = await apiAction(`/api/workspaces/${workspace.workspaceId}/members/${member.userId}`, { method: "DELETE" },
      self ? "Could not leave the workspace." : "Could not remove the member.");
    if (!data) return;
    if (self) {
      saveUser(data.user);
      const next = data.user.workspaces[0]?.workspaceId;
      if (next) setActiveWorkspace(next);
      window.location.href = "/dashboard";
    } else {
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Team" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage access and roles for your workspace.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search active members..."
                aria-label="Search members"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full rounded-2xl border-none bg-white py-2 pl-10 pr-4 text-sm shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:ring-slate-700 dark:focus:ring-blue-500 transition-all"
              />
            </div>
            {workspace?.role === "Admin" && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Invite User</span>
              </button>
            )}
          </div>
        </header>

        {inviteNotice && (
          <div className="mb-6 flex items-start justify-between gap-4 break-all rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
            <span>{inviteNotice}</span>
            <button onClick={() => setInviteNotice("")} aria-label="Dismiss" className="shrink-0"><X className="h-4 w-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {visibleMembers.map((member, i) => (
                <motion.div 
                  key={member.id} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: i * 0.05 }} 
                  className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl font-bold text-blue-600 shadow-inner dark:from-blue-900/40 dark:to-indigo-900/40 dark:text-blue-400">
                    {member.user.name ? member.user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate w-full text-center">
                    {member.user.name || "Unknown User"}
                  </h3>
                  <p className="mb-5 text-xs text-slate-500 truncate w-full text-center">
                    {member.user.email}
                  </p>
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      aria-label={`Role for ${member.user.name || member.user.email}`}
                      className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="Employee">Employee</option>
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      {member.role === "Admin" && <Shield className="h-3 w-3 text-purple-500" />}
                      {member.role === "Team Lead" && <Users className="h-3 w-3 text-blue-500" />}
                      {member.role === "Employee" && <UserIcon className="h-3 w-3 text-emerald-500" />}
                      <span>{member.role}</span>
                    </div>
                  )}
                  {(isAdmin || member.userId === user?.id) && (
                    <button onClick={() => handleRemove(member)} className="mt-3 text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
                      {member.userId === user?.id ? "Leave workspace" : "Remove"}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </main>

      {/* Admin Invite Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="text-lg font-bold">Invite New Workspace User</h2>
                <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleInvite} className="p-6">
                {inviteError && (
                  <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {inviteError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name (optional)</label>
                    <input 
                      type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" 
                      placeholder="Jane Doe" 
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                    <input 
                      required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" 
                      placeholder="jane@notevault.app" 
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Workspace Role</label>
                    <select 
                      value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
                    >
                      <option value="Employee">Employee (Task Updates Only)</option>
                      <option value="Team Lead">Team Lead (Creates Projects & Tasks)</option>
                      <option value="Admin">Admin (Full Workspace Management)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviteLoading} className="flex min-w-[120px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-70">
                    {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
