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
  const [systemMessages, setSystemMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  //sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    sendMessage,
    getMessage,
    messages: wsMessages,
    reconnect,
    isConnected,
    getUserTokenUsage,
    tokenUsage,
  } = useWebSocket("wss://api.bookshelf.diy/retrieve/ws");

  // refs
  const lastAckId = useRef(null);

  // Push system message to toasts
  const pushSystemMessage = useCallback((msg) => {
    setSystemMessages((prev) => [...prev, { id: Date.now(), ...msg }]);
  }, []);

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

  //User sends a message
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

  const addLoader = useCallback((id, content = "⏳ Processing...") => {
    setMessages((prev) => [
      ...prev,
      { id, type: "ai", content, isLoader: true, font: "italic" },
    ]);
  }, []);

  const replaceLoader = useCallback((id, newMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.isLoader ? { ...newMessage, id } : m))
    );
  }, []);

  useEffect(() => {
    if (wsMessages?.length === 0) return;
    const msg = wsMessages[wsMessages.length - 1];

    // Ignore error messages on first mount
    if (msg?.type === "error" && messages.length === 0) {
      // console.log("Ignoring initial error on first mount:", msg);
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

    // Handle restored conversation from refresh

    if (msg?.type === "response_message") {
      setActiveDocuments([]);
      setMessages([]);

      if (Array.isArray(msg.data)) {
        setMessages([
          {
            type: "ai",
            content: "Loading previous conversation...",
            font: "italic",
            isLoader: true,
            threadId: msg.threadId,
          },
        ]);
        const restored = msg.data.map((m) => {
          if (m.role === "HUMAN" || m.type === "query" || m.type === "user") {
            return { type: "user", content: m.content };
          }

          if (m.role === "AI") {
            if (m.type === "response_complete") {
              //  Extract docs from chunks
              const newSources = extractUniqueSourcesFromResponse({
                chunks: m.chunks,
              });
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

              return {
                type: "ai",
                content: m.content,
                chunks: m.chunks || [],
                isLoader: false,
              };
            }

            if (m.type === "ack") {
              return { type: "ai", content: m.content };
            }

            if (m.type === "response_clarification") {
              return { type: "ai", content: m.content };
            }

            if (m.type === "research_data") {
              return { type: "ai", content: m.content, font: "italic" };
            }

            return { type: "ai", content: m.content };
          }

          return { type: "ai", content: m.content };
        });

        setTimeout(() => {
          setMessages(restored);
        }, 500);
      }
      return;
    }

    // Prevent duplicate ACK
    if (msg?.type === "ack") {
      if (msg.threadId === lastAckId.current) return;
      lastAckId.current = msg.threadId;

      if (location.pathname === "/") {
        navigate(`/c/${msg.threadId}`);
      }
      const loaderId = `${msg.threadId}-ack`;
      addLoader(loaderId, "⌛ Starting analysis...");
      replaceLoader(loaderId, {
        type: "ai",
        content: msg.message || "Got your question, starting analysis...",
        font: "italic",
      });
      return;
    }

    if (msg?.type === "response_clarification") {
      setIsLoading(false);
      const loaderId = `${msg.threadId}-clarify`;
      addLoader(loaderId, "🤔 Clarifying...");
      replaceLoader(loaderId, {
        type: "ai",
        content: msg.message || "Clarifying response...",
      });
      return;
    }

    if (msg?.type === "research_data") {
      setIsLoading(true);
      const loaderId = `${msg.threadId}-research`;
      addLoader(loaderId, "🔍 Fetching and analyzing documents...");
      replaceLoader(loaderId, {
        type: "ai",
        content: msg.message || "Fetching and analyzing documents...",
        font: "italic",
      });
      return;
    }

    if (msg?.type === "response_complete") {
      setIsLoading(false);
      const loaderId = `${msg.threadId}-complete`;
      if (msg.message && typeof msg.message === "object") {
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

        replaceLoader(loaderId, {
          type: "ai",
          content: msg.message?.generated_answer,
          chunks: msg.message?.chunks || [],
        });
      } else if (typeof msg.message === "string") {
        replaceLoader(loaderId, {
          type: "error",
          content: msg.message || "Something went wrong, please try again.",
        });
      }
    }
    if (msg?.type === "error") {
      setIsLoading(false);
      const loaderId = `${msg.threadId}-error`;
      addLoader(loaderId, " Processing...");
      replaceLoader(loaderId, {
        type: "error",
        content: msg.message || "Error: try again later.",
      });
      return;
    }
  }, [
    wsMessages,
    navigate,
    extractUniqueSourcesFromResponse,
    location.pathname,
  ]);

  useEffect(() => {
    const appMounted = sessionStorage.getItem("appMounted");
    const isPageReload = performance
      .getEntriesByType("navigation")
      .some((nav) => nav.type === "reload");

    if (
      isPageReload &&
      appMounted === "true" &&
      location.pathname.startsWith("/c/") &&
      threadId &&
      isConnected
    ) {
      getMessage(threadId);
    }

    // If "justMounted", upgrade it to "true" for next refresh
    if (appMounted === "justMounted") {
      sessionStorage.setItem("appMounted", "true");
    }
  }, [isConnected, threadId, location.pathname, getMessage]);

  useEffect(() => {
    if (isConnected) getUserTokenUsage();
  }, [isConnected, getUserTokenUsage]);

  useEffect(() => {
    if (location.pathname === "/") {
      setMessages([]);
      setActiveDocuments([]);
    }
  }, [location.pathname]);
  return (
    <WebSocketContext.Provider
      value={{
        messages,
        setMessages,
        systemMessages,
        pushSystemMessage,
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
        tokenUsage,
        isSidebarOpen,
        setIsSidebarOpen,
        isConnected,
        getUserTokenUsage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(WebSocketContext);
