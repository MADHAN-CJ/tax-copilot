import { createContext, useContext, useState, useCallback } from "react";

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [systemMessages, setSystemMessages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pushSystemMessage = useCallback((msg) => {
    setSystemMessages((prev) => [...prev, { id: Date.now(), ...msg }]);
  }, []);

  return (
    <UIContext.Provider
      value={{
        systemMessages,
        pushSystemMessage,
        isSidebarOpen,
        setIsSidebarOpen,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUIContext = () => useContext(UIContext);
