import { createContext, useContext, useEffect, useState } from "react";

export type ViewTheme = "none" | "christmas" | "lunar-new-year";

type ViewThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ViewTheme;
  storageKey?: string;
};

type ViewThemeProviderState = {
  viewTheme: ViewTheme;
  setViewTheme: (theme: ViewTheme) => void;
};

const initialState: ViewThemeProviderState = {
  viewTheme: "none",
  setViewTheme: () => null,
};

const ViewThemeProviderContext = createContext<ViewThemeProviderState>(initialState);

export function ViewThemeProvider({
  children,
  defaultTheme = "none",
  storageKey = "spin-view-theme",
  ...props
}: ViewThemeProviderProps) {
  const [viewTheme, setViewTheme] = useState<ViewTheme>(
    () => (localStorage.getItem(storageKey) as ViewTheme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all view theme classes
    root.classList.remove("view-theme-none", "view-theme-christmas", "view-theme-lunar-new-year");

    // Add the current theme class
    root.classList.add(`view-theme-${viewTheme}`);
  }, [viewTheme]);

  const value = {
    viewTheme,
    setViewTheme: (theme: ViewTheme) => {
      localStorage.setItem(storageKey, theme);
      setViewTheme(theme);
    },
  };

  return (
    <ViewThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ViewThemeProviderContext.Provider>
  );
}

export const useViewTheme = () => {
  const context = useContext(ViewThemeProviderContext);

  if (context === undefined)
    throw new Error("useViewTheme must be used within a ViewThemeProvider");

  return context;
};
