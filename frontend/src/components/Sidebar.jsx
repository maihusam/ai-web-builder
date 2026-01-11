import { useEffect, useRef, useState } from "react";
import {
  BotIcon,
  EyeIcon,
  Loader2Icon,
  SendIcon,
  UserIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/configs/axios";
import { toast } from "sonner";

const Sidebar = ({
  isMenuOpen,
  project,
  setProject,
  isGenerating,
  setIsGenerating,
}) => {
  const messageRef = useRef(null);
  const [input, setInput] = useState("");

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/api/user/project/${project.id}`);
      setProject(data.project);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  const handleRollback = async (versionId) => {
    try {
      const confirm = window.confirm(
        "Are you sure you want to rollback to this version?",
      );
      if (!confirm) return;
      setIsGenerating(true);
      const { data } = await api.get(
        `/api/project/rollback/${project.id}/${versionId}`,
      );
      const { data: data2 } = await api.get(`/api/user/project/${project.id}`);
      toast.success(data.message);
      setProject(data2.project);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  const handleRevisions = async (e) => {
    e.preventDefault();
    let interval;
    try {
      setIsGenerating(true);
      interval = setInterval(() => {
        fetchProject();
      }, 10000);
      const { data } = await api.post(`/api/project/revision/${project.id}`, {
        message: input,
      });
      fetchProject();
      toast.success(data.message);
      setInput("");
      clearInterval(interval);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
      clearInterval(interval);
    }
  };

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [project.conversation.length, isGenerating]);

  return (
    <div
      className={`h-full sm:max-w-sm rounded-[5px] bg-card border-r border-border transition-all shadow-sm ${isMenuOpen ? "max-sm:w-0 overflow-hidden" : "w-full"}`}
    >
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
              const isMessage = "content" in message;

              if (isMessage) {
                const msg = message;
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
                        <BotIcon className="size-5 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 px-4 rounded-xl shadow-sm text-sm mt-5 leading-relaxed border ${isUser ? "bg-primary text-primary-foreground border-primary rounded-tr-none" : "rounded-tl-none bg-muted/50 text-foreground border-border"}`}
                    >
                      {msg.content}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                        <UserIcon className="size-5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              } else {
                const ver = message;
                return (
                  <div
                    key={ver.id}
                    className="w-4/5 mx-auto my-2 p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-2"
                  >
                    <div className="text-xs font-medium text-foreground">
                      Code updated <br />
                      <span className="text-muted-foreground text-xs font-normal">
                        {new Date(ver.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {project.current_version_index === ver.id ? (
                        <button className="px-3 py-1.5 rounded-md text-xs bg-secondary text-secondary-foreground font-medium">
                          Current version
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRollback(ver.id)}
                          className="px-3 py-1.5 rounded-md text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-colors"
                        >
                          Roll back
                        </button>
                      )}
                      <Link
                        target="_blank"
                        to={`/projects/${project.id}/versions/${ver.id}`}
                      >
                        <EyeIcon className="size-7 p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors rounded-md" />
                      </Link>
                    </div>
                  </div>
                );
              }
            })}
          {isGenerating && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
                <BotIcon className="size-5 text-primary-foreground" />
              </div>
              {/* three dot loader */}
              <div className="flex gap-1.5 h-full items-end pb-2">
                <span
                  className="size-2 rounded-full animate-bounce bg-muted-foreground"
                  style={{ animationDelay: "0s" }}
                />
                <span
                  className="size-2 rounded-full animate-bounce bg-muted-foreground"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="size-2 rounded-full animate-bounce bg-muted-foreground"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}
          <div ref={messageRef} />
        </div>
        {/* Input area */}
        <form onSubmit={handleRevisions} className="m-3 relative">
          <div className="flex items-center gap-2">
            <textarea
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
                  e.preventDefault();
                  if (!isGenerating && input.trim()) {
                    e.currentTarget.form.requestSubmit();
                  }
                }
              }}
              value={input}
              rows={4}
              placeholder="Describe your website or request changes..."
              className="flex-1 p-3 pr-14 rounded-xl resize-none text-sm outline-none border border-border bg-card text-card-foreground placeholder-muted-foreground transition-all focus:border-ring focus:ring-1 focus:ring-ring shadow-sm"
              disabled={isGenerating}
            />
            <button
              disabled={isGenerating || !input.trim()}
              className="absolute bottom-3 right-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2Icon className="size-8 p-1.5 animate-spin" />
              ) : (
                <SendIcon className="size-8 p-1.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sidebar;
