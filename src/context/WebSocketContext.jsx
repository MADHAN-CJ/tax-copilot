import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router";
import { useWebSocket } from "../hooks/useWebSocket";

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Extract threadId manually from the path `/c/:threadId`

  const threadId = location.pathname.startsWith("/c/")
    ? location.pathname.split("/c/")[1]?.split("/")[0] || null
    : null;

  const [activeDocuments, setActiveDocuments] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    sendMessage,
    getMessage,
    messages: wsMessages,
    reconnect,
    isConnected,
  } = useWebSocket("wss://api.bookshelf.diy/retrieve/ws");

  // refs
  const lastAckId = useRef(null);

  const extractUniqueSourcesFromResponse = useCallback((apiResponse) => {
    if (!apiResponse?.chunks || !Array.isArray(apiResponse.chunks)) return [];
    const uniqueSources = new Set();
    apiResponse.chunks.forEach((chunk) => {
      if (chunk.source) uniqueSources.add(chunk.source);
    });
    return Array.from(uniqueSources).map((source) => ({
      name: source,
      url: `https://api.bookshelf.diy/finance/gpt/api/v1/static/docs/${source}`,
      id: source.replace(/[^a-zA-Z0-9]/g, "_"),
    }));
  }, []);

  const handleSendMessage = async (event) => {
    if (event) event.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { type: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    sendMessage(inputMessage, threadId);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (wsMessages.length === 0) return;
    const msg = wsMessages[wsMessages.length - 1];
    console.log(msg, "message");

    // Handle restored conversation from refresh

    if (msg.type === "response_message") {
      if (Array.isArray(msg.data)) {
        const restored = msg.data.map((m) => {
          if (m.role === "HUMAN" || m.type === "query" || m.type === "user") {
            return { type: "user", content: m.content };
          }
          if (m.role === "AI") {
            if (m.type === "response_complete") {
              return {
                type: "ai",
                content: m.content?.generated_answer || m.content,
                chunks: m.content?.chunks || [],
              };
            }
            return {
              type: "ai",
              content: m.content,
            };
          }
          return { type: "ai", content: m.content }; // fallback
        });

        setMessages(restored);
      }
      return;
    }

    // Only process allowed live message types
    if (
      ![
        "ack",
        "response_clarification",
        "research_data",
        "response_complete",
        "error",
        "response_message",
      ].includes(msg.type)
    ) {
      return;
    }

    // Prevent duplicate ACK
    if (msg.type === "ack") {
      if (msg.threadId === lastAckId.current) return;
      lastAckId.current = msg.threadId;

      if (location.pathname === "/") {
        navigate(`/c/${msg.threadId}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: msg.message || "Got your question, starting analysis...",
        },
      ]);
      return;
    }

    if (msg.type === "response_clarification") {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { type: "ai", content: msg.message || "Clarifying response..." },
      ]);
      return;
    }

    if (msg.type === "error") {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { type: "error", content: msg.message || "Error try after some time" },
      ]);
      return;
    }

    if (msg.type === "research_data") {
      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: msg.message || "Fetching and analyzing documents...",
        },
      ]);
      return;
    }

    if (msg.type === "response_complete") {
      setIsLoading(false);

      const newSources = extractUniqueSourcesFromResponse(msg?.message);
      if (newSources.length > 0) {
        setActiveDocuments((prevDocs) => {
          const existingUrls = new Set(prevDocs.map((doc) => doc.url));
          const uniqueNewSources = newSources.filter(
            (source) => !existingUrls.has(source.url)
          );
          const updatedDocs = [...prevDocs, ...uniqueNewSources];
          if (prevDocs.length === 0 && updatedDocs.length > 0) {
            setActiveTabIndex(0);
          }
          return updatedDocs;
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: msg.message?.generated_answer,
          chunks: msg.message?.chunks || [],
        },
      ]);
    }
  }, [
    wsMessages,
    navigate,
    location,
    extractUniqueSourcesFromResponse,
    location.pathname,
  ]);

  useEffect(() => {
    const alreadyMounted = sessionStorage.getItem("appMounted");

    // If app was already mounted in this session → this is a reload
    if (
      alreadyMounted &&
      location.pathname.startsWith("/c/") &&
      threadId &&
      isConnected
    ) {
      getMessage(threadId);
    }

    // Mark app as mounted for this session
    sessionStorage.setItem("appMounted", "true");
  }, [isConnected, threadId, location.pathname, getMessage]);

  return (
    <WebSocketContext.Provider
      value={{
        messages,
        setMessages,
        inputMessage,
        setInputMessage,
        isLoading,
        setIsLoading,
        activeDocuments,
        setActiveDocuments,
        activeTabIndex,
        setActiveTabIndex,
        handleSendMessage,
        reconnect,
        handleInputKeyDown,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(WebSocketContext);
