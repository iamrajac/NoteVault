"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Shield, Loader2, CheckCircle2, AlertCircle, User as UserIcon } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiAction, apiFetch, errorMessage, NETWORK_ERROR } from "@/lib/api";
import { toastSuccess } from "@/lib/toast";
import { getActiveWorkspace, getUser, saveUser, setActiveWorkspace } from "@/lib/session";

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("General");
  
  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [displayName, setDisplayName] = useState("");



  useEffect(() => {
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setDisplayName(parsed.name || "");
      if (parsed.workspaces?.length > 0) {
         setWorkspace(getActiveWorkspace(parsed)!);
         setName(getActiveWorkspace(parsed)!.workspace?.name || "");
      }
    }
  }, []);

  const [generalError, setGeneralError] = useState("");
  const isAdmin = workspace?.role === "Admin";

  const handleSaveGeneral = async () => {
    if (!workspace) return;
    setGeneralError("");
    setLoading(true);
    try {
      const res = await apiFetch(`/api/workspaces/${workspace.workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const updatedWs = await res.json();
        const storedUser = getUser();
        if (storedUser) {
          saveUser({
            ...storedUser,
            workspaces: storedUser.workspaces.map((w) =>
              w.workspaceId === updatedWs.id ? { ...w, workspace: { ...w.workspace!, name: updatedWs.name } } : w
            ),
          });
        }
        window.location.reload();
      } else {
        setGeneralError(await errorMessage(res, "Could not save workspace settings."));
      }
    } catch(e) {
      setGeneralError(NETWORK_ERROR);
    }
    setLoading(false);
  };
  
  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    const data = await apiAction("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name: displayName }) }, "Could not save your profile.");
    setLoading(false);
    if (data) {
      saveUser(data.user);
      setUser(data.user);
      toastSuccess("Profile saved.");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace) return;
    const wsName = workspace.workspace?.name || "this workspace";
    const typed = window.prompt(`This permanently deletes "${wsName}" with all its projects, notes and tasks for everyone.\n\nType the workspace name to confirm:`);
    if (typed === null) return;
    if (typed.trim() !== wsName) {
      window.alert("The name didn't match, so nothing was deleted.");
      return;
    }
    const data = await apiAction(`/api/workspaces/${workspace.workspaceId}`, { method: "DELETE" }, "Could not delete the workspace.");
    if (!data) return;
    saveUser(data.user);
    const next = data.user.workspaces[0]?.workspaceId;
    if (next) setActiveWorkspace(next);
    window.location.href = next ? "/dashboard" : "/";
  };

  const handleSaveSecurity = async () => {
    setPassError(""); setPassSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
       setPassError("All fields are required.");
       return;
    }
    if (newPassword.length < 8) {
       setPassError("New password must be at least 8 characters.");
       return;
    }
    if (newPassword !== confirmPassword) {
       setPassError("New passwords do not match.");
       return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/auth/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
         setPassError(data.error || "Failed to update password.");
      } else {
         setPassSuccess("Password updated successfully!");
         setCurrentPassword("");
         setNewPassword("");
         setConfirmPassword("");
      }
    } catch(e) {
      setPassError("Network Error. Ensure backend is running.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Settings" />

      <main className="flex-1 p-4 md:p-8">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your preferences and workspace configuration.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            {[
              { id: "General", icon: SettingsIcon },
              { id: "Profile", icon: UserIcon },
              { id: "Security", icon: Shield }
            ].map((tab) => (
              <button 
                 key={tab.id} 
                 onClick={() => { setActiveTab(tab.id); setPassError(""); setPassSuccess(""); }}
                 className={`flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                <tab.icon className="h-4 w-4" />
                <span>{tab.id}</span>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 lg:col-span-3">
             
            {activeTab === "General" && (
                <>
                  <h2 className="mb-6 text-lg font-bold">General Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Workspace Name</label>
                      <input type="text" value={name} disabled={!isAdmin} title={isAdmin ? undefined : "Only workspace Admins can rename the workspace"} onChange={(e) => setName(e.target.value)} className="w-full max-w-md disabled:opacity-60 rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" />
                    </div>
                    <div className="flex items-center pt-4">
                      {generalError && <p className="mr-4 self-center text-sm text-red-600 dark:text-red-400">{generalError}</p>}
                      <button onClick={handleSaveGeneral} disabled={loading || !isAdmin} className="rounded-xl flex items-center space-x-2 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </>
            )}

            {activeTab === "General" && isAdmin && (
                <div className="mt-10 rounded-2xl border border-red-200 p-5 dark:border-red-900/50">
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Delete workspace</h3>
                  <p className="mt-1 text-sm text-slate-500">Permanently deletes this workspace and everything in it for all members. This cannot be undone.</p>
                  <button onClick={handleDeleteWorkspace} className="mt-4 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                    Delete workspace
                  </button>
                </div>
            )}

            {activeTab === "Profile" && (
                <>
                  <h2 className="mb-6 text-lg font-bold">Your Profile</h2>
                  <div className="max-w-md space-y-6">
                    <div>
                      <label htmlFor="display-name" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
                      <input id="display-name" type="text" maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" />
                    </div>
                    <div>
                      <p className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</p>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                    <button onClick={handleSaveProfile} disabled={loading || !displayName.trim()} className="flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Save Profile</span>
                    </button>
                  </div>
                </>
            )}

            {activeTab === "Security" && (
                <>
                  <h2 className="mb-6 text-lg font-bold">Account Security</h2>
                  
                  {passError && (
                     <div className="mb-4 flex items-center space-x-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" /><span>{passError}</span>
                     </div>
                  )}
                  {passSuccess && (
                     <div className="mb-4 flex items-center space-x-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /><span>{passSuccess}</span>
                     </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full max-w-md rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" placeholder="Required to make changes" />
                    </div>
                    <hr className="max-w-md border-slate-100 dark:border-slate-800" />
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full max-w-md rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" placeholder="Minimum 8 characters" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full max-w-md rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" />
                    </div>
                    
                    <div className="pt-4">
                      <button onClick={handleSaveSecurity} disabled={loading} className="rounded-xl flex items-center space-x-2 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        <span>Update Password</span>
                      </button>
                    </div>
                  </div>
                </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
