import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import api from "@/configs/axios";
import { getErrorMessage } from "@/lib/constants";

const ShareDialog = ({ open, project, onClose, onChange }) => {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const link = `${window.location.origin}/projects/${project.id}/view`;

  const setPublished = async (published) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/api/project/publish/${project.id}`, {
        published,
      });
      onChange(data.isPublished);
      toast.success(
        data.isPublished ? "Your site is now public" : "Your site is private again",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy, please copy the link manually");
    }
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 id="share-title" className="text-lg font-semibold">
          Share your website
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing gives your site a public link anyone can open, no account
          needed. Unpublish any time.
        </p>

        {project.isPublished ? (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background p-1 pl-3">
              <span className="flex-1 truncate text-sm">{link}</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80"
              >
                {copied ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The public page always shows your latest saved version.
            </p>
            <div className="mt-6 flex justify-between gap-2">
              <button
                onClick={() => setPublished(false)}
                disabled={saving}
                className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
              >
                {saving && <Loader2Icon className="size-4 animate-spin" />}
                Unpublish
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLinkIcon className="size-4" /> Open
              </a>
            </div>
          </>
        ) : (
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Not now
            </button>
            <button
              onClick={() => setPublished(true)}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2Icon className="size-4 animate-spin" />}
              Publish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareDialog;
