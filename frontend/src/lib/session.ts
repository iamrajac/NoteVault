// Client-side session storage: the login token, the user, and which workspace is active.
const TOKEN_KEY = "nv_token";
const USER_KEY = "nv_user";
const ACTIVE_WS_KEY = "nv_active_workspace";
export const WORKSPACE_CHANGED_EVENT = "nv-workspace-changed";

export type WorkspaceMembership = {
  workspaceId: string;
  role: "Admin" | "Team Lead" | "Employee";
  workspace?: { id: string; name: string; colorTheme?: string | null };
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role?: string | null;
  activeWorkspaceId?: string | null;
  workspaces: WorkspaceMembership[];
};

const isBrowser = () => typeof window !== "undefined";

export function getToken(): string | null {
  return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

export function getUser(): SessionUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  saveUser(user);
  if (user.activeWorkspaceId) localStorage.setItem(ACTIVE_WS_KEY, user.activeWorkspaceId);
}

export function saveUser(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVE_WS_KEY);
}

// The workspace the user picked in the switcher, falling back to their first workspace.
export function getActiveWorkspace(user: SessionUser | null = getUser()): WorkspaceMembership | null {
  if (!user?.workspaces?.length) return null;
  const chosen = isBrowser() ? localStorage.getItem(ACTIVE_WS_KEY) : null;
  return (
    user.workspaces.find((w) => w.workspaceId === chosen) ||
    user.workspaces.find((w) => w.workspaceId === user.activeWorkspaceId) ||
    user.workspaces[0]
  );
}

export function setActiveWorkspace(workspaceId: string) {
  localStorage.setItem(ACTIVE_WS_KEY, workspaceId);
  window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT));
}

export const isManagerRole = (role?: string | null) => role === "Admin" || role === "Team Lead";
