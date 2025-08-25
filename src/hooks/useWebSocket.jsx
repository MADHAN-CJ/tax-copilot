// src/hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const threadIdRef = useRef(null);

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

          if (isRetry) {
            setMessages((prev) => [
              ...prev,
              { type: "system", content: "Reconnected to server." },
            ]);
          }
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              type: "error",
              content: "Connection error. Please click Retry to reconnect.",
            },
          ]);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "user_assigned" && data.userId) {
            localStorage.setItem("userId", data.userId);
            setIsConnected(true);

            return;
          }

          if (data.type === "error") {
            localStorage.removeItem("userId");
            setMessages((prev) => [
              ...prev,
              {
                type: "error",
                content: "Invalid user ID. Please Retry to reconnect.",
              },
            ]);
            return;
          }

          if (data.type === "ack" && data.threadId) {
            // Only push ack once
            setMessages((prev) => {
              if (
                prev.some(
                  (m) => m.type === "ack" && m.threadId === data.threadId
                )
              ) {
                return prev; // skip duplicate
              }
              return [...prev, data];
            });
            return;
          }

          if (data.type === "response_message") {
            // bulk restore messages on refresh
            // if (Array.isArray(data.messages)) {
            setMessages((prev) => [...prev, data]);
            // }xx`
            return;
          }

          if (
            [
              "response_clarification",
              "research_data",
              "response_complete",
              // "response_message",
            ].includes(data.type)
          ) {
            setMessages((prev) => [...prev, data]);
            return;
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
          setMessages((prev) => [
            ...prev,
            { type: "error", content: event.data },
          ]);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        console.log("Disconnected from websocket");
      };

      socket.onerror = (err) => {
        setIsConnected(false);
        console.error("WebSocket error:", err);
        setMessages((prev) => [
          ...prev,
          { type: "error", content: String(err) },
        ]);
      };
    },
    [url]
  );

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((query, threadId) => {
    console.log();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const baseQuery = typeof query === "string" ? { query } : query;

      const payload = threadId
        ? { ...baseQuery, threadId, type: "query" }
        : { ...baseQuery, type: "query" };

      socketRef.current.send(JSON.stringify(payload));
    } else {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Cannot send message: WebSocket not connected.",
        },
      ]);
    }
  }, []);

  const getMessage = useCallback((threadId) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = { threadId, type: "get_message" };

      socketRef.current.send(JSON.stringify(payload));
    } else {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Cannot send message: WebSocket not connected.",
        },
      ]);
    }
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    getMessage,
    reconnect: () => connect(true),
    threadId: threadIdRef.current,
    isConnected,
  };
}
