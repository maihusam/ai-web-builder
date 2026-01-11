import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { UserButton } from "@daveyplate/better-auth-ui";
import api from "@/configs/axios";
import { toast } from "sonner";
import { SunIcon, MoonIcon } from "lucide-react";
import { useTheme } from "./theme-provider";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const [credits, setCredits] = useState(0);
  const { theme, setTheme } = useTheme();

  const { data: session } = authClient.useSession();

  const getCredits = async () => {
    try {
      const { data } = await api.get("/api/user/credits");
      setCredits(data.credits);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      getCredits();
    }
  }, [session?.user]);

  return (
    <>
      <nav className="z-50 sticky top-0 flex items-center justify-between w-full py-4 px-4 md:px-16 lg:px-24 xl:px-32 bg-background border-b border-border text-foreground">
        <Link to="/" className="flex items-center gap-2">
          {/* Using text logo to be theme agnostic or we can use dark:invert on img */}
          <img
            src={assets.logo}
            alt="logo"
            className="h-5 sm:h-7 invert dark:invert-0"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/projects" className="hover:text-primary transition-colors">
            My Projects
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-secondary text-foreground transition-colors"
          >
            {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>

          {!session?.user ? (
            <button
              onClick={() => navigate("/auth/signin")}
              className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md shadow-sm"
            >
              Get started
            </button>
          ) : (
            <>
              <button className="bg-secondary px-4 py-1.5 text-xs sm:text-sm border border-border text-secondary-foreground rounded-full font-medium">
                Credits: <span className="text-primary ml-1">{credits}</span>
              </button>
              <UserButton size="icon" />
            </>
          )}

          <button
            id="open-menu"
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMenuOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-100 bg-background/95 backdrop-blur-sm text-foreground flex flex-col items-center justify-center text-xl gap-8 md:hidden transition-all duration-300 pointer-events-auto">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="hover:text-primary font-medium"
          >
            Home
          </Link>
          <Link
            to="/projects"
            onClick={() => setMenuOpen(false)}
            className="hover:text-primary font-medium"
          >
            My Projects
          </Link>

          <button
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
