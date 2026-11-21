import api from "@/configs/axios";
import { useAuth } from "@/context/auth-context";
import { Loader2Icon, PencilLineIcon, RocketIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CREDIT_COST,
  FREE_CREDITS,
  MAX_PROMPT_LENGTH,
  getErrorMessage,
} from "@/lib/constants";

const PENDING_KEY = "pendingPrompt";

const EXAMPLES = [
  "A portfolio site for a wedding photographer with a gallery and contact form",
  "A landing page for a mobile fitness app with pricing and testimonials",
  "A cozy coffee shop website with a menu, opening hours and a map section",
  "A personal blog homepage for a travel writer with a newsletter signup",
];

const STEPS = [
  {
    icon: PencilLineIcon,
    title: "Describe it",
    text: "Tell us what you need in plain English. More detail gives better results.",
  },
  {
    icon: SparklesIcon,
    title: "AI builds it",
    text: "We expand your idea and write a complete, responsive page.",
  },
  {
    icon: RocketIcon,
    title: "Refine & share",
    text: "Ask for changes in chat, roll back any time, then publish a link.",
  },
];

const readPending = () => {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
};
const writePending = (value) => {
  try {
    if (value) sessionStorage.setItem(PENDING_KEY, value);
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // storage can be blocked; the prompt just won't survive sign-in
  }
};

const Home = () => {
  const { user, isPending, credits, setCredits } = useAuth();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const outOfCredits = credits !== null && credits < CREDIT_COST;

  const isPhoneScreen = () => {
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    return viewportWidth <= 768;
  };

  const createProject = useCallback(
    async (prompt) => {
      setLoading(true);
      try {
        const { data } = await api.post("/api/user/project", {
          initial_prompt: prompt,
        });
        if (typeof data.credits === "number") setCredits(data.credits);
        navigate(`/projects/${data.projectId}`);
      } catch (error) {
        toast.error(getErrorMessage(error));
        setLoading(false);
      }
    },
    [navigate, setCredits],
  );

  // Coming back after signing in? Pick up the prompt they had typed
  useEffect(() => {
    if (isPending || !user) return;
    const saved = readPending();
    if (!saved) return;
    writePending(null);
    setInput(saved);
    toast("Welcome! Building the website you described…");
    createProject(saved);
  }, [isPending, user, createProject]);

  const onSubmitHandler = (e) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    if (!user) {
      writePending(prompt);
      toast("Sign in to build your website. We've saved what you wrote.");
      navigate("/auth/signup", { state: { from: "/" } });
      return;
    }
    if (outOfCredits) {
      toast.error("You're out of credits", {
        description: `Creating a website costs ${CREDIT_COST} credits.`,
      });
      return;
    }
    createProject(prompt);
  };

  return (
    <section className="flex flex-col items-center text-foreground text-sm pb-20 px-4 font-poppins pt-20">
      <h1 className="text-center text-[40px] leading-12 md:text-6xl md:leading-17.5 mt-4 font-semibold max-w-3xl">
        Build Simple Website using AI no code.
      </h1>

      <p className="text-center text-muted-foreground text-base max-w-md mt-4">
        Describe what you want, and let our AI create a fully functional,
        responsive website. No coding required.
      </p>

      <form
        onSubmit={onSubmitHandler}
        className="bg-card w-full max-w-2xl rounded-xl p-4 mt-12 border border-border shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (isPhoneScreen()) return;
            if (!e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              if (input.trim()) {
                e.currentTarget.form.requestSubmit();
              }
            }
          }}
          className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none w-full"
          rows={4}
          maxLength={MAX_PROMPT_LENGTH}
          aria-label="Describe your website"
          placeholder="Describe your perfect website in detail..."
          disabled={loading}
          required
        />
        <div className="flex items-center justify-between gap-3 mt-2">
          <span className="text-xs text-muted-foreground">
            {input.length > 0
              ? `${input.length}/${MAX_PROMPT_LENGTH}`
              : "Tip: mention style, sections and audience"}
          </span>
          <button
            disabled={loading || !input.trim()}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2 font-medium transition-colors disabled:opacity-60"
          >
            {!loading ? (
              <>
                Generate Website
                <span className="text-xs opacity-70">· {CREDIT_COST} credits</span>
              </>
            ) : (
              <>
                Starting <Loader2Icon className="animate-spin size-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-3 text-xs text-muted-foreground text-center">
        {!isPending && !user
          ? `New accounts get ${FREE_CREDITS} free credits.`
          : credits !== null
            ? outOfCredits
              ? "You're out of credits."
              : `You have ${credits} credits.`
            : " "}
      </p>

      <div className="mt-8 w-full max-w-2xl">
        <p className="text-xs text-muted-foreground mb-2 text-center">
          Not sure where to start? Try one:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => setInput(example)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-ring/50 transition-colors text-left"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-20 w-full max-w-4xl">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-4" />
                </span>
                <h3 className="font-medium">
                  {i + 1}. {title}
                </h3>
              </div>
              <p className="mt-3 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Home;
