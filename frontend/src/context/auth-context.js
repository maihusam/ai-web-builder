import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Usage: const { user, isPending, login, register, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
