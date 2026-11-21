import { CheckIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

// These match the `stage` values the backend sets while it works
const steps = [
  { stage: "enhancing", label: "Understanding your idea" },
  { stage: "generating", label: "Writing your website" },
  { stage: "saving", label: "Saving & finishing up" },
];

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const LoaderSteps = ({ stage = "enhancing" }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.stage === stage),
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background relative overflow-hidden text-foreground px-6">
      <div className="absolute inset-0 bg-primary/5 blur-3xl animate-pulse"></div>

      <div className="relative z-10 w-full max-w-xs" role="status" aria-live="polite">
        <h2 className="text-lg font-medium text-center">
          Building your website
        </h2>
        <ol className="mt-6 space-y-3">
          {steps.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li
                key={step.stage}
                className={`flex items-center gap-3 text-sm transition-opacity ${done || active ? "opacity-100" : "opacity-40"}`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {done ? (
                    <CheckIcon className="size-3.5" />
                  ) : active ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : null}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Elapsed {formatElapsed(elapsed)} · this can take a few minutes
          (free AI model)
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          You can leave this page. We&apos;ll keep building and it will be in My
          Projects.
        </p>
      </div>
    </div>
  );
};

export default LoaderSteps;
