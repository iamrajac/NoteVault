"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, CheckSquare, Flag, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      const storedUser = localStorage.getItem("nv_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.workspaces?.length > 0) {
           try {
              const ws = parsed.workspaces[0];
              const mRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5069'}/api/milestones/workspace/${ws.workspaceId}`);
              
              if (mRes.ok) {
                 const milestones = await mRes.json();
                 let flatEvents: any[] = [];
                 
                 milestones.forEach((m: any) => {
                    if (m.dueDate) {
                       flatEvents.push({
                          id: `m_${m.id}`, type: "milestone", title: m.name, date: new Date(m.dueDate), status: m.status
                       });
                    }
                    m.tasks?.forEach((t: any) => {
                       if (t.dueDate) {
                          flatEvents.push({
                             id: `t_${t.id}`, type: "task", title: t.name, date: new Date(t.dueDate), status: t.status
                          });
                       }
                    });
                 });
                 
                 setEvents(flatEvents);
              }
           } catch(e) {}
        }
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  
  const gridCells = [];
  for (let i = 0; i < firstDay; i++) {
     gridCells.push(<div key={`empty-${i}`} className="min-h-[100px] border border-slate-200/50 bg-slate-50 dark:border-slate-800/50 dark:bg-slate-900/50"></div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
     const dayEvents = events.filter(e => e.date.getDate() === d && e.date.getMonth() === currentDate.getMonth() && e.date.getFullYear() === currentDate.getFullYear());
     
     gridCells.push(
        <div key={`day-${d}`} className="min-h-[120px] border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-800 transition hover:bg-slate-50 dark:hover:bg-slate-700">
           <span className={`text-sm font-bold ${d === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? "flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-300"}`}>
             {d}
           </span>
           <div className="mt-2 space-y-1.5">
             {dayEvents.map(evt => (
               <div key={evt.id} className={`flex items-center space-x-1.5 rounded p-1 text-[10px] font-bold shadow-sm ${evt.type === 'milestone' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'}`}>
                 {evt.type === 'milestone' ? <Flag className="h-3 w-3 shrink-0" /> : <CheckSquare className="h-3 w-3 shrink-0" />}
                 <span className="truncate">{evt.title}</span>
               </div>
             ))}
           </div>
        </div>
     );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 duration-300 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
      <Sidebar activePage="Calendar" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
          <div>
            <h1 className="flex items-center space-x-3 text-3xl font-black tracking-tight">
               <CalendarIcon className="h-7 w-7 text-indigo-500" />
               <span>Master Deadlines</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">Track all milestone launches and task deadlines in one unified view.</p>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center space-x-1.5"><div className="h-3 w-3 rounded-full bg-orange-400"></div><span>Milestone</span></div>
                <div className="flex items-center space-x-1.5"><div className="h-3 w-3 rounded-full bg-emerald-400"></div><span>Task</span></div>
             </div>
             <div className="flex space-x-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><ArrowLeft className="h-4 w-4" /></button>
                <div className="flex items-center px-4 font-bold text-sm w-36 justify-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><ArrowRight className="h-4 w-4" /></button>
             </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
        ) : (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
             
             <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 pt-4 pb-2 dark:border-slate-800 dark:bg-slate-800/80">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                   <div key={day} className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">{day}</div>
                ))}
             </div>
             
             <div className="grid grid-cols-7">
                {gridCells}
             </div>
             
          </motion.div>
        )}
      </main>
    </div>
  );
}
