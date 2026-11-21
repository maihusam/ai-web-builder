import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import api from "@/configs/axios";

// Public page: anyone with the link can see a published site. The site's code
// is untrusted, so it runs in a sandboxed iframe without access to this app.
const View = () => {
  const { id: projectId } = useParams();
  const [site, setSite] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | missing | error

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/project/published/${projectId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setSite(data);
        setStatus("ready");
        document.title = data.name;
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error?.response?.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2Icon className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-screen bg-background text-foreground px-4 text-center">
        <h1 className="text-2xl font-semibold">
          {status === "missing"
            ? "This site isn't available"
            : "Something went wrong"}
        </h1>
        <p className="text-muted-foreground">
          {status === "missing"
            ? "It may have been unpublished or the link is wrong."
            : "Please try again in a moment."}
        </p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Build your own website with AI
        </Link>
      </div>
    );
  }

  return (
    <iframe
      title={site.name}
      srcDoc={site.code}
      sandbox="allow-scripts allow-forms allow-popups"
      className="h-screen w-full border-0 bg-white"
    />
  );
};

export default View;
