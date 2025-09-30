import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenUsage, setTokenUsage] = useState();

  //refs
  const socketRef = useRef(null);
  const threadIdRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  //retry number
  const MAX_RETRIES = 5;

  const pushMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const pushError = useCallback(
    (content) => {
      pushMessage({ type: "error", content });
    },
    [pushMessage]
  );

  //reconnect to  websocket
  const scheduleReconnect = useCallback(
    (connectFn) => {
      retryAttemptRef.current += 1;

      if (retryAttemptRef.current > MAX_RETRIES) {
        pushError(
          "Unable to reconnect after multiple attempts. Please refresh the page."
        );
        return;
      }

      const delay = Math.min(1000 * 2 ** retryAttemptRef.current, 30000); // max 30s

      reconnectTimeoutRef.current = setTimeout(() => {
        connectFn();
      }, delay);

      pushMessage({
        type: "system",
        content: `Connection lost. Retrying in ${delay / 1000}s... (Attempt ${
          retryAttemptRef.current
        }/${MAX_RETRIES})`,
      });
    },
    [pushMessage, pushError]
  );

  //connect to websocket
  const connect = useCallback(
    (isRetry = false) => {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        const userId = localStorage.getItem("userId");
        try {
          socket.send(
            JSON.stringify(
              userId
                ? { type: "recurring_connection", userId }
                : { type: "new_connection" }
            )
          );
        } catch {
          pushError(" Failed to establish connection.");
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "user_assigned":
              if (data.userId) {
                localStorage.setItem("userId", data.userId);
                setIsConnected(true);

                //confirm reconnection to websocket
                if (isRetry) {
                  pushMessage({
                    type: "system",
                    content: "Reconnected to server.",
                  });
                }
                retryAttemptRef.current = 0;
              }
              break;

            case "response_userdata":
              setTokenUsage(data);
              break;

            case "ack":
              setMessages((prev) =>
                prev.some(
                  (m) => m.type === "ack" && m.threadId === data.threadId
                )
                  ? prev
                  : [...prev, data]
              );
              break;

            case "response_message":
            case "response_clarification":
            case "research_data":
            case "response_complete":
            case "error":
              pushMessage(data);
              break;

            default:
              pushMessage({
                type: data.type,
                content: data.message || "WebSocket connection established",
              });
              break;
          }
        } catch (err) {
          console.error("WS parse error:", err);
          pushError(event.data || " Failed to parse server response.");
        }
      };

      socket.onclose = () => {
        setIsConnected(false);

        // Exponential backoff reconnect
        scheduleReconnect(() => connect(true));
      };

      socket.onerror = (err) => {
        setIsConnected(false);
        console.error("WebSocket error:", err);
        pushError(" Connection error. Please retry.");
      };
    },
    [url, pushMessage, pushError, scheduleReconnect]
  );

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (query, threadId) => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        const baseQuery = typeof query === "string" ? { query } : query;

        const payload = threadId
          ? { ...baseQuery, threadId, type: "query" }
          : { ...baseQuery, type: "query" };

        socketRef.current.send(JSON.stringify(payload));
      } else {
        pushError(" Cannot send message: WebSocket not connected.");
      }
    },
    [pushError]
  );

  const getMessage = useCallback(
    (threadId) => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        const payload = { threadId, type: "get_message" };

        socketRef.current.send(JSON.stringify(payload));
      } else {
        pushError(" Cannot fetch messages: WebSocket not connected.");
      }
    },
    [pushError]
  );

  const getUserTokenUsage = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = { type: "get_userdata" };

      socketRef.current.send(JSON.stringify(payload));
    } else {
      pushError(" Cannot fetch usage: WebSocket not connected.");
    }
  }, [pushError]);

  const reconnect = useCallback(() => connect(true), [connect]);

  return {
    messages,
    setMessages,
    sendMessage,
    getMessage,
    reconnect,
    threadId: threadIdRef.current,
    isConnected,
    getUserTokenUsage,
    tokenUsage,
  };
}
