import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useWebSocket } from "../hooks/useWebSocket";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { onClickBounceEffect } from "../utils/utils";
import { useSocketContext } from "../context/WebSocketContext";

//styles
import {
  StylesHistoryWrapper,
  StylesLandingPageHeader,
  StylesNewChatButton,
  StylesSearchContainerWrapper,
  StylesSearchInput,
  StylesTokenUsage,
} from "./LandingPage/styles";

//images
import Logo from "../assets/images/logo.png";
import UpArrow from "../assets/images/up-arrow.svg";
import SearchIcon from "../assets/images/search-icon.svg";
import SidebarIcon from "../assets/images/sidebar-icon.svg";
import NewChatButton from "../assets/images/new-chat-button.svg";

// Configure PDF.js worker - simple local approach
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const totalTokenCount = "100000";

export default function PDFViewerPage() {
  const navigate = useNavigate();

  // PDF state
  const [sidebarWidth, setSidebarWidth] = useState("300");
  const [isResizing, setIsResizing] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(800);
  const [documentStates, setDocumentStates] = useState({}); // Store state for each document
  const [pendingScrollActions, setPendingScrollActions] = useState({});
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  //highlight state
  const [charBoxes, setCharBoxes] = useState({
    x0: 67.43999481201172,
    y0: 718.5479736328125,
    x1: 568.2742309570312,
    y1: 731.83197021484385,
    page_start: 770,
    page_end: 772,
  });
  const [yFlipNeeded, setYFlipNeeded] = useState(null);

  //refs
  const messagesEndRef = useRef(null);

  const location = useLocation();

  //context
  const {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    handleSendMessage,
    activeDocuments,
    setActiveDocuments,
    handleInputKeyDown,
    tokenUsage,
    isSidebarOpen,
    setIsSidebarOpen,
    getUserTokenUsage,
    isConnected,
    setMessages,
  } = useSocketContext();

  // WebSocket connection
  const { reconnect } = useWebSocket(
    "wss://api.bookshelf.diy/legal/retrieve/ws"
  );

  // Get current active document
  const getCurrentDocument = () => {
    if (activeDocuments.length === 0) return null;
    return activeDocuments[activeTabIndex] || null;
  };

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
            scrollToPageForDocument(
              targetDoc.id,
              targetPage,
              setDocumentStates
            );
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
        scrollToPageForDocument(targetDoc.id, targetPage, setDocumentStates);
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

  //sidebar resize
  useEffect(() => {
    let rafId;

    const handleMouseMove = (e) => {
      if (!isResizing) return;

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(Math.max(300, Math.min(600, newWidth)));
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
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

  // Debounce PDF width on resize
  useEffect(() => {
    const updatePdfWidth = () => {
      const availableWidth = window.innerWidth - sidebarWidth - 100;
      const newWidth = Math.min(availableWidth * 0.9, 900);
      if (Math.abs(newWidth - pdfWidth) > 10) {
        setPdfWidth(newWidth);
      }
    };

    updatePdfWidth();

    window.addEventListener("resize", updatePdfWidth);

    return () => {
      window.removeEventListener("resize", updatePdfWidth);
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

  //handle mouse down
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  // whenever messages change, scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // debounce effect for thread search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue?.toLowerCase());
    }, 300); // 300ms delay

    return () => clearTimeout(handler);
  }, [searchValue]);

  //filter threads
  const filteredThreads = useMemo(
    () =>
      tokenUsage?.data?.userThreadData
        ?.filter((query) =>
          query?.initialMessage?.toLowerCase().includes(debouncedSearch)
        )
        ?.sort(
          (a, b) => new Date(b.messageCreatedAt) - new Date(a.messageCreatedAt)
        ),
    [tokenUsage, debouncedSearch]
  );

  //progress bar data
  const usedTokens = tokenUsage?.data?.userData?.tokensUsed || 0;
  const progress = Math.min((usedTokens / totalTokenCount) * 100, 100);

  //token usage
  useEffect(() => {
    if (isConnected) getUserTokenUsage();
  }, [isConnected, getUserTokenUsage]);

  // mark app as "justMounted" on first entry
  useEffect(() => {
    if (!sessionStorage.getItem("appMounted")) {
      sessionStorage.setItem("appMounted", "justMounted");
    }
  }, []);

  //reset messages on reload or navigation
  useEffect(() => {
    const isPageReload = performance
      .getEntriesByType("navigation")
      .some((nav) => nav.type === "reload");

    if (!isPageReload) {
      setMessages([]);
    }
  }, [location.pathname, setMessages]);

  //highlight function
  // Detect PDF coordinate system direction (flip or not)
  const detectYDirection = (docId, pageNum) => {
    const boxes = charBoxes[docId]?.[pageNum];
    if (!boxes || boxes.length < 2) return;
    const firstY = boxes[0].y;
    const lastY = boxes[boxes.length - 1].y;
    const isFlipped = firstY > lastY;
    setYFlipNeeded((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], [pageNum]: isFlipped },
    }));
  };

  // Extract per-character bounding boxes
  const handleGetCharBoxes = async (docId, page, pageNum, scale) => {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale });

    if (!yFlipNeeded?.[docId]?.[pageNum]) {
      detectYDirection(docId, pageNum);
    }

    const boxes = [];
    let fullText = "";

    textContent.items.forEach((item) => {
      const tx = pdfjs.Util.transform(viewport.transform, item.transform);
      const x = tx[4];
      const y = tx[5];
      const width = item.width * scale;
      const height = item.height * scale;

      for (const [i, char] of [...item.str].entries()) {
        // const char = item.str[i];
        fullText += char;

        let top = yFlipNeeded?.[docId]?.[pageNum]
          ? viewport.height - y
          : y - height;

        boxes.push({
          char,
          left: x + (i * width) / item.str.length,
          top,
          width: width / item.str.length,
          height,
          lineY: top + height / 2, // approx baseline for line grouping
        });
      }
    });

    setCharBoxes((prev) => ({
      ...prev,
      [docId]: {
        ...(prev[docId] || {}),
        [pageNum]: {
          text: fullText,
          boxes,
          length: fullText.length,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        },
      },
    }));
  };

  // Merge characters into line rectangles
  const mergeBoxesIntoLines = (boxes) => {
    if (!boxes?.length) return [];
    const lineMap = new Map();
    boxes.forEach((b) => {
      const key = Math.round(b.lineY / 5) * 5; // cluster by Y
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key).push(b);
    });

    const lineBoxes = [];
    lineMap.forEach((line) => {
      const x0 = Math.min(...line.map((b) => b.left));
      const x1 = Math.max(...line.map((b) => b.left + b.width));
      const y0 = Math.min(...line.map((b) => b.top));
      const y1 = Math.max(...line.map((b) => b.top + b.height));
      lineBoxes.push({
        left: x0,
        top: y0,
        width: x1 - x0,
        height: y1 - y0,
        lineY: line[0].lineY,
      });
    });

    return lineBoxes;
  };

  // Check if a box is inside a bbox
  const withinBBox = (box, bbox) => {
    return !(
      box.left + box.width < bbox[0] ||
      box.left > bbox[2] ||
      box.top + box.height < bbox[1] ||
      box.top > bbox[3]
    );
  };

  // Render highlights given a logical bbox
  const renderBoundingHighlights = (docId, pageNum, logicalRange) => {
    const pageData = charBoxes?.[docId]?.[pageNum];
    if (!pageData) return null;

    const { x0, y0, x1, y1, page_start, page_end } = logicalRange;
    const { viewportWidth, viewportHeight } = pageData;

    // Convert logical bbox into DOM coords
    const H = pageData.viewportHeight;
    const y0_dom = yFlipNeeded ? H - y1 : y0;
    const y1_dom = yFlipNeeded ? H - y0 : y1;

    // PageBBox now enforces only vertical limits
    let pageBBox;
    if (page_start === page_end) {
      pageBBox = [0, y0_dom, viewportWidth, y1_dom];
    } else if (pageNum === page_start) {
      pageBBox = [0, y0_dom, viewportWidth, viewportHeight];
    } else if (pageNum === page_end) {
      pageBBox = [0, 0, viewportWidth, y1_dom];
    } else if (pageNum > page_start && pageNum < page_end) {
      pageBBox = [0, 0, viewportWidth, viewportHeight];
    } else {
      return null;
    }

    // Candidate chars, then merge into lines
    const candidateBoxes = pageData.boxes.filter((b) =>
      withinBBox(b, pageBBox)
    );
    const lineBoxes = mergeBoxesIntoLines(candidateBoxes);

    // Find first/last line for clipping
    let firstLineY = null,
      lastLineY = null;
    if (pageNum === page_start && lineBoxes.length > 0) {
      firstLineY = Math.min(...lineBoxes.map((b) => b.lineY));
    }
    if (pageNum === page_end && lineBoxes.length > 0) {
      lastLineY = Math.max(...lineBoxes.map((b) => b.lineY));
    }

    return lineBoxes
      .map((line, idx) => {
        let { left, top, width, height, lineY } = line;

        // Clip horizontally only for first line
        if (
          pageNum === page_start &&
          firstLineY !== null &&
          lineY === firstLineY
        ) {
          const cutoff = Math.max(left, x0);
          width = width - (cutoff - left);
          left = cutoff;
          if (width <= 0) return null;
        }

        // Clip horizontally only for last line
        if (pageNum === page_end && lastLineY !== null && lineY === lastLineY) {
          const cutoff = Math.min(left + width, x1);
          width = cutoff - left;
          if (width <= 0) return null;
        }

        return (
          <div
            key={`hl-${docId}-${pageNum}-${idx}`}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              backgroundColor: "rgba(142, 43, 254, 0.27)",
              pointerEvents: "none",
            }}
          />
        );
      })
      .filter(Boolean);
  };

  // const renderPageHighlight = (docId, pageNum, logicalRange) => {
  //   const pageData = charBoxes?.[docId]?.[pageNum];
  //   if (!pageData) return null;

  //   const { x0, y0, x1, y1, page_start, page_end } = logicalRange;
  //   const { viewportWidth, viewportHeight } = pageData;

  //   let left, top, width, height;
  //   if (page_start === page_end && pageNum === page_start) {
  //     left = x0;
  //     top = y0;
  //     width = x1 - x0;
  //     height = y1 - y0;
  //   } else if (pageNum === page_start) {
  //     left = x0;
  //     top = y0;
  //     width = x1 - x0;
  //     height = viewportHeight;
  //   } else if (pageNum === page_end) {
  //     left = x0;
  //     top = 0;
  //     width = x1 - x0;
  //     height = y1;
  //   } else if (pageNum > page_start && pageNum < page_end) {
  //     left = 0;
  //     top = 0;
  //     width = viewportWidth;
  //     height = viewportHeight;
  //   } else {
  //     return null;
  //   }
  //   console.log(left, top, width, height, viewportHeight);

  //   return (
  //     <div
  //       key={`hl-${docId}-${pageNum}`}
  //       style={{
  //         position: "absolute",
  //         left,
  //         top,
  //         width,
  //         height,
  //         backgroundColor: "rgba(142, 43, 254, 0.27)",
  //         pointerEvents: "none",
  //       }}
  //     />
  //   );
  // };

  return (
    <div className="h-screen bg-[#151415]  flex flex-col overflow-hidden">
      <StylesLandingPageHeader>
        <div className="flex items-center">
          <img src={Logo} alt="logo" />
          <div className="w-[2px] bg-[#333234] h-[60px] ml-[20px]"></div>
          <button
            className="h-[60px] bg-[#151415] hover:bg-[#2a292b] transition p-[20px]"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <img src={SidebarIcon} alt="sidebar" />
          </button>
          <div className="w-[2px] bg-[#333234] h-[60px] mr-[20px]"></div>

          <span className="logo-text">
            Your AI-powered research partner for every regulation.
          </span>
        </div>
        <span className="header-right">support@revise.network</span>
      </StylesLandingPageHeader>
      <div className="overflow-hidden bg-[#151415]">
        {/* Show full-width chat when no documents, split view when documents available */}
        <motion.div
          initial={false}
          transition={{ type: "tween", duration: 0.3 }}
        >
          {/* {(activeDocuments.length > 0 || messages.length > 0) && ( */}
          <div className="flex flex-1 h-[calc(100vh-60px)] bg-[#151415]">
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 220 : 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className=" bg-[#1c1b1d]  overflow-hidden flex-shrink-0"
            >
              {isSidebarOpen && (
                <div className="h-full flex flex-col">
                  <StylesSearchInput>
                    <img src={SearchIcon} alt="" />
                    <input
                      type="text"
                      placeholder="Search Chats"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                  </StylesSearchInput>
                  <StylesTokenUsage>
                    <p className="token-header">Tokens</p>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="token-numbers">
                      <p>
                        {tokenUsage?.data?.userData?.tokensUsed
                          ? tokenUsage?.data?.userData?.tokensUsed
                          : "0"}
                      </p>
                      <p>{totalTokenCount}</p>
                    </div>
                    <div className="token-text">
                      <p>Used</p>
                      <p>Total</p>
                    </div>
                  </StylesTokenUsage>

                  <StylesNewChatButton
                    onClick={(event) =>
                      onClickBounceEffect(event, 150, () => navigate("/"))
                    }
                  >
                    <img src={NewChatButton} alt="chat" /> New Chat
                  </StylesNewChatButton>

                  <StylesHistoryWrapper>
                    <h1 className="history-header">HISTORY</h1>
                    <ul className="history-list">
                      {filteredThreads?.length > 0 ? (
                        filteredThreads?.map((query, uniqueQuery) => {
                          const isActive =
                            location.pathname === `/c/${query?.id}`;
                          return (
                            <li
                              className={`hover:text-gray-300 cursor-pointer query-name ${
                                isActive
                                  ? "bg-[#2a292b] text-white rounded-md"
                                  : ""
                              }`}
                              key={uniqueQuery}
                              onClick={() => navigate(`/c/${query?.id}`)}
                            >
                              {query?.initialMessage}
                            </li>
                          );
                        })
                      ) : (
                        <p className="text-center">No history found</p>
                      )}
                    </ul>
                  </StylesHistoryWrapper>
                </div>
              )}
            </motion.aside>
            <div className="flex-1 flex overflow-hidden ">
              {activeDocuments.length > 0 && (
                <div
                  className=" flex flex-col"
                  style={{
                    width: `calc(100% - ${sidebarWidth}px)`,
                    transition: "none",
                    minWidth: "200px",
                  }}
                >
                  {/* Document Tabs */}
                  {activeDocuments?.length > 0 && (
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
                            {activeDocuments?.length > 1 && (
                              <span
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
                              </span>
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
                          goToPage(
                            getCurrentDocumentState().currentPageInView - 1
                          )
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
                          goToPage(
                            getCurrentDocumentState().currentPageInView + 1
                          )
                        }
                      />
                    </div>
                  </div>
                  {activeDocuments.length > 0 && (
                    <div
                      className="flex-1 bg-[#1C1B1D] overflow-auto p-4 pdf-container mx-[20px]  custom-scrollbar-pdf"
                      style={{
                        opacity: isResizing ? 0.7 : 1,
                        transition: "opacity 0.1s ease",
                      }}
                    >
                      {activeDocuments?.length > 0 ? (
                        <div className="flex justify-center">
                          <div className="space-y-4">
                            {activeDocuments.map((doc, index) => {
                              const docState = documentStates[doc.id] || {};
                              const isVisible = index === activeTabIndex;
                              const pendingAction =
                                pendingScrollActions[doc.id];
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
                                    onLoadSuccess={onDocumentLoadSuccess(
                                      doc.id
                                    )}
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
                                              className="relative bg-white shadow-lg rounded-lg overflow-hidden mb-4"
                                              style={{ position: "relative" }}
                                            >
                                              <div className="bg-gray-50 px-4 py-2 text-sm text-black font-medium">
                                                Page {pageNumber}
                                              </div>
                                              <div
                                                style={{ position: "relative" }}
                                              >
                                                <Page
                                                  pageNumber={pageNumber}
                                                  width={pdfWidth}
                                                  loading={
                                                    <div className="flex items-center justify-center h-96">
                                                      <div className="text-gray-500">
                                                        Loading page{" "}
                                                        {pageNumber}
                                                        ...
                                                      </div>
                                                    </div>
                                                  }
                                                  renderTextLayer={false}
                                                  renderAnnotationLayer={false}
                                                  onLoadSuccess={(page) =>
                                                    handleGetCharBoxes(
                                                      doc.id,
                                                      page,
                                                      pageNumber,
                                                      pdfWidth /
                                                        page.getViewport({
                                                          scale: 1,
                                                        }).width
                                                    )
                                                  }
                                                />
                                                <div
                                                  style={{
                                                    position: "absolute",
                                                    left: 0,
                                                    top: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    pointerEvents: "none",
                                                    zIndex: 3,
                                                  }}
                                                >
                                                  {renderBoundingHighlights(
                                                    doc.id,
                                                    pageNumber,
                                                    charBoxes
                                                  )}

                                                  {/* {renderPageHighlight(
                                                    doc.id,
                                                    pageNumber,
                                                    charBoxes
                                                  )} */}
                                                </div>
                                              </div>
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
                  )}
                </div>
              )}
              <div
                className="w-1 bg-[#333234] hover:bg-[grey] cursor-col-resize transition-colors select-none"
                onMouseDown={handleMouseDown}
                style={{ userSelect: "none" }}
              />
              <div
                className="bg-[#1C1B1D] border-l border-[#333234] flex flex-col flex-shrink-0  "
                style={{
                  width:
                    activeDocuments?.length === 0
                      ? "100%"
                      : `${sidebarWidth}px`,
                  transition: "0.3s  linear",
                }}
              >
                <div className="flex-1 p-6 overflow-auto pb-[120px] custom-scrollbar">
                  <div className="space-y-4">
                    {messages?.map((message, index) => {
                      return (
                        <div key={index} className="space-y-4 ">
                          {message.isLoader ? (
                            <div className="flex justify-start">
                              <div className="text-gray-400 italic animate-pulse">
                                {message.content}
                              </div>
                            </div>
                          ) : message?.type === "user" ? (
                            <div className="flex justify-end">
                              <div className="bg-[#333234] text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                                <p className="text-sm">{message.content}</p>
                              </div>
                            </div>
                          ) : message?.type === "error" ? (
                            <div className="flex justify-center">
                              <div className="bg-red-600 text-white rounded-md px-4 py-2 max-w-xs text-center">
                                <p className="text-sm font-medium">
                                  {message.message}
                                  {JSON.stringify(message)}
                                </p>
                                <button
                                  onClick={() => {
                                    reconnect();
                                    navigate("/");
                                    window.location.reload();
                                  }}
                                  className="bg-white text-red-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-200 transition"
                                >
                                  Retry Connection
                                </button>
                              </div>
                            </div>
                          ) : message?.type === "ai" ? (
                            <div className="flex justify-start">
                              <div className="text-white border-b border-[#333234] mt-[10px] pb-[10px]">
                                <p className="text-sm leading-relaxed">
                                  {message?.font === "italic" ? (
                                    <i>{message?.content}</i>
                                  ) : (
                                    message.content
                                  )}
                                </p>
                                {message?.chunks &&
                                  message?.chunks?.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        References
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {message.chunks.map(
                                          (chunk, chunkIndex) => (
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
                                              } - Page ${Math.floor(
                                                chunk.page_start
                                              )}`}
                                            >
                                              <ExternalLink className="w-3 h-3 mr-1" />
                                              {chunk.source.replace(".pdf", "")}{" "}
                                              p.
                                              {Math.floor(chunk.page_start)}
                                            </Button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex gap-5 text-[#5a5959] items-center">
                        Generating response...
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mt-3"></div>
                      </div>
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
                            onKeyDown={handleInputKeyDown}
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
          </div>
          {/* )} */}
        </motion.div>
      </div>
    </div>
  );
}
