import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import logo from "@/assets/logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/20 p-4">
      <div className="text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="Your Teaching Assistant" className="h-12 w-12 object-contain" />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Your Teaching Assistant</h2>
            <p className="text-xs text-muted-foreground">AI Teaching Assistant</p>
          </div>
        </div>
        
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
