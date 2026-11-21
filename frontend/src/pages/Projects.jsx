import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangleIcon,
  ArrowBigDownDashIcon,
  EyeIcon,
  FullscreenIcon,
  LaptopIcon,
  Loader2Icon,
  MessageSquareIcon,
  SaveIcon,
  Share2Icon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import ProjectPreview from "../components/ProjectPreview";
import LoaderSteps from "../components/LoaderSteps";
import ShareDialog from "../components/ShareDialog";
import api from "@/configs/axios";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { assets } from "@/assets/assets";
import { CREDIT_COST, getErrorMessage } from "@/lib/constants";

const Projects = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isPending, setCredits, refreshCredits, credits } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [device, setDevice] = useState("desktop");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const previewRef = useRef(null);
  const touchStartXRef = useRef(null);
  const projectRef = useRef(null);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const dismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/user/project/${projectId}`);
      setProject(data.project);
      setLoadFailed(!data.project);
    } catch (error) {
      // Only show an error screen if we have nothing to show; otherwise keep
      // the last good data on screen and stay quiet during background refreshes
      if (!projectRef.current) {
        setLoadFailed(true);
        toast.error(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const saveProject = async () => {
    if (!previewRef.current) return;
    const code = previewRef.current.getCode();
    if (!code) return;
    setIsSaving(true);
    try {
      const { data } = await api.put(`/api/project/save/${projectId}`, {
        code,
      });
      toast.success(data.message);
      await fetchProject();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  // download code ( index.html )
  const downloadCode = () => {
    const code = previewRef.current?.getCode() || project?.current_code;
    if (!code) return;
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(file);
    element.href = url;
    element.download = "index.html";
    document.body.appendChild(element);
    element.click();
    element.remove();
    URL.revokeObjectURL(url);
  };

  const retryGeneration = async () => {
    setRetrying(true);
    try {
      const { data } = await api.post(`/api/user/project/${projectId}/retry`);
      if (typeof data.credits === "number") setCredits(data.credits);
      setProject((p) => ({ ...p, status: "generating", stage: "enhancing", error: "" }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (isPending) return;
    if (user) {
      fetchProject();
    } else {
      navigate("/auth/signin", {
        replace: true,
        state: { from: location.pathname },
      });
      toast("Please sign in to view your projects");
    }
  }, [user, isPending, fetchProject, navigate, location.pathname]);

  // While the AI is working, poll a tiny status endpoint and only reload the
  // whole project when something actually changed.
  useEffect(() => {
    if (project?.status !== "generating") return;
    const intervalId = setInterval(async () => {
      try {
        const { data: s } = await api.get(
          `/api/user/project/${projectId}/status`,
        );
        const p = projectRef.current;
        if (!p) return;
        const changed =
          s.status !== p.status ||
          s.stage !== p.stage ||
          s.hasCode !== Boolean(p.current_code) ||
          s.conversationCount !== p.conversation.length ||
          s.versionCount !== p.versions.length;
        if (changed) {
          await fetchProject();
          if (s.status !== "generating") refreshCredits();
        }
      } catch {
        // a missed poll is fine, the next one will catch up
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [project?.status, projectId, fetchProject, refreshCredits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2Icon className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || loadFailed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-screen bg-background text-foreground">
        <p className="text-2xl font-medium">We couldn&apos;t load this project</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchProject();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link
            to="/projects"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            My Projects
          </Link>
        </div>
      </div>
    );
  }

  const hasCode = Boolean(project.current_code);
  const isBuilding = !hasCode && project.status === "generating";
  // No code and not building: the first build failed (or was interrupted)
  const hasFailed = !hasCode && project.status !== "generating";
  const isBusy = project.status === "generating";

  return (
    <div className="flex flex-col h-dvh w-full bg-background text-foreground transition-colors duration-300">
      <ShareDialog
        open={shareOpen}
        project={project}
        onClose={() => setShareOpen(false)}
        onChange={(isPublished) => setProject((p) => ({ ...p, isPublished }))}
      />
      {/* builder navbar  */}
      <div className="flex flex-col gap-3 px-3 py-2 no-scrollbar border-b border-border shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-4">
        {/* left  */}
        <div className="flex items-center gap-2 min-w-0 sm:min-w-90 text-nowrap">
          <img
            src={assets.favicon}
            alt="logo"
            className="h-6 cursor-pointer invert dark:invert-0"
            onClick={() => navigate("/")}
          />
          <div className="max-w-[40vw] sm:max-w-xs">
            <p className="text-sm font-medium capitalize truncate">
              {project.name}
            </p>
            <p className="text-xs text-muted-foreground -mt-0.5">
              {isBusy
                ? "Working on it…"
                : project.isPublished
                  ? "Published"
                  : "Previewing last saved version"}
            </p>
          </div>
          <div className="ml-auto sm:hidden flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              disabled={!hasCode}
              aria-label="Share"
              className="size-8 rounded-md border border-border bg-background text-foreground flex items-center justify-center disabled:opacity-50"
            >
              <Share2Icon className="size-4" />
            </button>
            <Link
              target="_blank"
              to={`/projects/${projectId}/preview`}
              aria-label="Open full preview"
              className="size-8 rounded-md border border-border bg-background text-foreground flex items-center justify-center"
            >
              <FullscreenIcon className="size-4" />
            </Link>
            <button
              onClick={downloadCode}
              disabled={!hasCode}
              aria-label="Download code"
              className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              <ArrowBigDownDashIcon className="size-4" />
            </button>
          </div>
        </div>
        {/* middle  */}
        <div className="hidden sm:flex gap-1 bg-secondary border border-border p-1 rounded-md shadow-sm">
          {[
            ["phone", SmartphoneIcon, "Phone view"],
            ["tablet", TabletIcon, "Tablet view"],
            ["desktop", LaptopIcon, "Desktop view"],
          ].map(([name, Icon, label]) => (
            <button
              key={name}
              onClick={() => setDevice(name)}
              aria-label={label}
              title={label}
              className={`p-1 rounded transition-colors ${device === name ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
        {/* right  */}
        <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto sm:ml-auto sm:justify-end text-xs sm:text-sm font-medium">
          <button
            onClick={saveProject}
            disabled={isSaving || !hasCode || isBusy}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3.5 py-1.5 flex items-center gap-2 rounded-md transition-colors border border-border shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" size={16} />
            ) : (
              <SaveIcon size={16} />
            )}{" "}
            Save
          </button>
          <button
            onClick={() => setShareOpen(true)}
            disabled={!hasCode}
            className="flex justify-center items-center gap-2 px-4 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors text-foreground disabled:opacity-50"
          >
            <Share2Icon size={16} /> {project.isPublished ? "Shared" : "Share"}
          </button>
          <Link
            target="_blank"
            to={`/projects/${projectId}/preview`}
            className="flex justify-center items-center gap-2 px-4 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors text-foreground"
          >
            <FullscreenIcon size={16} /> Preview
          </Link>
          <button
            onClick={downloadCode}
            disabled={!hasCode}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 flex justify-center items-center gap-2 rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            <ArrowBigDownDashIcon size={16} /> Download
          </button>
        </div>
        {hasCode && (
          <div className="sm:hidden space-y-1 w-full">
            <div className="relative grid grid-cols-2 rounded-xl border border-border bg-secondary p-1">
              <span
                className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg border border-border bg-background shadow-sm transition-transform duration-300 ease-out ${isChatOpen ? "translate-x-[calc(100%+0.25rem)]" : "translate-x-0"}`}
              />
              <button
                onClick={() => {
                  dismissKeyboard();
                  setIsChatOpen(false);
                }}
                className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!isChatOpen ? "text-foreground" : "text-muted-foreground"}`}
              >
                <EyeIcon className="size-3.5" /> Preview
              </button>
              <button
                onClick={() => setIsChatOpen(true)}
                className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isChatOpen ? "text-foreground" : "text-muted-foreground"}`}
              >
                <MessageSquareIcon className="size-3.5" /> Chat
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Swipe left or right to switch
            </p>
          </div>
        )}
      </div>

      {isBuilding ? (
        <div className="flex-1 p-2 bg-muted/30">
          <div className="h-full rounded-xl max-sm:rounded-lg overflow-hidden border border-border shadow-sm">
            <LoaderSteps stage={project.stage} />
          </div>
        </div>
      ) : hasFailed ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <AlertTriangleIcon className="mx-auto size-8 text-destructive" />
            <h2 className="mt-3 text-lg font-semibold">
              We couldn&apos;t build your website
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.error || "Something went wrong while generating it."}{" "}
              Your credits were refunded.
            </p>
            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
              {project.initial_prompt}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={retryGeneration}
                disabled={retrying || (credits !== null && credits < CREDIT_COST)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {retrying && <Loader2Icon className="size-4 animate-spin" />}
                Try again ({CREDIT_COST} credits)
              </button>
              <Link
                to="/projects"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                My Projects
              </Link>
            </div>
            {credits !== null && credits < CREDIT_COST && (
              <p className="mt-3 text-xs text-destructive">
                You need {CREDIT_COST} credits to retry.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            className="sm:hidden relative flex-1 overflow-hidden bg-muted/30"
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const startX = touchStartXRef.current;
              touchStartXRef.current = null;

              if (startX === null) {
                return;
              }

              const endX = e.changedTouches[0]?.clientX;
              if (typeof endX !== "number") {
                return;
              }

              const deltaX = endX - startX;
              if (Math.abs(deltaX) < 60) {
                return;
              }

              if (deltaX < 0) {
                setIsChatOpen(true);
              } else {
                dismissKeyboard();
                setIsChatOpen(false);
              }
            }}
          >
            <div
              className={`flex h-full w-[200%] transition-transform duration-300 ease-out ${isChatOpen ? "-translate-x-1/2" : "translate-x-0"}`}
            >
              <div className="w-1/2 p-2">
                <ProjectPreview
                  ref={previewRef}
                  project={project}
                  isGenerating={false}
                  device={device}
                />
              </div>
              <div className="w-1/2 h-full">
                <Sidebar
                  project={project}
                  setProject={setProject}
                  refreshProject={fetchProject}
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-1 overflow-hidden bg-muted/30">
            <Sidebar
              project={project}
              setProject={setProject}
              refreshProject={fetchProject}
            />
            <div className="flex-1 p-2 pl-0">
              <ProjectPreview
                ref={previewRef}
                project={project}
                isGenerating={false}
                device={device}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Projects;
