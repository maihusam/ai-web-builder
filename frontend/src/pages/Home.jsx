import api from "@/configs/axios";
import { authClient } from "@/lib/auth-client";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Home = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      if (!session?.user) {
        return toast.error("Please sign in to create a project");
      } else if (!input.trim()) {
        return toast.error("Please enter a message");
      }
      setLoading(true);
      const { data } = await api.post("/api/user/project", {
        initial_prompt: input,
      });
      setLoading(false);
      navigate(`/projects/${data.projectId}`);
    } catch (error) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  return (
    <section className="flex flex-col items-center text-foreground text-sm pb-20 px-4 font-poppins pt-20">
      <h1 className="text-center text-[40px] leading-12 md:text-6xl md:leading-17.5 mt-4 font-semibold max-w-3xl">
        Build Simple Website using AI no code.
      </h1>

      <p className="text-center text-muted-foreground text-base max-w-md mt-4">
        Describe what you want, and let our AI create a fully functional,
        responsive website in seconds. No coding required.
      </p>

      <form
        onSubmit={onSubmitHandler}
        className="bg-card w-full max-w-2xl rounded-xl p-4 mt-12 border border-border shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all"
      >
        <textarea
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              if (input.trim()) {
                e.currentTarget.form.requestSubmit();
              }
            }
          }}
          className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none w-full"
          rows={4}
          placeholder="Describe your perfect website in detail..."
          required
        />
        <button className="ml-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2 font-medium transition-colors">
          {!loading ? (
            "Generate Website"
          ) : (
            <>
              Generating <Loader2Icon className="animate-spin size-4" />
            </>
          )}
        </button>
      </form>
    </section>
  );
};

export default Home;
