import { createContext, useContext } from "react";

export const ShellContext = createContext<{ openCreateProject: () => void }>({
  openCreateProject: () => {},
});

export const useShell = () => useContext(ShellContext);
