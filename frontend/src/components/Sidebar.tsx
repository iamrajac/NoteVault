"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, FolderKanban, CheckSquare, 
  Users, Settings, History, LogOut, FileText, Network, Flag, Calendar
} from "lucide-react";
import { apiFetch, errorMessage } from "@/lib/api";
import { clearSession, getActiveWorkspace, getUser, saveUser, setActiveWorkspace, type SessionUser } from "@/lib/session";
import NotificationBell from "@/components/NotificationBell";

const NEW_WORKSPACE = "__new__";

export default function Sidebar({ activePage }: { activePage: string }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [taskCount, setTaskCount] = useState<number>(0);

  useEffect(() => {
    const stored = getUser();
    setUser(stored);
    setActiveWorkspaceId(getActiveWorkspace(stored)?.workspaceId || "");
  }, []);

  useEffect(() => {
    const loadTaskCount = async () => {
      const activeWorkspace = getActiveWorkspace();
      if (!activeWorkspace) return;

      try {
        const projectsRes = await apiFetch(`/api/projects/${activeWorkspace.workspaceId}`);
        if (!projectsRes.ok) return;
        const projects = await projectsRes.json();

        const responses = await Promise.all(projects.map((project: any) => apiFetch(`/api/tasks/${project.id}`)));
        let allTasks: any[] = [];
        for (const res of responses) {
          if (res.ok) allTasks = allTasks.concat(await res.json());
        }
        setTaskCount(allTasks.filter((task) => task.status !== "Done").length);
      } catch (error) {
        console.error("Sidebar task count error:", error);
      }
    };

    loadTaskCount();
  }, []);

  const handleWorkspaceSelect = async (value: string) => {
    if (value === NEW_WORKSPACE) {
      const name = window.prompt("Name for the new workspace:")?.trim();
      if (!name) return;
      const res = await apiFetch("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
      if (!res.ok) {
        window.alert(await errorMessage(res, "Could not create the workspace."));
        return;
      }
      const data = await res.json();
      saveUser(data.user);
      value = data.workspace.id;
    }
    setActiveWorkspace(value);
    // Reload so every page fetches data for the newly selected workspace.
    window.location.reload();
  };

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const navItems = [
    { id: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { id: "Calendar", href: "/calendar", icon: Calendar },
    { id: "Projects", href: "/projects", icon: FolderKanban },
    { id: "Tasks", href: "/tasks", icon: CheckSquare, badge: taskCount > 0 ? taskCount.toString() : undefined },
    { id: "Milestones", href: "/milestones", icon: Flag },
    { id: "Notes", href: "/notes", icon: FileText },
    { id: "Graph View", href: "/graph", icon: Network },
    { id: "Team", href: "/team", icon: Users },
    { id: "Settings", href: "/settings", icon: Settings },
    { id: "Changelog", href: "/changelog", icon: History },
  ];

  return (
    <aside className="border-b bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:w-64 md:border-b-0 md:border-r md:p-6 flex flex-col min-h-screen">
      <div className="mb-8 flex items-center space-x-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <LayoutDashboard className="h-4 w-4" />
        </div>
        <span className="flex-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">NoteVault</span>
        <NotificationBell align="left" />
      </div>

      {user && user.workspaces?.length > 0 && (
        <div className="mb-6 px-2">
          <label htmlFor="workspace-switcher" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </label>
          <select
            id="workspace-switcher"
            value={activeWorkspaceId}
            onChange={(e) => handleWorkspaceSelect(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {user.workspaces.map((w) => (
              <option key={w.workspaceId} value={w.workspaceId}>
                {w.workspace?.name || "Workspace"} ({w.role})
              </option>
            ))}
            <option value={NEW_WORKSPACE}>+ New workspace…</option>
          </select>
        </div>
      )}

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-4 w-4 ${isActive ? "text-blue-700 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                <span>{item.id}</span>
              </div>
              {item.badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Summary */}
      {user && (
        <div className="mt-auto hidden pt-8 md:block">
          <div className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 ring-4 ring-white dark:bg-orange-900/30 dark:text-orange-400 dark:ring-slate-900">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
            <button onClick={handleLogout} aria-label="Log out" className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
