import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/configs/axios";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(null);
  const [isPending, setIsPending] = useState(true);

  // On page load, ask the backend "who am I?" using the login cookie
  useEffect(() => {
    let cancelled = false;

    api
      .get("/api/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data.user);
        setCredits(data.user.credits ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null); // 401 just means "not logged in"
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser);
    setCredits(nextUser.credits ?? null);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/api/auth/login", { email, password });
      applyUser(data.user);
    },
    [applyUser],
  );

  const register = useCallback(
    async (name, email, password) => {
      const { data } = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });
      return data; // { needsVerification, email }: the user logs in after verifying
    },
    [],
  );

  const verifyEmail = useCallback(
    async (email, otp) => {
      const { data } = await api.post("/api/auth/verify-email", { email, otp });
      applyUser(data.user);
    },
    [applyUser],
  );

  const resendOtp = useCallback(async (email) => {
    await api.post("/api/auth/resend-otp", { email });
  }, []);

  const resetPassword = useCallback(
    async (token, password) => {
      const { data } = await api.post("/api/auth/reset", { token, password });
      applyUser(data.user);
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    setCredits(null);
  }, []);

  // Call after anything that spends or refunds credits
  const refreshCredits = useCallback(async () => {
    try {
      const { data } = await api.get("/api/user/credits");
      setCredits(data.credits);
    } catch {
      // the balance is informational; ignore failures
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      credits,
      setCredits,
      refreshCredits,
      isPending,
      login,
      register,
      verifyEmail,
      resendOtp,
      resetPassword,
      logout,
    }),
    [user, credits, refreshCredits, isPending, login, register, verifyEmail, resendOtp, resetPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
