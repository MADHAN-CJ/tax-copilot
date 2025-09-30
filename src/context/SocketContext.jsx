import { createContext, useContext, useMemo } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  //hook
  const {
    sendMessage,
    getMessage,
    messages: wsMessages,
    reconnect,
    isConnected,
    getUserTokenUsage,
    tokenUsage,
  } = useWebSocket("wss://api.bookshelf.diy/legal/retrieve/ws");

  // Memoize the value to avoid re-renders when parent re-renders
  const value = useMemo(
    () => ({
      sendMessage,
      getMessage,
      wsMessages,
      reconnect,
      isConnected,
      getUserTokenUsage,
      tokenUsage,
    }),
    [
      sendMessage,
      getMessage,
      wsMessages,
      reconnect,
      isConnected,
      getUserTokenUsage,
      tokenUsage,
    ]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useWSSocketContext = () => useContext(SocketContext);
