import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
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

          // only show "connected" when reconnecting manually
          if (isRetry) {
            setMessages((prev) => [
              ...prev,
              { type: "system", content: " Reconnected to server." },
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
          }

          // Backend says invalid user
          if (data.type === "error") {
            localStorage.removeItem("userId");

            setMessages((prev) => [
              ...prev,
              {
                type: "error",
                content: " Invalid user ID. Please Retry to reconnect.",
              },
            ]);
            return;
          }

          if (data.type === "ack" && data.threadId) {
            threadIdRef.current = data.threadId;
            localStorage.setItem("threadId", data?.threadId);
          }

          if (
            [
              "ack",
              "response_clarification",
              "research_data",
              "response_complete",
            ].includes(data.type)
          ) {
            setMessages((prev) => [...prev, data]);
          }
        } catch {
          setMessages((prev) => [...prev, event.data]);
        }
      };

      socket.onclose = () => {
        console.log("Disconnected from websocket");
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        setMessages((prev) => [...prev, err]);
      };
    },
    [url]
  );

  useEffect(() => {
    connect(); // connect only on mount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);
  // useEffect(() => {
  //   const socket = new WebSocket(url);
  //   socketRef.current = socket;

  //   socket.onopen = () => {
  //     const userId = localStorage.getItem("userId");
  //     socket.send(
  //       JSON.stringify(
  //         userId
  //           ? { type: "recurring_connection", userId }
  //           : { type: "new_connection" }
  //       )
  //     );
  //   };

  //   socket.onmessage = (event) => {
  //     try {
  //       const data = JSON.parse(event.data);

  //       if (data.type === "user_assigned" && data.userId) {
  //         localStorage.setItem("userId", data.userId);
  //       }

  //       if (data.type === "ack" && data.threadId) {
  //         threadIdRef.current = data.threadId;
  //         localStorage.setItem("threadId", data?.threadId);
  //       }

  //       if (
  //         [
  //           "ack",
  //           "response_clarification",
  //           "research_data",
  //           "response_complete",
  //         ].includes(data.type)
  //       ) {
  //         setMessages((prev) => [...prev, data]);
  //       }
  //     } catch {
  //       setMessages((prev) => [...prev, event.data]);
  //     }
  //   };

  //   socket.onclose = () => {
  //     console.log("Disconnected from websocket");
  //   };

  //   socket.onerror = (err) => {
  //     console.error("WebSocket error:", err);
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         type: "error",
  //         content: " Connection error. Please try again later.",
  //       },
  //     ]);
  //   };

  //   return () => {
  //     socket.close();
  //   };
  // }, [url]);

  // Send function with conditional threadId

  const sendMessage = useCallback((query) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const baseQuery = typeof query === "string" ? { query } : query;

      const payload = threadIdRef.current
        ? { ...baseQuery, threadId: threadIdRef.current, type: "query" }
        : { ...baseQuery, type: "query" }; // first call, no threadId

      socketRef.current.send(JSON.stringify(payload));
    } else {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: " Cannot send message: WebSocket not connected.",
        },
      ]);
    }
  }, []);

  return { messages, setMessages, sendMessage, reconnect: () => connect(true) };
}
