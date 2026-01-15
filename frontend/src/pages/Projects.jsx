import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowBigDownDashIcon,
  FullscreenIcon,
  LaptopIcon,
  Loader2Icon,
  MessageSquareIcon,
  SaveIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import ProjectPreview from "../components/ProjectPreview";
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewRef = useRef(null);

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
    <div className="flex flex-col h-screen w-full bg-background text-foreground transition-colors duration-300">
      {/* builder navbar  */}
      <div className="flex max-sm:flex-col sm:items-center gap-4 px-4 py-2 no-scrollbar border-b border-border shadow-sm">
        {/* left  */}
        <div className="flex items-center gap-2 sm:min-w-90 text-nowrap">
          <img
            src={assets.favicon}
            alt="logo"
            className="h-6 cursor-pointer invert dark:invert-0"
            onClick={() => navigate("/")}
          />
          <div className="max-w-64 sm:max-w-xs">
            <p className="text-sm font-medium capitalize truncate">
              {project.name}
            </p>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Previewing last saved version
            </p>
          </div>
          <div className="sm:hidden flex-1 flex justify-end">
            {isMenuOpen ? (
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-md text-foreground hover:bg-secondary transition-colors"
              >
                <MessageSquareIcon className="size-6 cursor-pointer" />
              </button>
            ) : (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-1 rounded-md text-foreground hover:bg-secondary transition-colors"
              >
                <XIcon className="size-6 cursor-pointer" />
              </button>
            )}
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
        <div className="flex items-center justify-end gap-3 flex-1 text-xs sm:text-sm font-medium">
          <button
            onClick={saveProject}
            disabled={isSaving}
            className="max-sm:hidden bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3.5 py-1.5 flex items-center gap-2 rounded-md transition-colors border border-border shadow-sm disabled:opacity-50"
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
            className="flex items-center gap-2 px-4 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors text-foreground"
          >
            <FullscreenIcon size={16} /> Preview
          </Link>
          <button
            onClick={downloadCode}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 flex items-center gap-2 rounded-md transition-colors shadow-sm"
          >
            <ArrowBigDownDashIcon size={16} /> Download
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-auto bg-muted/30">
        <Sidebar
          isMenuOpen={isMenuOpen}
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
