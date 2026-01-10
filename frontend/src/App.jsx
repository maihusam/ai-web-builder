import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import MyProjects from "./pages/MyProjects";
import Preview from "./pages/Preview";
import View from "./pages/View";
import Navbar from "./components/Navbar";
import { Toaster } from "sonner";
import AuthPage from "./pages/auth/AuthPage";
import Settings from "./pages/Settings";
import Loading from "./pages/Loading";

const App = () => {
  const { pathname } = useLocation();

  const hideNavbar =
    pathname.startsWith("/projects/") && pathname !== "/projects";

  return (
    <div>
      <Toaster />
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<MyProjects />} />
        <Route path="/projects/:id" element={<Projects />} />
        <Route path="/projects/:id/preview" element={<Preview />} />
        <Route path="/projects/:id/versions/:versionId" element={<Preview />} />
        <Route path="/projects/:id/view" element={<View />} />
        <Route path="/auth/:action" element={<AuthPage />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route path="/settings/account" element={<Settings />} />
        <Route path="/loading" element={<Loading />} />
      </Routes>
    </div>
  );
};

export default App;
