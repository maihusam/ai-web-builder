import { useEffect, useState } from "react";
import { Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import api from "@/configs/axios";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { getErrorMessage } from "@/lib/constants";

const MyProjects = () => {
  const { user, isPending } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/api/user/projects");
      setProjects(data.projects);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/api/project/${deleteTarget.id}`);
      toast.success(data.message);
      setProjects((list) => list.filter((p) => p.id !== deleteTarget.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (isPending) return;
    if (user) {
      fetchProjects();
    } else {
      navigate("/auth/signin", {
        replace: true,
        state: { from: location.pathname },
      });
      toast("Please sign in to view your projects");
    }
  }, [user, isPending, navigate, location.pathname]);
  return (
    <>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this project?"
        description={`"${deleteTarget?.name}" and its chat history and versions will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="px-4 md:px-16 lg:px-24 xl:px-32">
        {loading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2Icon className="size-7 animate-spin text-primary" />
          </div>
        ) : projects.length > 0 ? (
          <div className="py-10 min-h-[80vh]">
            <div className="flex items-center justify-between mb-12">
              <h1 className="text-2xl font-medium text-foreground">
                My Projects
              </h1>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-primary-foreground px-4 sm:px-6 py-2 rounded-md bg-primary hover:bg-primary/90 shadow-sm transition-colors"
              >
                <PlusIcon size={18} /> Create New
              </button>
            </div>

            <div className="flex flex-wrap gap-4">
              {projects.map((project) => (
                <div
                  onClick={() => navigate(`/projects/${project.id}`)}
                  key={project.id}
                  className="relative group w-72 max-sm:mx-auto cursor-pointer bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-ring/50 transition-all duration-300"
                >
                  {/* Desktop-like Mini Preview */}
                  <div className="relative w-full h-40 bg-muted overflow-hidden border-b border-border">
                    {project.current_code ? (
                      <iframe
                        srcDoc={project.current_code}
                        className="absolute top-0 left-0 w-300 h-200 origin-top-left pointer-events-none"
                        sandbox="allow-scripts allow-same-origin"
                        style={{ transform: "scale(0.24)", border: "none" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>
                          {project.status === "generating"
                            ? "Building…"
                            : "No preview (build failed)"}
                        </p>
                      </div>
                    )}
                    {project.status === "generating" && (
                      <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium border border-border">
                        <Loader2Icon className="size-3 animate-spin" />
                        {project.current_code ? "Updating" : "Building"}
                      </span>
                    )}
                    {!project.current_code && project.status !== "generating" && (
                      <span className="absolute left-2 top-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive border border-destructive/30">
                        Failed
                      </span>
                    )}
                    {project.isPublished && (
                      <span className="absolute left-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium border border-border">
                        Published
                      </span>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-4 text-foreground transition-colors group-hover:bg-muted/30">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-medium line-clamp-2">
                        {project.name}
                      </h2>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm line-clamp-2">
                      {project.initial_prompt}
                    </p>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex justify-between items-center mt-6"
                    >
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2 text-primary text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}/preview`);
                          }}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
                        >
                          Preview
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-label="Delete project"
                      className="absolute top-3 right-3 sm:scale-0 sm:group-hover:scale-100 sm:focus-visible:scale-100 bg-destructive/10 p-1.5 rounded-md text-destructive hover:bg-destructive/20 cursor-pointer shadow-sm transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh]">
            <h1 className="text-3xl font-semibold text-foreground">
              You have no projects yet!
            </h1>
            <button
              onClick={() => navigate("/")}
              className="text-primary-foreground px-6 py-2 mt-6 rounded-md bg-primary hover:bg-primary/90 transition-colors shadow-sm"
            >
              Create New
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MyProjects;
