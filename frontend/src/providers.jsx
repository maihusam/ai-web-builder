import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./context/AuthProvider";

export function Providers({ children }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
