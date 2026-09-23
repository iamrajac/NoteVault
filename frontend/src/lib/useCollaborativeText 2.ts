"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";
import { API_URL } from "./api";
import { getToken } from "./session";

export type LiveStatus = "connecting" | "live" | "offline" | "error";

const REMOTE = "remote";

// Binds a <textarea> to a shared Yjs text on the server so several people can edit at once without overwriting each other.
export function useCollaborativeText(noteId: string) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState(1);
  const [synced, setSynced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!noteId) return;
    const doc = new Y.Doc();
    const ytext = doc.getText("content");
    docRef.current = doc;
    setSynced(false);
    setStatus("connecting");

    const socket: Socket = io(API_URL, { auth: { token: getToken() }, transports: ["websocket", "polling"] });

    // Send our own edits to the server.
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin !== REMOTE && socket.connected) socket.emit("note-update", { noteId, update });
    });

    // Apply other people's edits to the textarea, keeping the local cursor in the right place.
    ytext.observe((event, transaction) => {
      if (transaction.origin !== REMOTE) return;
      const ta = textareaRef.current;
      let start = ta?.selectionStart ?? 0;
      let end = ta?.selectionEnd ?? 0;
      let index = 0;
      for (const op of event.delta) {
        if (op.retain) index += op.retain;
        else if (typeof op.insert === "string") {
          const len = op.insert.length;
          if (index < start) start += len;
          if (index < end) end += len;
          index += len;
        } else if (op.delete) {
          if (index < start) start -= Math.min(op.delete, start - index);
          if (index < end) end -= Math.min(op.delete, end - index);
        }
      }
      setContent(ytext.toString());
      if (ta && document.activeElement === ta) {
        requestAnimationFrame(() => ta.setSelectionRange(start, end));
      }
    });

    socket.on("connect", () => {
      setError(null);
      socket.emit("join-note", noteId, (ack: { ok: boolean; state?: ArrayBuffer; error?: string }) => {
        if (!ack?.ok || !ack.state) {
          setStatus("error");
          setError(ack?.error || "Could not open the note for live editing.");
          return;
        }
        const serverState = new Uint8Array(ack.state);
        // Send anything typed while offline, then take the server's state. Yjs merges both.
        const missing = Y.encodeStateAsUpdate(doc, Y.encodeStateVectorFromUpdate(serverState));
        Y.applyUpdate(doc, serverState, REMOTE);
        if (missing.length > 2) socket.emit("note-update", { noteId, update: missing });
        setContent(ytext.toString());
        setSynced(true);
        setStatus("live");
      });
    });
    socket.on("note-update", ({ update }: { update: ArrayBuffer }) => Y.applyUpdate(doc, new Uint8Array(update), REMOTE));
    socket.on("active-users", (count: number) => setActiveUsers(count));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", (err) => {
      setStatus("offline");
      if (err.message === "unauthorized") setError("Your session has expired. Please log in again.");
    });

    return () => {
      socket.emit("leave-note", noteId);
      socket.disconnect();
      doc.destroy();
      docRef.current = null;
    };
  }, [noteId]);

  // Turn a textarea change into the smallest delete + insert and apply it to the shared text.
  const onChange = useCallback((next: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const ytext = doc.getText("content");
    const prev = ytext.toString();
    let start = 0;
    while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
    let prevEnd = prev.length;
    let nextEnd = next.length;
    while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
      prevEnd--;
      nextEnd--;
    }
    doc.transact(() => {
      if (prevEnd > start) ytext.delete(start, prevEnd - start);
      if (nextEnd > start) ytext.insert(start, next.slice(start, nextEnd));
    });
    setContent(next);
  }, []);

  return { content, onChange, textareaRef, status, error, activeUsers, synced };
}
