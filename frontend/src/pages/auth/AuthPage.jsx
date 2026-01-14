import { useParams } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";

export default function AuthPage() {
  const { action } = useParams();

  return (
    <main className="p-6 flex flex-col justify-center items-center h-[80vh]">
      <AuthView
        pathname={action}
        classNames={{ base: "bg-card border border-border shadow-sm" }}
      />
    </main>
  );
}
