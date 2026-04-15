"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, FolderKanban, CheckSquare, 
  Users, Settings, History, LogOut, FileText, Network, Flag, Calendar
} from "lucide-react";

export default function Sidebar({ activePage }: { activePage: string }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [taskCount, setTaskCount] = useState<number>(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const loadTaskCount = async () => {
      const storedUser = localStorage.getItem("nv_user");
      if (!storedUser) return;

      try {
        const parsed = JSON.parse(storedUser);
        const activeWorkspace = parsed.workspaces?.[0];
        if (!activeWorkspace) return;

        const projectsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${activeWorkspace.workspaceId}?userId=${parsed.id}&userRole=${activeWorkspace.role}`);
        if (!projectsRes.ok) return;
        const projects = await projectsRes.json();

        const taskPromises = projects.map((project: any) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/tasks/${project.id}`)
        );
        const responses = await Promise.all(taskPromises);

        let allTasks: any[] = [];
        for (const res of responses) {
          if (res.ok) {
            allTasks = allTasks.concat(await res.json());
          }
        }

        const openTasks = allTasks.filter((task) => task.status !== 'Done').length;
        setTaskCount(openTasks);
      } catch (error) {
        console.error('Sidebar task count error:', error);
      }
    };

    loadTaskCount();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nv_token");
    localStorage.removeItem("nv_user");
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
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">NoteVault</span>
      </div>

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
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
