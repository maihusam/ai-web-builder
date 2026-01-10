import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth-client";
import { useNavigate, NavLink } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";

export function Providers({ children }) {
  const navigate = useNavigate();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthUIProvider
        authClient={authClient}
        navigate={navigate}
        Link={(props) => <NavLink {...props} to={props.href} />}
      >
        {children}
      </AuthUIProvider>
    </ThemeProvider>
  );
}
