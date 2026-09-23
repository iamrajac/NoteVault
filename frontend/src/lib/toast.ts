// Tiny global toast: call toastError()/toastSuccess() from anywhere; <Toaster /> in the root layout shows them.
export type Toast = { id: number; kind: "error" | "success"; message: string };
export const TOAST_EVENT = "nv-toast";

let nextId = 1;
function emit(kind: Toast["kind"], message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Toast>(TOAST_EVENT, { detail: { id: nextId++, kind, message } }));
}

export const toastError = (message: string) => emit("error", message);
export const toastSuccess = (message: string) => emit("success", message);
