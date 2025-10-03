import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router";
//third party libraries
// import { ChevronDown, ChevronUp } from "lucide-react";
import { pdfjs } from "react-pdf";
import { motion } from "framer-motion";
//hooks
import { useWebSocket } from "../hooks/useWebSocket";
//styles
import {
  StylesChunksDetails,
  StylesLandingPageBottomLeft,
  StylesSearchContainerWrapper,
} from "./LandingPage/styles";
//images
import UpArrow from "../assets/images/up-arrow.svg";
import LoadingBanner from "../assets/images/loadingBanner.png";
import Bullet from "../assets/images/bullet.svg";
import ComingSoon from "../assets/images/coming-soon.svg";
import NotificationIcon from "../assets/images/notification.svg";

//components
// import { Button } from "./ui/button";
import Navbar from "./Navbar/Navbar";
import SidebarComponent from "./Sidebar/Sidebar";
import DocumentViewer from "./ViewDocument/ViewDocument";
//context
import { useDocsContext } from "../context/DocumentsContext";
import { useUIContext } from "../context/UIContext";
import { useChatContext } from "../context/ChatContext";

// Configure PDF.js worker - simple local approach
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

//loop the loaders
const loadingTexts = [
  "⌛ Indexing Schedules with machine-like patience...",
  "⌛ Parsing the legislative intent behind Section headings...",
  "⌛ Cross-checking clauses faster than you can say ‘proviso...",
  "⌛ Untangling provisos in record time...",
  "⌛ Cross-checking clauses like an auditor before a deadline...",
  "⌛ Spotting hidden Explanations between the lines...",
  "⌛ Consulting the spirit of the legislature (takes a moment)...",
  "⌛ Tracing cross-references across the Act’s maze...",
  "⌛ Flipping through schedules at lightning speed...",
];

//PDFViewerPage component
const PDFViewerPage = memo(() => {
  const navigate = useNavigate();

  // PDF state
  const [sidebarWidth, setSidebarWidth] = useState("40");
  const [isResizing, setIsResizing] = useState(false);
  // const [pdfWidth, setPdfWidth] = useState(800);
  const [documentStates, setDocumentStates] = useState({});
  const [pendingScrollActions, setPendingScrollActions] = useState({});
  const [currentText, setCurrentText] = useState(loadingTexts[0]);
  const [references, setReferences] = useState([]);

  //get the final chunks using threadId from local storage

  //highlight state - test reference data
  const testReference = {
    x0: 89.94003295898438,
    y0: 496.7878723144531,
    x1: 567.8385620117188,
    y1: 552.0718383789062,
    page_start: 2,
    page_end: 2,
  };


  

  const [charBoxes, setCharBoxes] = useState({});
  const [yFlipNeeded, setYFlipNeeded] = useState({});

  //refs
  const resizeRafId = useRef();
  const messagesEndRef = useRef(null);
  const pageRefs = useRef({});

  //contexts
  const {
    handleInputKeyDown,
    inputMessage,
    setInputMessage,
    isLoading,
    messages,
    handleSendMessage,
    tokenExhaustedError,
  } = useChatContext();
  const { isSidebarOpen } = useUIContext();
  const {
    activeDocuments,
    setActiveDocuments,
    setActiveTabIndex,
    activeTabIndex,
  } = useDocsContext();

  //handle notify button
  const handleNotify = () => {
    window.open("https://tax.revise.network/#signup", "_blank");
  };

  // WebSocket connection
  const { reconnect } = useWebSocket(
    "wss://api.bookshelf.diy/legal/retrieve/ws"
  );

  const scrollFnsRef = useRef({});

  const handleRegisterScrollTo = (docId, fn) => {
    scrollFnsRef.current[docId] = fn;
  };

  const scrollToPageForDocument = useCallback(
    (docId, page) => {
      const docState = documentStates[docId];
      if (!docState || !docState.numPages) return;

      const targetPage = Math.max(1, Math.min(docState.numPages, page));

      //call the registered scroll function
      const fn = scrollFnsRef.current[docId];
      if (fn) {
        fn(targetPage);
        setDocumentStates((prev) => ({
          ...prev,
          [docId]: {
            ...prev[docId],
            currentPageInView: targetPage,
            pageNumber: targetPage,
          },
        }));
      } else {
        // Not ready yet → fallback to pending action
        setPendingScrollActions((prev) => ({
          ...prev,
          [docId]: { targetPage },
          isAuto: false,
        }));
      }
    },
    [documentStates, setDocumentStates, setPendingScrollActions]
  );

  // Get current active document
  const getCurrentDocument = useCallback(() => {
    if (activeDocuments.length === 0) return null;
    return activeDocuments[activeTabIndex] || null;
  }, [activeDocuments, activeTabIndex]);

  const scrollToPage = useCallback(
    (page) => {
      const currentDoc = getCurrentDocument();
      if (currentDoc) {
        scrollToPageForDocument(currentDoc.id, page);
      }
    },
    [getCurrentDocument, scrollToPageForDocument]
  );

  // Handle reference button click
  const handleReferenceClick = useCallback(
    (chunk) => {
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
    },
    [
      activeDocuments,
      activeTabIndex,
      scrollToPageForDocument,
      setDocumentStates,
      documentStates,
      scrollToPage,
      setActiveTabIndex,
    ]
  );

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
    [pendingScrollActions, scrollToPageForDocument]
  );

  // const goToPage = useCallback(
  //   (page) => {
  //     scrollToPage(page);
  //   },
  //   [scrollToPage]
  // );

  // Get current document state
  // const getCurrentDocumentState = useCallback(() => {
  //   const currentDoc = getCurrentDocument();
  //   if (!currentDoc)
  //     return { currentPageInView: 1, pageNumber: 1, numPages: null };
  //   return (
  //     documentStates[currentDoc.id] || {
  //       currentPageInView: 1,
  //       pageNumber: 1,
  //       numPages: null,
  //     }
  //   );
  // }, [documentStates, getCurrentDocument]);

  // handle mouse down
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return;

      const newWidthPx = window.innerWidth - e.clientX;
      const newWidthPercent = (newWidthPx / window.innerWidth) * 100;

      const clampedWidth = Math.max(20, Math.min(60, newWidthPercent));

      // Directly update DOM for smooth dragging
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.style.width = `${clampedWidth}%`;
      }
      if (resizeRafId.current) {
        cancelAnimationFrame(resizeRafId.current);
      }

      resizeRafId.current = requestAnimationFrame(() => {
        setSidebarWidth(clampedWidth);
      });
    },
    [isResizing]
  );

  // sidebar resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (resizeRafId.current) {
        cancelAnimationFrame(resizeRafId.current);
      }
    };
  }, [isResizing, handleMouseMove]);

  // Debounce PDF width on resize
  // useEffect(() => {
  //   const updatePdfWidth = () => {
  //     const availableWidth = window.innerWidth - sidebarWidth - 100;
  //     const newWidth = Math.min(availableWidth * 0.9, 900);
  //     if (Math.abs(newWidth - pdfWidth) > 10) {
  //       setPdfWidth(newWidth);
  //     }
  //   };

  //   updatePdfWidth();

  //   window.addEventListener("resize", updatePdfWidth);

  //   return () => {
  //     window.removeEventListener("resize", updatePdfWidth);
  //   };
  // }, [sidebarWidth, pdfWidth]);

  //document scroll
  useEffect(() => {
    const currentDoc = getCurrentDocument();
    if (!currentDoc) return;

    const docState = documentStates[currentDoc.id];
    if (!docState || !docState.numPages || !docState.isLoaded) return;

    let ticking = false; // throttle flag

    const observer = new IntersectionObserver(
      (entries) => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const idParts = entry.target.id.split("-");
                const docId = idParts.slice(0, -2).join("-");
                const pageNum = parseInt(idParts[idParts.length - 1]);

                if (docId === currentDoc.id) {
                  setDocumentStates((prev) => {
                    const prevState = prev[docId] || {};
                    if (prevState.currentPageInView === pageNum) {
                      return prev;
                    }
                    return {
                      ...prev,
                      [docId]: {
                        ...prevState,
                        currentPageInView: pageNum,
                        pageNumber: pageNum,
                      },
                    };
                  });
                }
              }
            });
            ticking = false; // reset after RAF
          });
        }
      },
      { threshold: 0.5 }
    );

    // Observe all pages using refs
    for (let i = 1; i <= docState.numPages; i++) {
      const key = `${currentDoc.id}-page-${i}`;
      const pageEl = pageRefs.current[key];
      if (pageEl) {
        // add a data attribute so we can recover docId + pageNum in callback
        pageEl.dataset.key = key;
        observer.observe(pageEl);
      }
    }

    return () => observer.disconnect();
  }, [activeTabIndex, documentStates, getCurrentDocument]);

  // whenever messages change, scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const allReferences = messages
      .filter((m) => m.type === "ai" && Array.isArray(m.chunks))
      .flatMap((m) => m.chunks);
    setReferences(allReferences);
  }, [messages]);

  //highlight function
  // Detect PDF coordinate system direction (flip or not)
  const detectYDirection = useCallback(
    (docId, pageNum) => {
      const pageData = charBoxes[docId]?.[pageNum];

      if (!pageData?.boxes || pageData.boxes.length < 2) return;

      const firstY = pageData.boxes[0].y; // raw PDF y
      const lastY = pageData.boxes[pageData.boxes.length - 1].y;
      const isFlipped = firstY > lastY; // true if coordinate system increases downward

      setYFlipNeeded((prev) => ({
        ...(prev || {}),
        [docId]: { ...(prev[docId] || {}), [pageNum]: isFlipped },
      }));
    },
    [charBoxes]
  );

  // Extract per-character bounding boxes
  const handleGetCharBoxes = useCallback(
    async (docId, page, pageNum, scale) => {
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });
      const originalViewport = page.getViewport({ scale: 1 });

      if (pageNum === 2) {
        console.log('PDF original dimensions:', {
          width: originalViewport.width,
          height: originalViewport.height,
          scaledWidth: viewport.width,
          scaledHeight: viewport.height,
          scale
        });
      }

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
            y,
            width: width / item.str.length,
            height,
            lineY: top + height / 2,
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
            originalWidth: originalViewport.width,
            originalHeight: originalViewport.height,
          },
        },
      }));
    },
    [detectYDirection, yFlipNeeded]
  );

  // Merge characters into line rectangles using lineY midpoint clustering
  const mergeBoxesIntoLines = useCallback((boxes, tolerance = 3) => {
    if (!boxes?.length) return [];

    const lineMap = new Map();

    boxes.forEach((b) => {
      // find an existing cluster within tolerance
      let clusterKey = null;
      for (let k of lineMap.keys()) {
        if (Math.abs(k - b.lineY) <= tolerance) {
          clusterKey = k;
          break;
        }
      }

      // if no cluster found, create a new one
      if (clusterKey === null) clusterKey = b.lineY;

      if (!lineMap.has(clusterKey)) lineMap.set(clusterKey, []);
      lineMap.get(clusterKey).push(b);
    });

    // build line rectangles
    const lineBoxes = [];
    lineMap.forEach((line) => {
      const x0 = Math.min(...line.map((b) => b.left));
      const x1 = Math.max(...line.map((b) => b.left + b.width));
      const y0 = Math.min(...line.map((b) => b.top));
      const y1 = Math.max(...line.map((b) => b.top + b.height));
      const midY = line.reduce((sum, b) => sum + b.lineY, 0) / line.length;

      lineBoxes.push({
        left: x0,
        top: y0,
        width: x1 - x0,
        height: y1 - y0,
        lineY: midY,
      });
    });

    // keep them sorted top-to-bottom
    return lineBoxes.sort((a, b) => a.lineY - b.lineY);
  }, []);

  // Check if a box is inside a bbox
  const withinBBox = useCallback((box, bbox) => {
    return !(
      box.left + box.width < bbox[0] ||
      box.left > bbox[2] ||
      box.top + box.height < bbox[1] ||
      box.top > bbox[3]
    );
  }, []);

  // Render highlights given a logical bbox
  const renderBoundingHighlights = useCallback(
    (docId, pageNum, logicalRange) => {
      const pageData = charBoxes?.[docId]?.[pageNum];
      if (!pageData) return null;

      const { x0, y0, x1, y1, page_start, page_end } = logicalRange;
      const { viewportWidth, viewportHeight, originalWidth, originalHeight } = pageData;

      // Scale reference coordinates to match char box viewport
      // Use actual PDF dimensions, not assumed standard sizes
      const scaleX = viewportWidth / (originalWidth || 612);
      const scaleY = viewportHeight / (originalHeight || 792);

      const x0_scaled = x0 * scaleX;
      const x1_scaled = x1 * scaleX;
      const y0_scaled = y0 * scaleY;
      const y1_scaled = y1 * scaleY;

      // Convert logical bbox into DOM coords
      const H = pageData.viewportHeight;
      const isFlipped = yFlipNeeded?.[docId]?.[pageNum];
      const y0_dom = isFlipped ? H - y1_scaled : y0_scaled;
      const y1_dom = isFlipped ? H - y0_scaled : y1_scaled;

      // PageBBox enforces only vertical limits
      let pageBBox;
      if (pageNum === page_start && page_start === page_end) {
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

          // Clip left edge on first line
          if (
            pageNum === page_start &&
            firstLineY !== null &&
            lineY === firstLineY
          ) {
            const cutoff = Math.max(left, x0_scaled);
            width = width - (cutoff - left);
            left = cutoff;
            if (width <= 0) return null;
          }

          // Clip right edge on last line
          if (
            pageNum === page_end &&
            lastLineY !== null &&
            lineY === lastLineY
          ) {
            const cutoff = Math.min(left + width, x1_scaled);
            width = cutoff - left;
            console.log('After right clip:', { left, width });
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
    },
    [charBoxes, withinBBox, mergeBoxesIntoLines, yFlipNeeded]
  );

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

  //loading text function
  const loopLoaderTexts = useCallback(() => {
    const interval = setInterval(() => {
      setCurrentText(
        loadingTexts[Math.floor(Math.random() * loadingTexts.length)]
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loopLoaderTexts();
  }, [isLoading, loopLoaderTexts]);

  return (
    <div className="h-screen bg-[#151415]  flex flex-col overflow-hidden">
      <Navbar />
      <div className="overflow-hidden bg-[#151415]">
        {/* Show full-width chat when no documents, split view when documents available */}
        <motion.div
          initial={false}
          transition={{ type: "tween", duration: 0.3 }}
        >
          <div className="flex flex-1 h-[calc(100vh-60px)] bg-[#151415]">
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 220 : 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className=" bg-[#1c1b1d]  overflow-hidden flex-shrink-0"
            >
              <SidebarComponent />
            </motion.aside>
            <div className="flex overflow-hidden w-full">
              {/* pdf section */}
              {activeDocuments.length > 0 ? (
                <div
                  className=" flex flex-col"
                  style={{
                    width: `calc(99.8% - ${sidebarWidth}%)`,
                    transition: isResizing ? "none" : "0.3s linear",
                    minWidth: "40%",
                    maxWidth: "80%",
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
                  {/* <div className=" px-6 py-4 flex items-center gap-6 bg-[#333234] flex-shrink-0 mx-[20px] rounded-t">
                    <div className="flex items-center gap-2">
                      <ChevronUp
                        className="w-4 h-4 text-white cursor-pointer hover:text-gray-700"
                        onClick={() =>
                          goToPage(
                            getCurrentDocumentState().currentPageInView - 1
                          )
                        }
                      />
                      <span className="text-sm font-medium text-white min-w-[30px] text-center">
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
                  </div> */}
                  {activeDocuments.length > 0 && (
                    <div
                      className="flex-1 bg-[#1C1B1D] overflow-hidden p-4 pdf-container mx-[20px]  custom-scrollbar-pdf"
                      style={{
                        opacity: isResizing ? 0.7 : 1,
                        transition: "opacity 0.1s ease",
                      }}
                    >
                      {activeDocuments?.length > 0 ? (
                        <div className="flex justify-center">
                          <div className="space-y-4">
                            {activeDocuments.map((doc, index) => (
                              <DocumentViewer
                                key={doc.id}
                                doc={doc}
                                pageRefs={pageRefs}
                                isVisible={index === activeTabIndex}
                                isResizing={isResizing}
                                docState={documentStates[doc.id] || {}}
                                pendingAction={pendingScrollActions[doc.id]}
                                onDocumentLoadSuccess={onDocumentLoadSuccess}
                                handleGetCharBoxes={handleGetCharBoxes}
                                charBoxes={testReference}
                                renderBoundingHighlights={
                                  renderBoundingHighlights
                                }
                                setPendingScrollActions={
                                  setPendingScrollActions
                                }
                                onRegisterScrollTo={handleRegisterScrollTo}
                                references={references.filter(
                                  (r) => r.source === doc.name
                                )}
                              />
                            ))}
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
              ) : (
                <div
                  className=" h-full flex justify-center items-center flex-col text-white text-center"
                  style={{
                    transition: isResizing ? "none" : "0.3s linear",
                    width: `calc(99.8% - ${sidebarWidth}%)`,
                    minWidth: "60%",
                    maxWidth: "80%",
                  }}
                >
                  <div className="max-w-[400px] text-center flex  flex-col gap-[47px]">
                    <img src={LoadingBanner} alt="banner" loading="lazy" />
                    <div>
                      <h1 className="mb-[8px] text-[31px] font-bold">
                        Working on your answer…
                      </h1>
                      <p className="text-[14px] font-normal">
                        Scanning the Act, fetching the right section, and
                        turning it into clear text you can trust.
                      </p>
                    </div>
                    <StylesLandingPageBottomLeft>
                      <div>
                        <p className="bottom-title ">Currently supporting</p>
                        <p className="bottom-body ">
                          <img src={Bullet} alt="bullet" /> Income-tax Act, 1961
                          (as amended by the Finance Act, 2025)
                        </p>
                      </div>
                      <div>
                        <p className="bottom-title ">Coming soon</p>
                        <div className="bottom-body ">
                          <img src={ComingSoon} alt="bullet" />
                          GST, International Tax, Transfer Pricing, Company &
                          SEBI Laws, Insolvency & Bankruptcy Code, FEMA, Banking
                          & Insurance, Competition Law, Accounts & Audit, Other
                          Indian Acts & Rules
                        </div>
                      </div>
                    </StylesLandingPageBottomLeft>
                  </div>
                </div>
              )}

              {/* resize bar */}
              {activeDocuments?.length > 0 && (
                <div
                  className="w-1 bg-[#333234] hover:bg-[grey] cursor-col-resize transition-colors select-none"
                  onMouseDown={handleMouseDown}
                  style={{ userSelect: "none", minWidth: "0.2%" }}
                />
              )}

              {/* chat section */}
              <div
                className="bg-[#1C1B1D] border-l border-[#333234] flex flex-col"
                style={{
                  width:
                    activeDocuments?.length === 0
                      ? "99.8%"
                      : `${sidebarWidth}%`,
                  transition: isResizing ? "none" : "0.3s linear",
                  minWidth: "20%",
                  maxWidth: "60%",
                }}
              >
                <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden pb-[120px] custom-scrollbar">
                  <div className="space-y-4 ">
                    {messages?.map((message, index) => {
                      return (
                        <div key={index} className="space-y-4">
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
                                  {/* {message.message} */}
                                  {JSON.stringify(message.content)}
                                </p>
                                {message?.content ===
                                "Token Usage Limit Reached." ? (
                                  <button
                                    onClick={handleNotify}
                                    className="bg-white text-red-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-200 transition flex gap-1 items-center"
                                  >
                                    <img src={NotificationIcon} alt="notify" />
                                    Notify Me When Coverage Expands
                                  </button>
                                ) : (
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
                                )}
                              </div>
                            </div>
                          ) : message?.type === "ai" ? (
                            <div className="flex justify-start">
                              <div className="text-white  mt-[10px] pb-[10px]  overflow-hidden">
                                <div className="text-sm leading-relaxed break-word whitespace-pre-wrap">
                                  {message?.font === "italic" ? (
                                    <i>{message?.content}</i>
                                  ) : (
                                    <p className="border-b border-[#333234] pb-3">
                                      {message.content}
                                    </p>
                                  )}
                                </div>
                                {message.final_used_chunks &&
                                  message.final_used_chunks?.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      {/* <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        References
                                      </h4> */}
                                      <h4 className="text-[17px] font-medium">
                                        {/* {message?.chunks[0].source
                                          .replace(".pdf", "")
                                          .replace(/-/g, " ")} */}
                                        Income-tax Act, 1961 (as amended by
                                        Finance Act, 2025)
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {message?.final_used_chunks.map(
                                          (chunk, chunkIndex) => {
                                            return (
                                              // <Button
                                              //   key={chunkIndex}
                                              //   variant="outline"
                                              //   size="sm"
                                              //   className="text-xs h-6 px-2 border-[#333234] text-white "
                                              //   onClick={() =>
                                              //     handleReferenceClick(chunk)
                                              //   }
                                              //   title={`${
                                              //     chunk.source
                                              //   } - Page ${Math.floor(
                                              //     chunk.page_start
                                              //   )}`}
                                              // >
                                              //   <ExternalLink className="w-3 h-3 mr-1" />
                                              //   {chunk.source?.length < 30
                                              //     ? chunk.source.replace(
                                              //         ".pdf",
                                              //         ""
                                              //       )
                                              //     : chunk.source.slice(0, 27) +
                                              //       "..."}
                                              //   p.
                                              //   {Math.floor(chunk.page_start)}
                                              // </Button>
                                              <StylesChunksDetails
                                                key={chunkIndex}
                                                onClick={() =>
                                                  handleReferenceClick(chunk)
                                                }
                                              >
                                                <p>SEC {chunk?.section}</p>
                                              </StylesChunksDetails>
                                            );
                                          }
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
                        {currentText}
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mt-3"></div>
                      </div>
                    )}

                    {/*  Chat Scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <div className="pb-[20px] bg-[#1C1B1D] ">
                  <div className="flex gap-2 relative">
                    <StylesSearchContainerWrapper
                      $isButtonDisabled={
                        isLoading || !inputMessage.trim() || tokenExhaustedError
                      }
                    >
                      <div
                        className="right-part-bottom-section"
                        style={{ cursor: isLoading ? "not-allowed" : "auto" }}
                      >
                        <form
                          onSubmit={handleSendMessage}
                          className="search-container"
                        >
                          <textarea
                            placeholder="What is this document?"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            disabled={isLoading}
                          ></textarea>
                          <div className="button-text">
                            {/* <span className="gpt-name">Using GPT-5 </span> */}
                            <button
                              className="submit-button"
                              type="button"
                              disabled={
                                isLoading ||
                                !inputMessage.trim() ||
                                tokenExhaustedError
                              }
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
        </motion.div>
      </div>
    </div>
  );
});

export default PDFViewerPage;
