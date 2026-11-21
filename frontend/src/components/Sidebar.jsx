import { useEffect, useRef, useState } from "react";
import {
  BotIcon,
  EyeIcon,
  Loader2Icon,
  SendIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/configs/axios";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import ConfirmDialog from "./ConfirmDialog";
import {
  CREDIT_COST,
  MAX_PROMPT_LENGTH,
  getErrorMessage,
} from "@/lib/constants";

const STAGE_LABELS = {
  enhancing: "Understanding your request…",
  generating: "Writing the changes…",
  saving: "Saving your website…",
};

const Sidebar = ({ project, setProject, refreshProject }) => {
  const { credits, setCredits, refreshCredits } = useAuth();
  const messageRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The message the user just sent, shown immediately instead of waiting for the server
  const [pending, setPending] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);

  const busy = submitting || project.status === "generating";
  const outOfCredits = credits !== null && credits < CREDIT_COST;

  const detectPhoneScreen = () => {
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    return viewportWidth <= 1024;
  };

  const [isPhoneScreen, setIsPhoneScreen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return detectPhoneScreen();
  });

  useEffect(() => {
    const updatePhoneScreenState = () => {
      setIsPhoneScreen(detectPhoneScreen());
    };

    updatePhoneScreenState();
    window.addEventListener("resize", updatePhoneScreenState);
    window.visualViewport?.addEventListener("resize", updatePhoneScreenState);

    return () => {
      window.removeEventListener("resize", updatePhoneScreenState);
      window.visualViewport?.removeEventListener(
        "resize",
        updatePhoneScreenState,
      );
    };
  }, []);

  const confirmRollback = async () => {
    const versionId = rollbackTarget;
    setRollingBack(true);
    try {
      const { data } = await api.get(
        `/api/project/rollback/${project.id}/${versionId}`,
      );
      toast.success(data.message);
      await refreshProject();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRollingBack(false);
      setRollbackTarget(null);
    }
  };

  const sendRevision = async (text) => {
    if (busy || !text.trim()) {
      return;
    }

    if (outOfCredits) {
      toast.error("You're out of credits", {
        description: `Each change costs ${CREDIT_COST} credits.`,
      });
      return;
    }

    if (isPhoneScreen || detectPhoneScreen()) {
      textareaRef.current?.blur();
    }

    const userMessagesAtSend = project.conversation.filter(
      (m) => m.role === "user",
    ).length;
    const controller = new AbortController();
    abortRef.current = controller;

    setSubmitting(true);
    setPending({ text, userMessagesAtSend });
    setInput("");
    // Show "working" straight away; the poll in the page keeps the real stage updated
    setProject((p) => ({ ...p, status: "generating", stage: "enhancing" }));

    let cancelled = false;
    try {
      const { data } = await api.post(
        `/api/project/revision/${project.id}`,
        { message: text },
        { signal: controller.signal },
      );
      if (typeof data.credits === "number") setCredits(data.credits);
      toast.success(data.message);
    } catch (error) {
      if (error.code === "ERR_CANCELED") {
        cancelled = true;
        toast("Cancelled. Your credits are being refunded.");
      } else {
        // Put the text back so the user doesn't have to retype it
        setInput(text);
        toast.error(getErrorMessage(error), {
          description: "Your credits were refunded.",
          action: { label: "Retry", onClick: () => sendRevision(text) },
        });
      }
    } finally {
      abortRef.current = null;
      // After a cancel, give the server a moment to roll back before reloading
      if (cancelled) await new Promise((r) => setTimeout(r, 1200));
      await refreshProject();
      refreshCredits();
      setPending(null);
      setSubmitting(false);
    }
  };

  const showPending =
    pending &&
    project.conversation.filter((m) => m.role === "user").length <=
      pending.userMessagesAtSend;

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [project.conversation.length, busy, showPending]);

  const renderBubble = (key, role, content) => {
    const isUser = role === "user";
    return (
      <div
        key={key}
        className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
            <BotIcon className="size-5 text-primary-foreground" />
          </div>
        )}
        <div
          className={`max-w-[85%] sm:max-w-[80%] p-3 px-4 rounded-xl shadow-sm text-sm mt-5 leading-relaxed border wrap-break-word ${isUser ? "bg-primary text-primary-foreground border-primary rounded-tr-none" : "rounded-tl-none bg-muted/50 text-foreground border-border"}`}
        >
          {content}
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
            <UserIcon className="size-5 text-secondary-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full sm:max-w-sm sm:w-full rounded-[5px] bg-card border-r border-border transition-all shadow-sm">
      <ConfirmDialog
        open={Boolean(rollbackTarget)}
        title="Roll back to this version?"
        description="Your website will switch to this version. You can switch back to any version from the chat."
        confirmLabel="Roll back"
        loading={rollingBack}
        onConfirm={confirmRollback}
        onCancel={() => setRollbackTarget(null)}
      />
      <div className="flex flex-col h-full bg-background border border-border sm:m-2 sm:rounded-xl shadow-sm">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col gap-4 py-4">
          {[...project.conversation, ...project.versions]
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            )
            .map((message) => {
              if ("content" in message) {
                return renderBubble(message.id, message.role, message.content);
              }
              const ver = message;
              return (
                <div
                  key={ver.id}
                  className="w-full sm:w-4/5 mx-auto my-2 p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-2"
                >
                  <div className="text-xs font-medium text-foreground">
                    {ver.description === "Manual edit"
                      ? "Manual edit saved"
                      : "Code updated"}{" "}
                    <br />
                    <span className="text-muted-foreground text-xs font-normal">
                      {new Date(ver.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    {project.current_version_index === ver.id ? (
                      <span className="px-3 py-1.5 rounded-md text-xs bg-secondary text-secondary-foreground font-medium">
                        Current version
                      </span>
                    ) : (
                      <button
                        onClick={() => setRollbackTarget(ver.id)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-md text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-colors disabled:opacity-50"
                      >
                        Roll back
                      </button>
                    )}
                    <Link
                      target="_blank"
                      to={`/projects/${project.id}/versions/${ver.id}`}
                      aria-label="Preview this version"
                    >
                      <EyeIcon className="size-7 p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors rounded-md" />
                    </Link>
                  </div>
                </div>
              );
            })}

          {showPending && renderBubble("pending", "user", pending.text)}

          {busy && (
            <div className="flex items-start gap-3 justify-start" role="status">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
                <BotIcon className="size-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-sm text-muted-foreground">
                  {STAGE_LABELS[project.stage] || "Working on it…"}
                </span>
                <div className="flex gap-1.5">
                  {[0, 0.2, 0.4].map((delay) => (
                    <span
                      key={delay}
                      className="size-2 rounded-full animate-bounce bg-muted-foreground"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messageRef} />
        </div>

        {/* Input area */}
        <div className="m-3">
          {outOfCredits && (
            <p className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              You&apos;re out of credits. Each change costs {CREDIT_COST}{" "}
              credits.
            </p>
          )}
          <div className="relative flex items-center gap-2">
            <textarea
              ref={textareaRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (isPhoneScreen || detectPhoneScreen()) return;
                if (!e.shiftKey && !e.ctrlKey) {
                  e.preventDefault();
                  sendRevision(input);
                }
              }}
              value={input}
              rows={4}
              maxLength={MAX_PROMPT_LENGTH}
              enterKeyHint="enter"
              placeholder="Describe your website or request changes..."
              aria-label="Describe a change to your website"
              className="flex-1 p-3 pr-14 rounded-xl resize-none text-sm outline-none border border-border bg-card text-card-foreground placeholder-muted-foreground transition-all focus:border-ring focus:ring-1 focus:ring-ring shadow-sm"
              disabled={busy}
            />
            {submitting ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Cancel this change"
                title="Cancel and refund credits"
                className="absolute bottom-3 right-3 rounded-full bg-destructive text-white shadow-sm"
              >
                <XIcon className="size-8 p-1.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => sendRevision(input)}
                disabled={busy || !input.trim() || outOfCredits}
                aria-label="Send"
                title={`Costs ${CREDIT_COST} credits`}
                className="absolute bottom-3 right-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all disabled:opacity-60"
              >
                {busy ? (
                  <Loader2Icon className="size-8 p-1.5 animate-spin" />
                ) : (
                  <SendIcon className="size-8 p-1.5" />
                )}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Each change costs {CREDIT_COST} credits
            {credits !== null && ` · ${credits} left`}
            {input.length > MAX_PROMPT_LENGTH * 0.8 &&
              ` · ${input.length}/${MAX_PROMPT_LENGTH}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
