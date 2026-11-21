import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

const Settings = () => {
  const { user, isPending, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  if (isPending) return null;

  if (!user) {
    return (
      <div className="w-full p-4 flex justify-center items-center min-h-[90vh] bg-background">
        <p className="text-muted-foreground">
          Please sign in to view your account.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh] flex-col gap-6 py-12 bg-background">
      <div className="w-full max-w-xl bg-card border border-border shadow-sm rounded-xl p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Account</h1>

        <div>
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="text-foreground">{user.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-foreground">{user.email}</p>
        </div>

        <button
          onClick={onLogout}
          className="self-start bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
};

export default Settings;
