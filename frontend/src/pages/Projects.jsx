import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowBigDownDashIcon,
  EyeIcon,
  FullscreenIcon,
  LaptopIcon,
  Loader2Icon,
  MessageSquareIcon,
  SaveIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import ProjectPreview from "../components/ProjectPreview";
import LoaderSteps from "../components/LoaderSteps";
import api from "@/configs/axios";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { assets } from "@/assets/assets";

const Projects = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isGenerating, setIsGenerating] = useState(true);
  const [device, setDevice] = useState("desktop");

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewRef = useRef(null);
  const touchStartXRef = useRef(null);

  const dismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/api/user/project/${projectId}`);
      setProject(data.project);
      setIsGenerating(data.project.current_code ? false : true);
      setLoading(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

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
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    } finally {
      setIsSaving(false);
    }
  };

  // download code ( index.html )
  const downloadCode = () => {
    const code = previewRef.current?.getCode() || project?.current_code;
    if (!code) {
      if (isGenerating) {
        return;
      }
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = "index.html";
    document.body.appendChild(element);
    element.click();
  };

  useEffect(() => {
    if (session?.user) {
      fetchProject();
    } else if (!isPending && !session?.user) {
      navigate("/");
      toast("Please login to view your projects");
    }
  }, [session?.user]);

  useEffect(() => {
    if (project && !project.current_code) {
      setIsChatOpen(true);
      const intervalId = setInterval(fetchProject, 10000);
      return () => clearInterval(intervalId);
    }
  }, [project]);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-screen">
          <Loader2Icon className="size-7 animate-spin text-violet-200" />
        </div>
      </>
    );
  }
  return project ? (
    <div className="flex flex-col h-dvh w-full bg-background text-foreground transition-colors duration-300">
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
          <div className="max-w-[52vw] sm:max-w-xs">
            <p className="text-sm font-medium capitalize truncate">
              {project.name}
            </p>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Previewing last saved version
            </p>
          </div>
          <div className="ml-auto sm:hidden flex items-center gap-2">
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
              aria-label="Download code"
              className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center"
            >
              <ArrowBigDownDashIcon className="size-4" />
            </button>
          </div>
        </div>
        {/* middle  */}
        <div className="hidden sm:flex gap-1 bg-secondary border border-border p-1 rounded-md shadow-sm">
          <button
            onClick={() => setDevice("phone")}
            className={`p-1 rounded transition-colors ${device === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <SmartphoneIcon className="size-5" />
          </button>

          <button
            onClick={() => setDevice("tablet")}
            className={`p-1 rounded transition-colors ${device === "tablet" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <TabletIcon className="size-5" />
          </button>

          <button
            onClick={() => setDevice("desktop")}
            className={`p-1 rounded transition-colors ${device === "desktop" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LaptopIcon className="size-5" />
          </button>
        </div>
        {/* right  */}
        <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto sm:ml-auto sm:justify-end text-xs sm:text-sm font-medium">
          <button
            onClick={saveProject}
            disabled={isSaving}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3.5 py-1.5 flex items-center gap-2 rounded-md transition-colors border border-border shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" size={16} />
            ) : (
              <SaveIcon size={16} />
            )}{" "}
            Save
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 flex justify-center items-center gap-2 rounded-md transition-colors shadow-sm"
          >
            <ArrowBigDownDashIcon size={16} /> Download
          </button>
        </div>
        {!isGenerating && (
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
      {isGenerating ? (
        <div className="flex-1 p-2 bg-muted/30">
          <div className="h-full rounded-xl max-sm:rounded-lg overflow-hidden border border-border shadow-sm">
            <LoaderSteps />
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
                  isGenerating={isGenerating}
                  device={device}
                />
              </div>
              <div className="w-1/2 h-full">
                <Sidebar
                  project={project}
                  setProject={(p) => setProject(p)}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-1 overflow-hidden bg-muted/30">
            <Sidebar
              project={project}
              setProject={(p) => setProject(p)}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
            <div className="flex-1 p-2 pl-0">
              <ProjectPreview
                ref={previewRef}
                project={project}
                isGenerating={isGenerating}
                device={device}
              />
            </div>
          </div>
        </>
      )}
    </div>
  ) : (
    <div className="flex items-center justify-center h-screen">
      <p className="text-2xl font-medium text-gray-200">
        Unable to load project!
      </p>
    </div>
  );
};

export default Projects;
