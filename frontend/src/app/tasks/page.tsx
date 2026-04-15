"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, CheckSquare, Loader2, X, AlertCircle, User as UserIcon } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  
  // Data State
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDifficulty, setNewTaskDifficulty] = useState("1");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("auto");

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    setLoading(true);
    const storedUser = localStorage.getItem("nv_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.workspaces?.length > 0) {
        const activeWs = parsedUser.workspaces[0];
        setWorkspace(activeWs);
        try {
          const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/projects/${activeWs.workspaceId}?userId=${parsedUser.id}&userRole=${activeWs.role}`);
          if (pRes.ok) {
            const data = await pRes.json();
            setProjects(data);
            if (data.length > 0) {
              setSelectedProjectId(data[0].id);
            }
          }
          const mRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/workspaces/${activeWs.workspaceId}/members`);
          if (mRes.ok) setWorkspaceMembers(await mRes.json());
        } catch (error) {
          console.error("Failed to load generic projects data.");
        }
      }
    }
    setLoading(false);
  };

  const loadTasks = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/tasks/${projectId}`);
      if (res.ok) setTasks(await res.json());
    } catch(err) {}
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !workspace) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          name: newTaskName,
          description: newTaskDesc,
          priority: newTaskPriority,
          difficulty: newTaskDifficulty,
          assigneeId: newTaskAssignee,
          dueDate: newTaskDate || null,
          userRole: workspace.role
        })
      });

      if (res.ok) {
        setIsTaskModalOpen(false);
        setNewTaskName("");
        setNewTaskDesc("");
        setNewTaskPriority("Medium");
        setNewTaskDifficulty("1");
        setNewTaskDate("");
        setNewTaskAssignee("auto");
        loadTasks(selectedProjectId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic UI update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          userId: user?.id
        })
      });
    } catch (err) {
      // Revert if failed
      loadTasks(selectedProjectId);
    }
  };

  const canCreateTasks = workspace?.role === "Admin" || workspace?.role === "Team Lead";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Tasks" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage project action items.</p>
          </div>
          
          {projects.length > 0 && (
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-800">{p.name}</option>
                ))}
              </select>

              {canCreateTasks && (
                <button 
                  onClick={() => setIsTaskModalOpen(true)}
                  className="flex items-center space-x-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-700 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Task</span>
                </button>
              )}
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 py-24 text-center dark:border-slate-800">
            <AlertCircle className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-bold">No Projects Available</h3>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
              You must be a member of a project to view or manage its tasks.
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 py-24 text-center dark:border-slate-800">
            <CheckSquare className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-bold">No Tasks Yet</h3>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {canCreateTasks ? "Create a task to get your team started!" : "Waiting for your Team Lead to assign tasks."}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
             <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="pb-3 pl-2 pr-4 font-medium"><CheckSquare className="h-4 w-4" /></th>
                    <th className="pb-3 pr-4 font-medium">Task Name</th>
                    <th className="pb-3 pr-4 font-medium">Priority</th>
                    <th className="pb-3 pr-4 font-medium">Difficulty</th>
                    <th className="pb-3 pr-4 font-medium">Assignee</th>
                    <th className="pb-3 pr-4 font-medium">Due Date</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <AnimatePresence>
                    {tasks.map((task) => (
                      <motion.tr 
                        key={task.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-4 pl-2 pr-4">
                          <input 
                            type="checkbox" 
                            checked={task.status === "Done"}
                            onChange={() => handleStatusChange(task.id, task.status === "Done" ? "To Do" : "Done")}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer" 
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <p className={`font-medium ${task.status === "Done" ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                            {task.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-xs">{task.description}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            task.priority === "High" ? "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/20" :
                            task.priority === "Critical" ? "bg-purple-50 text-purple-700 ring-purple-600/10 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-500/20" :
                            "bg-slate-50 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                           <div className="flex space-x-1" title={`Level ${task.difficulty || 1}`}>
                              {[1,2,3,4,5].map(level => (
                                 <div key={level} className={`h-1.5 w-2.5 rounded-sm ${level <= (task.difficulty || 1) ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                              ))}
                           </div>
                        </td>
                        <td className="py-4 pr-4">
                           {task.assignees && task.assignees.length > 0 ? (
                              <div className="flex items-center space-x-2">
                                 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                    {task.assignees[0].user.name?.charAt(0).toUpperCase() || task.assignees[0].user.email?.charAt(0).toUpperCase() || "U"}
                                 </div>
                                 <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[100px] truncate">{task.assignees[0].user.name || task.assignees[0].user.email}</span>
                              </div>
                           ) : (
                              <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Unassigned</span>
                           )}
                        </td>
                        <td className="py-4 pr-4 text-slate-500 text-xs">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
                        </td>
                        <td className="py-4 pr-4">
                          <select 
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`rounded-xl border border-slate-300 bg-transparent px-3 py-1.5 text-xs font-semibold outline-none transition-all focus:ring-2 dark:border-slate-700 ${
                              task.status === "Done" ? "text-emerald-600 focus:ring-emerald-500" :
                              task.status === "In Progress" ? "text-blue-600 focus:ring-blue-500" :
                              "text-slate-600 dark:text-slate-400 focus:ring-slate-500"
                            }`}
                          >
                            <option value="To Do" className="dark:bg-slate-800">To Do</option>
                            <option value="In Progress" className="dark:bg-slate-800">In Progress</option>
                            <option value="Done" className="dark:bg-slate-800">Done</option>
                          </select>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Task Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, scaleY: 0.95 }}
              animate={{ scale: 1, opacity: 1, scaleY: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="text-lg font-bold">Create New Task</h2>
                <button onClick={() => setIsTaskModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Task Name</label>
                  <input required type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" placeholder="Update schema.prisma" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Description</label>
                  <textarea rows={2} value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700" placeholder="Optional details..." />
                </div>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium">Priority</label>
                    <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700">
                      <option value="Low" className="dark:bg-slate-800">Low</option>
                      <option value="Medium" className="dark:bg-slate-800">Medium</option>
                      <option value="High" className="dark:bg-slate-800">High</option>
                      <option value="Critical" className="dark:bg-slate-800">Critical</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium">Due Date</label>
                    <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium">Difficulty</label>
                    <select value={newTaskDifficulty} onChange={(e) => setNewTaskDifficulty(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700">
                       <option value="1" className="dark:bg-slate-800">1 - Trivial</option>
                       <option value="2" className="dark:bg-slate-800">2 - Easy</option>
                       <option value="3" className="dark:bg-slate-800">3 - Moderate</option>
                       <option value="4" className="dark:bg-slate-800">4 - Hard</option>
                       <option value="5" className="dark:bg-slate-800">5 - Extreme</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium">Assignee</label>
                    <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700">
                       <option value="auto" className="dark:bg-slate-800 font-bold text-blue-600">🌟 Auto Load-Balance</option>
                       <option value="" className="dark:bg-slate-800">Unassigned</option>
                       {workspaceMembers.map(m => (
                          <option key={m.userId} value={m.userId} className="dark:bg-slate-800">{m.user.name || m.user.email}</option>
                       ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsTaskModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700">Create Task</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
