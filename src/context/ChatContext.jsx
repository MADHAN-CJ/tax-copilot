import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useWSSocketContext } from "./SocketContext";
import { useDocsContext } from "./DocumentsContext";
import { useLocation, useNavigate } from "react-router";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  //context
  const {
    sendMessage,
    wsMessages,
    isConnected,
    getUserTokenUsage,
    getMessage,
  } = useWSSocketContext();
  const {
    setActiveDocuments,
    extractUniqueSourcesFromResponse,
    setActiveTabIndex,
  } = useDocsContext();
  //states
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenExhaustedError, setTokenExhaustedError] = useState(false);
  //refs
  const lastAckId = useRef(null);

  //loader and placeholder
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

  // Extract threadId manually from the path `/c/:threadId`
  const threadId = location.pathname.startsWith("/c/")
    ? location.pathname.split("/c/")[1]?.split("/")[0] || null
    : null;

  //ask prompt functionality in landing page
  const handleLandingPageSendMessage = useCallback(
    async (event) => {
      if (event) event.preventDefault();
      if (!inputMessage.trim() || isLoading) return;

      const userMessage = { type: "user", content: inputMessage };
      setActiveDocuments([]);
      setMessages([userMessage]);
      setInputMessage("");
      setIsLoading(true);
      sendMessage(inputMessage, threadId);
    },
    [inputMessage, isLoading, sendMessage, threadId, setActiveDocuments]
  );

  //handle key enter on landing page
  const handleInputKeyDownOnLandingPage = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleLandingPageSendMessage();
      }
    },
    [handleLandingPageSendMessage]
  );

  //handle send message using threadId
  const handleSendMessage = useCallback(
    async (event) => {
      if (event) event.preventDefault();
      if (!inputMessage.trim() || isLoading) return;

      const userMessage = { type: "user", content: inputMessage };
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");
      setIsLoading(true);
      sendMessage(inputMessage, threadId);
    },
    [inputMessage, isLoading, sendMessage, threadId]
  );

  //handle key enter on chat page
  const handleInputKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Handle WS messages
  useEffect(() => {
    if (wsMessages?.length === 0) return;
    const msg = wsMessages[wsMessages.length - 1];

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
      if (Array.isArray(msg.data) && msg.data.length > 0) {
        //clear messages and docs
        setMessages([]);
        setActiveDocuments([]);
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
                final_used_chunks: m.final_used_chunks || [],
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
        }, 200);
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
      if (threadId !== msg?.threadId) {
        getUserTokenUsage();
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

        if (msg.message?.generated_answer) {
          setMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: msg.message.generated_answer,
              chunks: msg.message?.chunks || [],
              final_used_chunks: msg.message?.final_used_chunks || [],
            },
          ]);

          localStorage.setItem(
            `finalChunks-${msg.threadId}`,
            JSON.stringify({
              final_used_chunks: msg.message?.final_used_chunks || [],
            })
          );
        }

        replaceLoader(loaderId, {
          type: "ai",
          content: msg.message?.generated_answer,
          chunks: msg.message?.chunks || [],
          final_used_chunks: msg.message?.final_used_chunks || [],
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

      if (msg.message === "Token Usage Limit Reached.") {
        setTokenExhaustedError(true);
      } else {
        setTokenExhaustedError(false);
      }
      return;
    }
  }, [
    wsMessages,
    navigate,
    extractUniqueSourcesFromResponse,
    location.pathname,
    addLoader,
    replaceLoader,
    setActiveDocuments,
    setActiveTabIndex,
    getUserTokenUsage,
    threadId,
    setTokenExhaustedError,
  ]);

  useEffect(() => {
    if (threadId && isConnected && location.pathname.startsWith("/c/")) {
      getMessage(threadId);
    }
  }, [isConnected, threadId, location.pathname, getMessage]);

  useEffect(() => {
    if (isConnected) getUserTokenUsage();
  }, [isConnected, getUserTokenUsage]);
  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        inputMessage,
        setInputMessage,
        isLoading,
        setIsLoading,
        handleSendMessage,
        handleInputKeyDown,
        addLoader,
        replaceLoader,
        handleLandingPageSendMessage,
        handleInputKeyDownOnLandingPage,
        tokenExhaustedError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
