import { forwardRef, useImperativeHandle, useRef } from "react";
import LoaderSteps from "./LoaderSteps";

const ProjectPreview = forwardRef(
  ({ project, isGenerating, device = "desktop" }, ref) => {
    const iframeRef = useRef(null);

    const resolutions = {
      phone: "w-[390px] max-w-full",
      tablet: "w-[768px] max-w-full",
      desktop: "w-full",
    };

    useImperativeHandle(ref, () => ({
      getCode: () => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return undefined;
        return doc.documentElement.outerHTML;
      },
    }));

    return (
      <div className="relative h-full bg-muted/20 flex-1 rounded-xl max-sm:rounded-lg overflow-hidden border border-border shadow-sm">
        {project.current_code ? (
          <iframe
            ref={iframeRef}
            srcDoc={project.current_code}
            className={`h-full border-0 bg-white max-sm:w-full ${resolutions[device]} mx-auto transition-all shadow-sm`}
          />
        ) : (
          isGenerating && <LoaderSteps />
        )}
      </div>
    );
  },
);

export default ProjectPreview;
