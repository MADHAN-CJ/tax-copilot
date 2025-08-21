import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  StylesLandingPageBodyWrapper,
  StylesLandingPageHeader,
  StylesLandingPageWrapper,
  StylesSearchContainerWrapper,
} from "./LandingPage/styles";

//images
import Logo from "../assets/images/logo.png";
import UpArrow from "../assets/images/up-arrow.svg";
import Banner from "../assets/images/landing-page-banner.png";

// Configure PDF.js worker - simple local approach
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

//static prompts
const searchPrompts = [
  "Show Tesla’s net income trend over the last 5 years.",
  "What was Amazon’s free cash flow in 2023?",
  "Break down Meta’s operating expenses by category in 2024.",
  "Rank the companies by total assets in their latest filings.",
];

export default function PDFViewerPage() {
  const [sidebarWidth, setSidebarWidth] = useState("384"); // 24rem = 384px
  const [isResizing, setIsResizing] = useState(false);

  // PDF state
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(800);
  const [documentStates, setDocumentStates] = useState({}); // Store state for each document
  const [pendingScrollActions, setPendingScrollActions] = useState({});

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  // WebSocket
  const { sendMessage, messages: wsMessages } = useWebSocket(
    "wss://api.bookshelf.diy/retrieve/ws"
  );

  // Get current active document
  const getCurrentDocument = () => {
    if (activeDocuments.length === 0) return null;
    return activeDocuments[activeTabIndex] || null;
  };

  // Handle sending a message
  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { type: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // send via WebSocket
    sendMessage(inputMessage);
  };

  // Extract unique sources
  const extractUniqueSourcesFromResponse = (apiResponse) => {
    if (!apiResponse.chunks || !Array.isArray(apiResponse.chunks)) return [];

    const uniqueSources = new Set();
    apiResponse.chunks.forEach((chunk) => {
      if (chunk.source) {
        uniqueSources.add(chunk.source);
      }
    });

    return Array.from(uniqueSources).map((source) => ({
      name: source,
      url: `https://api.bookshelf.diy/finance/gpt/api/v1/static/docs/${source}`,
      id: source.replace(/[^a-zA-Z0-9]/g, "_"),
    }));
  };

  // Listen for WebSocket responses

  const messageTypeRef = useRef("");
  useEffect(() => {
    if (wsMessages.length === 0) return;
    messageTypeRef.current = wsMessages[wsMessages.length - 1];
  }, [wsMessages]);

  // Listen for latest WebSocket response
  useEffect(() => {
    if (wsMessages.length === 0) return;
    const msg = wsMessages[wsMessages.length - 1]; // only newest message
    if (msg.type === "response_clarification") {
      setIsLoading(false);
    }
    if (msg.type === "research_data") {
      setIsLoading(true);
    }
    if (msg.type === "response_complete") {
      setIsLoading(false);

      // Extract and add PDF sources
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

      // Final AI message with answer
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: msg.message?.generated_answer,
          chunks: msg.message?.chunks || [],
        },
      ]);
    } else {
      // Intermediate status messages
      let displayText = "";

      switch (msg.type) {
        case "ack":
          displayText = "Got your question, starting analysis...";
          break;
        case "response_clarification":
          displayText = msg.message || "Clarifying response...";
          break;
        case "research_data":
          displayText = msg.message || "Fetching and analyzing documents...";
          break;
        default:
          displayText = msg.message || JSON.stringify(msg);
          break;
      }

      // setIsLoading(true);

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: displayText,
        },
      ]);
    }
  }, [wsMessages]);

  // Handle reference button click
  const handleReferenceClick = (chunk) => {
    const targetPage = Math.floor(chunk.page_start);
    // Find the document that contains this chunk
    const targetDocIndex = activeDocuments.findIndex(
      (doc) => doc.name === chunk.source
    );

    if (targetDocIndex !== -1) {
      const targetDoc = activeDocuments[targetDocIndex];

      // If switching to a different tab
      if (targetDocIndex !== activeTabIndex) {
        // Check if target document is already loaded
        const docState = documentStates[targetDoc.id];
        if (docState && docState.isLoaded) {
          // Document is loaded, switch tab and scroll immediately
          setActiveTabIndex(targetDocIndex);
          setTimeout(() => {
            scrollToPageForDocument(targetDoc.id, targetPage);
          }, 100);
        } else {
          // Document not loaded yet, set pending action
          setPendingScrollActions((prev) => ({
            ...prev,
            [targetDoc.id]: { targetPage },
          }));
          setActiveTabIndex(targetDocIndex);
        }
      } else {
        // Same tab, just scroll
        scrollToPageForDocument(targetDoc.id, targetPage);
      }
    } else {
      // Fallback to current document
      scrollToPage(targetPage);
    }
  };

  // PDF handlers for each document - memoized to prevent re-renders
  const onDocumentLoadSuccess = useCallback(
    (docId) =>
      ({ numPages }) => {
        // Update document state with numPages
        setDocumentStates((prev) => ({
          ...prev,
          [docId]: {
            ...prev[docId],
            numPages,
            isLoaded: true,
          },
        }));

        // Check if there's a pending scroll action for this document
        const pendingAction = pendingScrollActions[docId];
        if (pendingAction) {
          setTimeout(() => {
            scrollToPageForDocument(docId, pendingAction.targetPage);
            setPendingScrollActions((prev) => {
              const newActions = { ...prev };
              delete newActions[docId];
              return newActions;
            });
          }, 300);
        }
      },
    [pendingScrollActions]
  );

  const scrollToPageForDocument = useCallback(
    (docId, page) => {
      const docState = documentStates[docId];
      if (!docState || !docState.numPages) return;

      const targetPage = Math.max(1, Math.min(docState.numPages, page));
      const pageElement = document.getElementById(
        `${docId}-page-${targetPage}`
      );
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: "smooth", block: "start" });

        // Update document state
        setDocumentStates((prev) => ({
          ...prev,
          [docId]: {
            ...prev[docId],
            currentPageInView: targetPage,
            pageNumber: targetPage,
          },
        }));
      }
    },
    [documentStates]
  );

  const scrollToPage = (page) => {
    const currentDoc = getCurrentDocument();
    if (currentDoc) {
      scrollToPageForDocument(currentDoc.id, page);
    }
  };

  const goToPage = (page) => {
    scrollToPage(page);
  };

  // Get current document state
  const getCurrentDocumentState = () => {
    const currentDoc = getCurrentDocument();
    if (!currentDoc)
      return { currentPageInView: 1, pageNumber: 1, numPages: null };
    return (
      documentStates[currentDoc.id] || {
        currentPageInView: 1,
        pageNumber: 1,
        numPages: null,
      }
    );
  };

  useEffect(() => {
    let rafId;

    const handleMouseMove = (e) => {
      if (!isResizing) return;

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        const clampedWidth = Math.max(300, Math.min(600, newWidth));
        setSidebarWidth(clampedWidth);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isResizing]);

  // Update PDF width with debouncing to prevent constant re-rendering during resize
  useEffect(() => {
    let timeoutId;

    const updatePdfWidth = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const availableWidth = window.innerWidth - sidebarWidth - 100;
        const newWidth = Math.min(availableWidth * 0.9, 900);

        // Only update if there's a significant difference to prevent micro-updates
        if (Math.abs(newWidth - pdfWidth) > 10) {
          setPdfWidth(newWidth);
        }
      }, 100); // Wait 100ms after resize stops
    };

    updatePdfWidth();

    // Also listen to window resize
    window.addEventListener("resize", updatePdfWidth);

    return () => {
      window.removeEventListener("resize", updatePdfWidth);
      clearTimeout(timeoutId);
    };
  }, [sidebarWidth, pdfWidth]);

  // Track which page is currently in view for active document
  useEffect(() => {
    const currentDoc = getCurrentDocument();
    if (!currentDoc) return;

    const docState = documentStates[currentDoc.id];
    if (!docState || !docState.numPages || !docState.isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idParts = entry.target.id.split("-");
            const docId = idParts.slice(0, -2).join("-"); // Everything except last 2 parts
            const pageNum = parseInt(idParts[idParts.length - 1]); // Last part is page number

            if (docId === currentDoc.id) {
              setDocumentStates((prev) => ({
                ...prev,
                [docId]: {
                  ...prev[docId],
                  currentPageInView: pageNum,
                  pageNumber: pageNum,
                },
              }));
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all page elements for the current document
    for (let i = 1; i <= docState.numPages; i++) {
      const pageElement = document.getElementById(`${currentDoc.id}-page-${i}`);
      if (pageElement) {
        observer.observe(pageElement);
      }
    }

    return () => observer.disconnect();
  }, [activeTabIndex, documentStates]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  // whenever messages change, scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="h-screen bg-[#151415]  flex flex-col overflow-hidden">
      <div className="overflow-hidden bg-[#151415]">
        {/* Show full-width chat when no documents, split view when documents available */}
        <StylesLandingPageHeader>
          <div className="flex items-center">
            <img src={Logo} alt="logo" />
            <div className="w-[2px] bg-[#333234] h-[60px] mx-[20px]"></div>
            <span className="logo-text">The Magnificent 7</span>
          </div>
          <span className="header-right">support@bookshelf.diy</span>
        </StylesLandingPageHeader>
        {activeDocuments.length === 0 && messages.length === 0 ? (
          <div className="w-full  ">
            <StylesLandingPageWrapper>
              <StylesLandingPageBodyWrapper>
                <div className="section left-part">
                  <div className="left-part-header">
                    <div className="left-part-header-left"></div>
                    <div className="left-part-header-right"></div>
                  </div>
                  <div className="left-part-body">
                    <img src={Banner} alt="banner" loading="lazy" />
                  </div>
                  <div></div>
                </div>
                <div className="section right-part">
                  <p>Welcome,</p>
                  <p>Ask anything</p>
                  <div className="search-container-wrapper">
                    <div className="right-part-bottom-section">
                      <div className="bottom-card-section">
                        {searchPrompts?.map((prompt, uniquePrompt) => {
                          return (
                            <div
                              className="right-part-card"
                              key={uniquePrompt}
                              onClick={() => setInputMessage(prompt)}
                            >
                              {prompt}
                            </div>
                          );
                        })}
                      </div>
                      <div className="search-container">
                        <form onSubmit={handleSendMessage}>
                          <textarea
                            placeholder="Start typing..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            disabled={isLoading}
                          ></textarea>
                          <div className="button-text">
                            <span className="gpt-name">Using GPT-5 </span>
                            <button
                              className="submit-button"
                              type="submit"
                              disabled={isLoading || !inputMessage.trim()}
                            >
                              <img src={UpArrow} alt="Send" />
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </StylesLandingPageBodyWrapper>
            </StylesLandingPageWrapper>
          </div>
        ) : (
          <div className="flex flex-1 h-[calc(100vh-60px)] bg-[#151415]">
            <div
              className=" flex flex-col"
              style={{
                width: `calc(100% - ${sidebarWidth}px)`,
                transition: "none",
              }}
            >
              {/* Document Tabs */}
              {activeDocuments.length > 0 && (
                <div className=" px-6 bg-[#1C1B1D]flex-shrink-0">
                  <div className="flex space-x-1 overflow-x-auto">
                    {activeDocuments.map((doc, index) => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveTabIndex(index)}
                        className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors ${
                          index === activeTabIndex
                            ? "bg-white text-black border-b-2 border-[#333234]"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        {doc.name.replace(".pdf", "")}
                        {activeDocuments.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const docToClose = activeDocuments[index];

                              // Remove document state when closing
                              setDocumentStates((prev) => {
                                const newStates = { ...prev };
                                delete newStates[docToClose.id];
                                return newStates;
                              });

                              const newDocs = activeDocuments.filter(
                                (_, i) => i !== index
                              );
                              setActiveDocuments(newDocs);

                              if (activeTabIndex >= newDocs.length) {
                                setActiveTabIndex(
                                  Math.max(0, newDocs.length - 1)
                                );
                              }
                            }}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className=" px-6 py-4 flex items-center gap-6 bg-[#333234] flex-shrink-0 mx-[20px] rounded-t">
                <div className="flex items-center gap-2">
                  <ChevronUp
                    className="w-4 h-4 text-white cursor-pointer hover:text-gray-700"
                    onClick={() =>
                      goToPage(getCurrentDocumentState().currentPageInView - 1)
                    }
                  />
                  <span className="text-sm font-medium text-white min-w-[20px] text-center">
                    {getCurrentDocumentState().currentPageInView}
                  </span>
                  <span className="text-sm text-white">/</span>
                  <span className="text-sm text-white">
                    {getCurrentDocumentState().numPages || "..."}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 text-white cursor-pointer hover:text-gray-700"
                    onClick={() =>
                      goToPage(getCurrentDocumentState().currentPageInView + 1)
                    }
                  />
                </div>
              </div>

              <div
                className="flex-1 bg-[#1C1B1D] overflow-auto p-4 pdf-container mx-[20px]  custom-scrollbar-pdf"
                style={{
                  opacity: isResizing ? 0.7 : 1,
                  transition: "opacity 0.1s ease",
                }}
              >
                {activeDocuments.length > 0 ? (
                  <div className="flex justify-center">
                    <div className="space-y-4">
                      {activeDocuments.map((doc, index) => {
                        const docState = documentStates[doc.id] || {};
                        const isVisible = index === activeTabIndex;
                        const pendingAction = pendingScrollActions[doc.id];

                        return (
                          <div
                            key={`pdf-${doc.id}`}
                            style={{
                              display: isVisible ? "block" : "none",
                              transition: isResizing
                                ? "none"
                                : "transform 0.2s ease",
                            }}
                          >
                            <Document
                              file={doc.url}
                              onLoadSuccess={onDocumentLoadSuccess(doc.id)}
                              onLoadError={(error) => {
                                console.error("PDF load error:", error);
                                setPendingScrollActions((prev) => {
                                  const newActions = { ...prev };
                                  delete newActions[doc.id];
                                  return newActions;
                                });
                              }}
                              loading={
                                <div className="flex items-center justify-center h-96 w-96">
                                  <div className="text-gray-500">
                                    Loading PDF...
                                    {pendingAction && (
                                      <div className="text-xs mt-2">
                                        Will navigate to page{" "}
                                        {pendingAction.targetPage}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              }
                              error={
                                <div className="flex items-center justify-center h-96 w-96">
                                  <div className="text-red-500">
                                    Error loading PDF: {doc.name}
                                  </div>
                                </div>
                              }
                            >
                              {docState.numPages &&
                                Array.from(
                                  { length: docState.numPages },
                                  (_, pageIndex) => {
                                    const pageNumber = pageIndex + 1;
                                    return (
                                      <div
                                        key={pageNumber}
                                        id={`${doc.id}-page-${pageNumber}`}
                                        className="bg-white shadow-lg rounded-lg overflow-hidden mb-4"
                                      >
                                        <div className="bg-gray-50 px-4 py-2 text-sm text-black font-medium">
                                          Page {pageNumber}
                                        </div>
                                        <Page
                                          pageNumber={pageNumber}
                                          width={pdfWidth}
                                          loading={
                                            <div className="flex items-center justify-center h-96">
                                              <div className="text-gray-500">
                                                Loading page {pageNumber}...
                                              </div>
                                            </div>
                                          }
                                          renderTextLayer={false}
                                          renderAnnotationLayer={false}
                                        />
                                      </div>
                                    );
                                  }
                                )}
                            </Document>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="loader">
                    <span className="label">Loading</span>
                    <span className="dots">
                      <span className="dot">.</span>
                      <span className="dot">.</span>
                      <span className="dot">.</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              className="w-1 bg-[#333234] hover:bg-[grey] cursor-col-resize transition-colors select-none"
              onMouseDown={handleMouseDown}
              style={{ userSelect: "none" }}
            />

            <div
              className="bg-[#1C1B1D] border-l border-[#333234] flex flex-col flex-shrink-0  "
              style={{ width: `${sidebarWidth}px`, transition: "none" }}
            >
              <div className="flex-1 p-6 overflow-auto pb-[120px] custom-scrollbar">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className="space-y-4 ">
                      {message.type === "user" ? (
                        <div className="flex justify-end">
                          <div className="bg-[#333234] text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ) : message.type === "error" ? (
                        <div className="flex justify-center">
                          <div className="bg-red-600 text-white rounded-md px-4 py-2 max-w-xs text-center">
                            <p className="text-sm font-medium">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-gray-900">
                          <div className="text-white border-b border-[#333234] mt-[10px] pb-[10px]">
                            <p className="text-sm leading-relaxed">
                              {message.content}
                            </p>

                            {message.chunks && message.chunks.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                                  References
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {message.chunks.map((chunk, chunkIndex) => (
                                    <Button
                                      key={chunkIndex}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 px-2 border-[#333234] text-white "
                                      onClick={() =>
                                        handleReferenceClick(chunk)
                                      }
                                      title={`${
                                        chunk.source
                                      } - Page ${Math.floor(chunk.page_start)}`}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      {chunk.source.replace(".pdf", "")} p.
                                      {Math.floor(chunk.page_start)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {messageTypeRef?.current?.type === "research_data" && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mt-3"></div>
                  )}
                  {/*  Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="pb-[20px] bg-[#1C1B1D] ">
                <div className="flex gap-2 relative">
                  <StylesSearchContainerWrapper>
                    <div
                      className="right-part-bottom-section"
                      style={{ cursor: isLoading ? "not-allowed" : "auto" }}
                    >
                      <form
                        onSubmit={handleSendMessage}
                        className="search-container"
                      >
                        <textarea
                          placeholder="Start typing..."
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          disabled={isLoading}
                        ></textarea>
                        <div className="button-text">
                          <span className="gpt-name">Using GPT-5 </span>
                          <button
                            className="submit-button"
                            type="button"
                            disabled={isLoading || !inputMessage.trim()}
                            onClick={handleSendMessage}
                          >
                            <img src={UpArrow} alt="Send" />
                          </button>
                        </div>
                      </form>
                    </div>
                  </StylesSearchContainerWrapper>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
