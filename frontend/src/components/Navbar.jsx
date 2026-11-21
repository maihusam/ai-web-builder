import React, { useState } from "react";
import { assets } from "@/assets/assets";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/constants";
import { SunIcon, MoonIcon } from "lucide-react";
import { useTheme } from "./theme-provider";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  // Credits live in the auth context so every page keeps them up to date
  const { user, isPending, credits, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
      navigate("/");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

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
          <Link to="/community" className="hover:text-primary transition-colors">
            Community
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-secondary text-foreground transition-colors"
          >
            {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>

          {isPending ? (
            // Reserve the space so the bar doesn't jump once we know who's signed in
            <div
              aria-hidden="true"
              className="h-9 w-28 rounded-md bg-secondary animate-pulse"
            />
          ) : !user ? (
            <button
              onClick={() =>
                navigate("/auth/signin", { state: { from: location.pathname } })
              }
              className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md shadow-sm"
            >
              Get started
            </button>
          ) : (
            <>
              <span
                title="Each website or change costs 5 credits"
                className={`px-4 py-1.5 text-xs sm:text-sm border rounded-full font-medium ${credits !== null && credits < 5 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-secondary text-secondary-foreground"}`}
              >
                Credits:{" "}
                <span
                  className={
                    credits !== null && credits < 5 ? "" : "text-primary ml-1"
                  }
                >
                  {credits ?? "–"}
                </span>
              </span>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-label="Account menu"
                  className="size-9 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center uppercase"
                >
                  {user.name?.charAt(0)}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-md shadow-md p-1 text-sm z-50">
                    <p className="px-3 py-2 text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <Link
                      to="/account/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-3 py-2 rounded hover:bg-secondary"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded hover:bg-secondary"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
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
          <Link
            to="/community"
            onClick={() => setMenuOpen(false)}
            className="hover:text-primary font-medium"
          >
            Community
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
