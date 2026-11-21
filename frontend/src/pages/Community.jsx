import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/configs/axios";
import { getErrorMessage } from "@/lib/constants";

// Public gallery of every published site. No login needed.
const Community = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get("/api/project/community", { params: { page } })
      .then(({ data }) => {
        if (cancelled) return;
        setProjects(data.projects);
        setTotalPages(data.totalPages);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="px-4 md:px-16 lg:px-24 xl:px-32 py-10 min-h-[80vh]">
      <div className="mb-10">
        <h1 className="text-2xl font-medium text-foreground">Community</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Websites published by other builders.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2Icon className="size-7 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground text-center mt-20">
          Nothing has been published yet. Be the first!
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/view`)}
                className="group w-72 max-sm:mx-auto cursor-pointer bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-ring/50 transition-all duration-300"
              >
                <div className="relative w-full h-40 bg-muted overflow-hidden border-b border-border">
                  {/* Other users' code: scripts allowed, but no same-origin access */}
                  <iframe
                    srcDoc={project.current_code}
                    title={project.name}
                    className="absolute top-0 left-0 w-300 h-200 origin-top-left pointer-events-none"
                    sandbox="allow-scripts"
                    loading="lazy"
                    style={{ transform: "scale(0.24)", border: "none" }}
                  />
                </div>
                <div className="p-4 text-foreground">
                  <h2 className="text-lg font-medium line-clamp-2">
                    {project.name}
                  </h2>
                  <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                    <span>by {project.creator}</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10 text-sm">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="px-4 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-4 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Community;
