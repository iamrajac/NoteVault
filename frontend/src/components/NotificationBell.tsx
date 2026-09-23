"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getActiveWorkspace, WORKSPACE_CHANGED_EVENT } from "@/lib/session";

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

const POLL_MS = 60_000;
// Fired after notifications are marked read so every bell on the page refreshes.
const CHANGED_EVENT = "nv-notifications-changed";

export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const ws = getActiveWorkspace();
    if (!ws) return;
    try {
      const res = await apiFetch(`/api/notifications/${ws.workspaceId}`);
      if (res.ok) setItems(await res.json());
    } catch {
      // Offline: keep showing what we have.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(WORKSPACE_CHANGED_EVENT, load);
    window.addEventListener(CHANGED_EVENT, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, load);
      window.removeEventListener(CHANGED_EVENT, load);
    };
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = items.filter((n) => !n.isRead).length;

  const openItem = async (n: Notification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      apiFetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })
        .then(() => window.dispatchEvent(new Event(CHANGED_EVENT)))
        .catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    const ws = getActiveWorkspace();
    if (!ws) return;
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    apiFetch(`/api/notifications/${ws.workspaceId}/read-all`, { method: "PATCH" })
      .then(() => window.dispatchEvent(new Event(CHANGED_EVENT)))
      .catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        <Bell className="h-5 w-5" />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openItem(n)}
                  className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${n.isRead ? "" : "bg-blue-50/60 dark:bg-blue-900/20"}`}
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
