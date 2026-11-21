import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import api from "@/configs/axios";
import { FREE_CREDITS, getErrorMessage } from "@/lib/constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rough strength score from 0 to 4, only used to give the user feedback
const passwordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
};
const STRENGTH_LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-lime-500",
  "bg-green-500",
];

const inputClass = (hasError) =>
  `w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring ${hasError ? "border-destructive" : "border-border"}`;

function Field({ id, label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const { action } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isPending, login, register, resetPassword } = useAuth();

  // signin (default) | signup | forgot | reset
  const mode = ["signup", "forgot", "reset"].includes(action) ? action : "signin";
  const isSignUp = mode === "signup";
  const resetToken = searchParams.get("token") || "";

  // Send people back to the page that sent them here
  const from = location.state?.from || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  if (!isPending && user && !loading) {
    return <Navigate to={from} replace />;
  }

  const needsName = isSignUp;
  const needsEmail = mode !== "reset";
  const needsPassword = mode !== "forgot";
  const checksPasswordLength = isSignUp || mode === "reset";

  const errors = {
    name: needsName && !name.trim() ? "Please enter your name" : "",
    email: !needsEmail
      ? ""
      : !email.trim()
        ? "Please enter your email"
        : !EMAIL_PATTERN.test(email.trim())
          ? "That doesn't look like a valid email"
          : "",
    password: !needsPassword
      ? ""
      : !password
        ? "Please enter your password"
        : checksPasswordLength && password.length < 8
          ? "Use at least 8 characters"
          : "",
  };
  const strength = passwordStrength(password);

  const show = (field) => (touched[field] ? errors[field] : "");
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setTouched({ name: true, email: true, password: true });
    if (errors.name || errors.email || errors.password) return;

    setLoading(true);
    try {
      if (mode === "forgot") {
        await api.post("/api/auth/forgot", { email: email.trim() });
        setForgotSent(true);
        setLoading(false);
        return;
      }
      if (mode === "reset") {
        await resetPassword(resetToken, password);
      } else if (isSignUp) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate(mode === "reset" ? "/" : from, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setLoading(false);
    }
  };

  const titles = {
    signin: ["Welcome back", "Sign in to continue building your websites."],
    signup: [
      "Create your account",
      `Start with ${FREE_CREDITS} free credits. No card needed.`,
    ],
    forgot: [
      "Reset your password",
      "Enter your email and we'll send you a reset link.",
    ],
    reset: ["Choose a new password", "Pick something you haven't used before."],
  };
  const [title, subtitle] = titles[mode];
  const buttonLabel = {
    signin: "Sign in",
    signup: "Create account",
    forgot: "Send reset link",
    reset: "Update password",
  }[mode];

  if (mode === "reset" && !resetToken) {
    return (
      <main className="p-6 flex flex-col justify-center items-center min-h-[80vh]">
        <div className="w-full max-w-sm bg-card border border-border shadow-sm rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold">This reset link isn&apos;t valid</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Request a new one and try again.
          </p>
          <Link
            to="/auth/forgot"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Send me a new link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 flex flex-col justify-center items-center min-h-[80vh]">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm bg-card border border-border shadow-sm rounded-xl p-6 flex flex-col gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        {forgotSent ? (
          <div
            role="status"
            className="rounded-md border border-border bg-muted px-3 py-3 text-sm text-foreground"
          >
            If <strong>{email}</strong> has an account, a reset link is on its
            way. It&apos;s valid for 1 hour.
          </div>
        ) : (
          <>
            {formError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            {needsName && (
              <Field id="name" label="Name" error={show("name")}>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={touch("name")}
                  aria-invalid={Boolean(show("name"))}
                  className={inputClass(show("name"))}
                />
              </Field>
            )}

            {needsEmail && (
              <Field id="email" label="Email" error={show("email")}>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={touch("email")}
                  aria-invalid={Boolean(show("email"))}
                  className={inputClass(show("email"))}
                />
              </Field>
            )}

            {needsPassword && (
              <Field
                id="password"
                label={mode === "reset" ? "New password" : "Password"}
                error={show("password")}
              >
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp || mode === "reset" ? "new-password" : "current-password"}
                    placeholder={checksPasswordLength ? "At least 8 characters" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={touch("password")}
                    aria-invalid={Boolean(show("password"))}
                    className={`${inputClass(show("password"))} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
                {checksPasswordLength && password && (
                  <div className="flex items-center gap-2" aria-live="polite">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className={`h-1 flex-1 rounded-full ${strength >= level ? STRENGTH_COLORS[strength] : "bg-border"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                )}
                {mode === "signin" && (
                  <Link
                    to="/auth/forgot"
                    className="self-end text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </Field>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 font-medium transition-colors disabled:opacity-60"
            >
              {loading && <Loader2Icon className="animate-spin size-4" />}
              {buttonLabel}
            </button>
          </>
        )}

        <p className="text-sm text-muted-foreground text-center">
          {mode === "forgot" || mode === "reset" ? (
            <Link to="/auth/signin" className="text-primary hover:underline">
              Back to sign in
            </Link>
          ) : (
            <>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <Link
                to={isSignUp ? "/auth/signin" : "/auth/signup"}
                state={location.state}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
