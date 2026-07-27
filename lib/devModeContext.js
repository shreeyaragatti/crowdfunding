import { createContext, useContext, useState, useEffect } from "react";

const DevModeContext = createContext();

const DEV_MODE_KEY = "betterfund:devMode";

export const DevModeProvider = ({ children }) => {
  const [devMode, setDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(DEV_MODE_KEY);
      setDevMode(stored === "true");
      setIsLoading(false);
    }
  }, []);

  const toggleDevMode = (value) => {
    setDevMode(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEV_MODE_KEY, String(value));
    }
  };

  return (
    <DevModeContext.Provider value={{ devMode, toggleDevMode, isLoading }}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error("useDevMode must be used within DevModeProvider");
  }
  return context;
};
