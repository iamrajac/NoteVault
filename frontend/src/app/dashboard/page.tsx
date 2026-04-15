"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Bell, Plus, FolderKanban, 
  CheckSquare, Settings, History, Users,
  MoreHorizontal, Laptop, Loader2, Flag
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  
  // Real Data Streams
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [membersCount, setMembersCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nv_token");
    const storedUser = localStorage.getItem("nv_user");
    
    if (!token || !storedUser) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const ws = parsedUser.workspaces || [];
      setAvailableWorkspaces(ws);
      if (ws.length > 0) {
        setActiveWorkspace(ws[0]);
      }
    } catch (err) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    if (activeWorkspace && user) {
      loadDashboardData();
    }
  }, [activeWorkspace, user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Real Workspace Members Count
      const mRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${activeWorkspace.workspaceId}/members`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMembersCount(mData.length);
      }

      // 2. Fetch Real Projects Visible to User
      const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${activeWorkspace.workspaceId}?userId=${user.id}&userRole=${activeWorkspace.role}`);
      let loadProjects = [];
      if (pRes.ok) {
        loadProjects = await pRes.json();
        setProjects(loadProjects);
      }

      // 3. Fetch Tasks across all those visible projects
      if (loadProjects.length > 0) {
        const taskPromises = loadProjects.map((p: any) => fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/tasks/${p.id}`));
        const responses = await Promise.all(taskPromises);
        let allTasks: any[] = [];
        for (const r of responses) {
          if (r.ok) allTasks = allTasks.concat(await r.json());
        }
        
        // Embellish tasks with project name
        allTasks = allTasks.map(t => ({
          ...t,
          projectName: loadProjects.find((p: any) => p.id === t.projectId)?.name || "Unknown"
        }));
        
        setTasks(allTasks);
      } else {
        setTasks([]);
      }
      
      const bmRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/milestones/workspace/${activeWorkspace.workspaceId}`);
      if (bmRes.ok) setMilestones(await bmRes.json());

      const activityRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${activeWorkspace.workspaceId}/changelog`);
      if (activityRes.ok) setActivityEvents(await activityRes.json());

    } catch (error) {
      console.error("Dashboard Load Error");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("nv_token");
    localStorage.removeItem("nv_user");
    router.push("/");
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    const membership = availableWorkspaces.find(
      (m: any) => m.workspaceId === workspaceId
    );
    if (membership) {
      setActiveWorkspace(membership);
    }
  };

  // Stats Logic
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Done").length;
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Done").length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const today = new Date();
  today.setHours(0,0,0,0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const allEvents = [
    ...tasks.filter(t => t.dueDate && t.status !== "Done").map(t => ({ id: `t_${t.id}`, title: t.name, date: new Date(t.dueDate), type: "task" })),
    ...milestones.filter(m => m.dueDate && m.status !== "Completed").map(m => ({ id: `m_${m.id}`, title: m.name, date: new Date(m.dueDate), type: "milestone" }))
  ].sort((a,b) => a.date.getTime() - b.date.getTime());
  
  const upcomingEvents = allEvents.filter(e => e.date >= today && e.date <= nextWeek);

  if (!user || !activeWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Dashboard" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeWorkspace.workspace?.name || "Dashboard"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {activeWorkspace.role} Access • Welcome back, {user.name}!
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {availableWorkspaces.length > 1 && (
              <div className="hidden items-center space-x-2 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 md:flex">
                <span className="text-slate-500 dark:text-slate-400">Workspace</span>
                <select
                  value={activeWorkspace.workspaceId}
                  onChange={(e) => handleWorkspaceChange(e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-slate-100"
                >
                  {availableWorkspaces.map((m: any) => (
                    <option key={m.workspaceId} value={m.workspaceId} className="dark:bg-slate-800">
                      {m.workspace.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full rounded-2xl border-none bg-white py-2 pl-10 pr-4 text-sm shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:ring-slate-700 dark:focus:ring-blue-500 transition-all"
              />
            </div>
            <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-50 dark:ring-slate-900"></span>
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.push('/projects')}
              className="flex items-center space-x-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Drive Plans</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
             <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Real Stats Grid */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Projects</h3>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold">{projects.length}</span>
                  <span className="text-xs font-medium text-emerald-500">+1 new</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tasks</h3>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold">{totalTasks}</span>
                  <span className="text-xs font-medium text-slate-400">{completionPercentage}% completion</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-3xl border border-red-200 bg-gradient-to-br from-white to-red-50/50 p-6 shadow-sm dark:border-red-900/30 dark:from-slate-800/50 dark:to-red-900/10">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue Tasks</h3>
                  <div className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    <Settings className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-red-600 dark:text-red-400">{overdueTasks}</span>
                  <span className="text-xs font-medium text-red-500">Action needed</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Team Members</h3>
                  <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-medium dark:border-slate-800 dark:bg-slate-700 ${i > membersCount ? 'hidden' : ''}`}>
                        U{i}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-slate-500">Total: {membersCount}</span>
                </div>
              </motion.div>
            </div>

            {/* Dash Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                {/* Real Task List */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Latest Pending Tasks</h2>
                    <button onClick={() => router.push('/tasks')} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</button>
                  </div>

                  {tasks.filter(t => t.status !== "Done").length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No active tasks remaining. Clean slate!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                            <th className="pb-3 pl-2 pr-4 font-medium"><CheckSquare className="h-4 w-4" /></th>
                            <th className="pb-3 pr-4 font-medium">Task Name</th>
                            <th className="pb-3 pr-4 font-medium">Project</th>
                            <th className="pb-3 pr-4 font-medium">Due Date</th>
                            <th className="pb-3 pr-4 font-medium">Priority</th>
                            <th className="pb-3 pr-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <AnimatePresence>
                            {tasks.filter(t => t.status !== "Done").slice(0, 5).map((row, i) => (
                              <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="py-3 pl-2 pr-4">
                                  <input readOnly type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={false} />
                                </td>
                                <td className="py-3 pr-4 font-medium text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">{row.name}</td>
                                <td className="py-3 pr-4 text-slate-500">{row.projectName}</td>
                                <td className="py-3 pr-4 text-slate-500">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "No Date"}</td>
                                <td className="py-3 pr-4">
                                  <span className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                    row.priority === "High" ? "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/20" :
                                    row.priority === "Critical" ? "bg-purple-50 text-purple-700 ring-purple-600/10 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-500/20" :
                                    "bg-slate-50 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                                  }`}>
                                    {row.priority}
                                  </span>
                                </td>
                                <td className="py-3 pr-2">
                                  <span className={`flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide border ${
                                    row.status === "In Progress" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400" :
                                    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full content-[''] ${
                                      row.status === "In Progress" ? "bg-blue-500" : "bg-slate-400"
                                    }`}></span>
                                    <span>{row.status}</span>
                                  </span>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Real Project Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AnimatePresence>
                    {projects.slice(0, 2).map(p => (
                      <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            <Laptop className="h-5 w-5" />
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </div>
                        <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                        <p className="mb-4 text-xs text-slate-500">{p._count?.tasks || 0} trackable items</p>
                        <div className="flex items-center space-x-3">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: "20%" }}></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {projects.length === 0 && (
                      <div className="col-span-2 rounded-3xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                        <p className="text-sm text-slate-500">No active projects available.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Removing Activity Feed / Upcoming Deadlines static dummy data for now to ensure a pristine dashboard */}
              <div className="space-y-8">
                 <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
                    <h2 className="mb-6 text-lg font-bold">Activity Feed</h2>
                    {loading ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
                      </div>
                    ) : activityEvents.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        No recent activity to show in your workspace yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activityEvents.slice(0, 5).map((event) => (
                          <div key={event.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                                  {event.type === 'Task' ? <CheckSquare className="h-5 w-5" /> : event.type === 'Document' ? <FolderKanban className="h-5 w-5" /> : <History className="h-5 w-5" />}
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold text-slate-900 dark:text-white">{event.author}</span> {event.action}
                                  </p>
                                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{event.title}</p>
                                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{event.project} • {event.date}</p>
                                </div>
                              </div>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                {event.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
                 <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
                    <h2 className="mb-6 text-lg font-bold flex items-center justify-between">
                       <span>Upcoming Deadlines</span>
                       <span className="text-xs font-medium text-slate-400">Next 7 days</span>
                    </h2>
                    {upcomingEvents.length > 0 ? (
                       <div className="space-y-4">
                          {upcomingEvents.map(e => (
                             <div key={e.id} className={`flex items-start space-x-3 p-3 rounded-xl border ${e.type==='task' ? 'border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'border-orange-100 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/30'}`}>
                               <div className={`mt-0.5 ${e.type === 'task' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                  {e.type === 'task' ? <CheckSquare className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                               </div>
                               <div>
                                  <p className={`text-sm font-semibold ${e.type === 'task' ? 'text-emerald-900 dark:text-emerald-100' : 'text-orange-900 dark:text-orange-100'}`}>{e.title}</p>
                                  <p className={`text-xs ${e.type === 'task' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>{e.date.toLocaleDateString()}</p>
                               </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-slate-500">
                        No immediate deadlines crossing this week.
                      </div>
                    )}
                 </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
