import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router";
//third party libraries
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { pdfjs } from "react-pdf";
import { motion } from "framer-motion";
//hooks
import { useWebSocket } from "../hooks/useWebSocket";
//styles
import { StylesSearchContainerWrapper } from "./LandingPage/styles";
//images
import UpArrow from "../assets/images/up-arrow.svg";
//components
import { Button } from "./ui/button";
import Navbar from "./Navbar/Navbar";
import SidebarComponent from "./Sidebar/Sidebar";
import DocumentViewer from "./ViewDocument/ViewDocument";
//context
import { useDocsContext } from "../context/DocumentsContext";
import { useUIContext } from "../context/UIContext";
import { useChatContext } from "../context/ChatContext";

// Configure PDF.js worker - simple local approach
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

//PDFViewerPage component
const PDFViewerPage = memo(() => {
  const navigate = useNavigate();

  // PDF state
  const [sidebarWidth, setSidebarWidth] = useState("350");
  const [isResizing, setIsResizing] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(800);
  const [documentStates, setDocumentStates] = useState({});
  const [pendingScrollActions, setPendingScrollActions] = useState({});

  //highlight state
  const [charBoxes, setCharBoxes] = useState({});
  const [yFlipNeeded, setYFlipNeeded] = useState({});
  const [activeChunk, setActiveChunk] = useState(null);

  //refs
  const sidebarWidthRef = useRef(sidebarWidth);
  const resizeRafId = useRef();
  const messagesEndRef = useRef(null);

  //contexts
  const {
    handleInputKeyDown,
    inputMessage,
    setInputMessage,
    isLoading,
    messages,
  } = useChatContext();
  const { isSidebarOpen, handleSendMessage } = useUIContext();
  const {
    activeDocuments,
    setActiveDocuments,
    setActiveTabIndex,
    activeTabIndex,
  } = useDocsContext();

  // WebSocket connection
  const { reconnect } = useWebSocket(
    "wss://api.bookshelf.diy/legal/retrieve/ws"
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
      // Set this chunk as active for highlighting
      console.log("\n🎯 === REFERENCE CLICKED ===");
      console.log("Chunk source:", chunk.source);
      console.log("Chunk page_start:", chunk.page_start, "page_end:", chunk.page_end);
      console.log("All page_bboxes keys:", Object.keys(chunk.page_bboxes || {}));
      console.log("Full page_bboxes:", chunk.page_bboxes);
      console.log("First 200 chars of chunk text:", chunk.text?.substring(0, 200));
      setActiveChunk(chunk);

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

  const goToPage = useCallback(
    (page) => {
      scrollToPage(page);
    },
    [scrollToPage]
  );

  // Get current document state
  const getCurrentDocumentState = useCallback(() => {
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
  }, [documentStates, getCurrentDocument]);

  //handle mouse down
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return;

      const newWidth = Math.max(
        350,
        Math.min(600, window.innerWidth - e.clientX)
      );
      sidebarWidthRef.current = newWidth;

      // Directly update DOM for smooth dragging
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.style.width = `${newWidth}px`;
      }

      if (resizeRafId.current) {
        cancelAnimationFrame(resizeRafId.current);
      }

      resizeRafId.current = requestAnimationFrame(() => {
        setSidebarWidth(newWidth);
      });
    },
    [isResizing]
  );

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  //sidebar resize
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

    // Observe all page elements for the current document
    for (let i = 1; i <= docState.numPages; i++) {
      const pageElement = document.getElementById(`${currentDoc.id}-page-${i}`);
      if (pageElement) observer.observe(pageElement);
    }

    return () => observer.disconnect();
  }, [activeTabIndex, documentStates, getCurrentDocument]);

  // whenever messages change, scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Extract per-character bounding boxes
  const handleGetCharBoxes = useCallback(
    async (docId, page, pageNum, scale) => {
      console.log(`📏 Scale factor for page ${pageNum}: ${scale}`);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });

      const boxes = [];
      let fullText = "";

      textContent.items.forEach((item) => {
        const tx = pdfjs.Util.transform(viewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5];
        const width = item.width * scale;
        const height = item.height * scale;

        for (const [i, char] of [...item.str].entries()) {
          fullText += char;

          boxes.push({
            char,
            left: x + (i * width) / item.str.length,
            top: y - height, // Will be corrected later if needed
            y, // Store raw y for flip detection
            width: width / item.str.length,
            height,
            lineY: 0, // Will be set after flip detection
          });
        }
      });

      // Detect Y-axis direction from the boxes we just created
      const firstY = boxes.length > 0 ? boxes[0].y : 0;
      const lastY = boxes.length > 1 ? boxes[boxes.length - 1].y : 0;
      const isFlipped = firstY > lastY;

      console.log(`📊 Y-flip detection for page ${pageNum}: firstY=${firstY}, lastY=${lastY}, isFlipped=${isFlipped}`);

      // Update flip state
      setYFlipNeeded((prev) => ({
        ...(prev || {}),
        [docId]: { ...(prev[docId] || {}), [pageNum]: isFlipped },
      }));

      // Now correct the top and lineY values based on flip detection
      boxes.forEach((box) => {
        box.top = isFlipped ? viewport.height - box.y : box.y - box.height;
        box.lineY = box.top + box.height / 2;
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
            scale, // Store scale for bbox conversion
          },
        },
      }));
    },
    []
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

  // Render highlights given pagewise bboxes
  const renderBoundingHighlights = useCallback(
    (docId, pageNum, page_bboxes) => {
      console.log(`\n=== renderBoundingHighlights DEBUG for page ${pageNum} ===`);
      console.log("page_bboxes received:", page_bboxes);
      console.log("charBoxes for docId:", charBoxes?.[docId]?.[pageNum]);

      const pageData = charBoxes?.[docId]?.[pageNum];
      if (!pageData || !page_bboxes) {
        console.log("❌ No pageData or page_bboxes, returning null");
        return null;
      }

      // Simple lookup: does this page have a bbox?
      const bbox = page_bboxes[pageNum];
      if (!bbox) {
        console.log(`❌ No bbox for page ${pageNum}, available pages:`, Object.keys(page_bboxes));
        return null;
      }

      console.log(`✅ Found bbox for page ${pageNum}:`, bbox);

      let [x0, y0, x1, y1] = bbox;
      const { viewportWidth, viewportHeight, scale } = pageData;

      console.log("📐 Viewport dimensions:", { viewportWidth, viewportHeight });
      console.log("📏 Scale factor:", scale);
      console.log("📦 Raw bbox from backend (native resolution): [x0, y0, x1, y1] =", [x0, y0, x1, y1]);

      // Scale backend bbox to match rendered coordinates
      if (scale) {
        x0 *= scale;
        y0 *= scale;
        x1 *= scale;
        y1 *= scale;
        console.log("📦 Scaled bbox (rendered resolution): [x0, y0, x1, y1] =", [x0, y0, x1, y1]);
      }

      // Sample first and last char boxes to understand coordinate system
      if (pageData.boxes.length > 0) {
        console.log("📍 First char box:", pageData.boxes[0]);
        console.log("📍 Last char box:", pageData.boxes[pageData.boxes.length - 1]);
        console.log("📄 Full text length:", pageData.text.length);
        console.log("📝 First 100 chars:", pageData.text.substring(0, 100));
      }

      // Convert bbox to DOM coords (handle Y-flip if needed)
      const H = viewportHeight;
      const isFlipped = yFlipNeeded?.[docId]?.[pageNum];
      console.log("🔄 Y-axis isFlipped?", isFlipped);

      // Backend bbox is in PDF space (origin bottom-left)
      // Char boxes are in DOM space (origin top-left) when isFlipped=false
      // Need to flip bbox Y coords AND swap y0/y1
      let y0_dom, y1_dom;
      if (isFlipped) {
        // Both in same coordinate system already
        y0_dom = y0;
        y1_dom = y1;
      } else {
        // Backend bbox in PDF space, char boxes in DOM space
        // In PDF: y0=bottom, y1=top. In DOM: need top first
        y0_dom = H - y1;  // PDF top becomes DOM top
        y1_dom = H - y0;  // PDF bottom becomes DOM bottom
      }

      console.log("🎯 Converted to DOM coords: y0_dom =", y0_dom, ", y1_dom =", y1_dom);

      // Check for out-of-bounds
      if (y0_dom < 0 || y1_dom > H || y0_dom > H || y1_dom < 0) {
        console.warn("⚠️ WARNING: Bbox extends beyond page bounds!");
        console.warn(`   Page height: ${H}, bbox top: ${y0_dom.toFixed(2)}, bbox bottom: ${y1_dom.toFixed(2)}`);
        console.warn("   This suggests scale mismatch or backend using different page dimensions");

        // Clamp to page bounds
        y0_dom = Math.max(0, Math.min(H, y0_dom));
        y1_dom = Math.max(0, Math.min(H, y1_dom));
        console.warn(`   Clamped to: top=${y0_dom.toFixed(2)}, bottom=${y1_dom.toFixed(2)}`);
      }

      // Use full width, constrain by vertical bbox
      const pageBBox = [0, y0_dom, viewportWidth, y1_dom];
      console.log("📦 Final pageBBox for filtering: [left, top, right, bottom] =", pageBBox);

      // Debug: show some char boxes in the expected region
      console.log("🔎 Sampling char boxes around expected region:");
      const sampleBoxes = pageData.boxes.filter((_, idx) => idx % 100 === 0).slice(0, 10);
      sampleBoxes.forEach((box, idx) => {
        console.log(`  Sample ${idx}: char="${box.char}", top=${box.top.toFixed(2)}, left=${box.left.toFixed(2)}, y_raw=${box.y.toFixed(2)}`);
      });

      // Candidate chars, then merge into lines
      const candidateBoxes = pageData.boxes.filter((b) =>
        withinBBox(b, pageBBox)
      );
      console.log("🔍 Filtered candidateBoxes count:", candidateBoxes.length, "out of", pageData.boxes.length);

      if (candidateBoxes.length === 0) {
        console.log("❌ NO CANDIDATES! Checking why...");
        console.log("   Expected range: top between", y0_dom.toFixed(2), "and", y1_dom.toFixed(2));
        console.log("   Char boxes range: top from", Math.min(...pageData.boxes.map(b => b.top)).toFixed(2),
                    "to", Math.max(...pageData.boxes.map(b => b.top)).toFixed(2));
      }

      if (candidateBoxes.length > 0) {
        console.log("📍 First candidate:", candidateBoxes[0]);
        console.log("📍 Last candidate:", candidateBoxes[candidateBoxes.length - 1]);
        // Show text content of candidates
        const candidateText = candidateBoxes.map(b => b.char).join('');
        console.log("📝 Candidate text:", candidateText.substring(0, 200));
      }

      const lineBoxes = mergeBoxesIntoLines(candidateBoxes);
      console.log("📏 Merged into line boxes:", lineBoxes.length, "lines");
      if (lineBoxes.length > 0) {
        console.log("📍 First line box:", lineBoxes[0]);
        console.log("📍 Last line box:", lineBoxes[lineBoxes.length - 1]);
      }

      if (lineBoxes.length === 0) {
        console.log("❌ No line boxes created, returning null");
        return null;
      }

      // Find first/last line for horizontal clipping
      const firstLineY = Math.min(...lineBoxes.map((b) => b.lineY));
      const lastLineY = Math.max(...lineBoxes.map((b) => b.lineY));
      console.log("✂️ Will clip first line at x0 =", x0, "and last line at x1 =", x1);

      const highlights = lineBoxes
        .map((line, idx) => {
          let { left, top, width, height, lineY } = line;

          // Clip horizontally only for first line
          if (lineY === firstLineY) {
            const cutoff = Math.max(left, x0);
            width = width - (cutoff - left);
            left = cutoff;
            if (width <= 0) return null;
          }

          // Clip horizontally only for last line
          if (lineY === lastLineY) {
            const cutoff = Math.min(left + width, x1);
            width = cutoff - left;
            if (width <= 0) return null;
          }

          console.log(`✨ Rendering highlight ${idx}: left=${left.toFixed(2)}, top=${top.toFixed(2)}, width=${width.toFixed(2)}, height=${height.toFixed(2)}`);

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

      // Add debug rectangle showing the raw bbox region
      return [
        <div
          key={`debug-bbox-${docId}-${pageNum}`}
          style={{
            position: "absolute",
            left: 0,
            top: y0_dom,
            width: viewportWidth,
            height: y1_dom - y0_dom,
            border: "2px dashed red",
            backgroundColor: "rgba(255, 0, 0, 0.1)",
            pointerEvents: "none",
          }}
          title={`Debug bbox: top=${y0_dom.toFixed(2)}, height=${(y1_dom - y0_dom).toFixed(2)}`}
        />,
        ...highlights,
      ];
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
            <div className="flex-1 flex overflow-hidden ">
              {activeDocuments.length > 0 && (
                <div
                  className=" flex flex-col"
                  style={{
                    width: `calc(100% - ${sidebarWidth}px)`,
                    transition: isResizing ? "none" : "0.3s linear",
                    minWidth: "350px",
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
                      // style={{
                      //   opacity: isResizing ? 0.7 : 1,
                      //   transition: "opacity 0.1s ease",
                      // }}
                    >
                      {activeDocuments?.length > 0 ? (
                        <div className="flex justify-center">
                          <div className="space-y-4">
                            {activeDocuments.map((doc, index) => (
                              <DocumentViewer
                                key={doc.id}
                                doc={doc}
                                isVisible={index === activeTabIndex}
                                isResizing={isResizing}
                                pdfWidth={800}
                                docState={documentStates[doc.id] || {}}
                                charBoxes={charBoxes}
                                pendingAction={pendingScrollActions[doc.id]}
                                onDocumentLoadSuccess={onDocumentLoadSuccess}
                                handleGetCharBoxes={handleGetCharBoxes}
                                renderBoundingHighlights={
                                  renderBoundingHighlights
                                }
                                setPendingScrollActions={
                                  setPendingScrollActions
                                }
                                activeChunk={activeChunk}
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
              )}

              {activeDocuments?.length > 0 && (
                <div
                  className="w-1 bg-[#333234] hover:bg-[grey] cursor-col-resize transition-colors select-none"
                  onMouseDown={handleMouseDown}
                  style={{ userSelect: "none" }}
                />
              )}

              <div
                className="bg-[#1C1B1D] border-l border-[#333234] flex flex-col flex-shrink-0  "
                style={{
                  width:
                    activeDocuments?.length === 0
                      ? "100%"
                      : `${sidebarWidth}px`,
                  transition: isResizing ? "none" : "0.3s linear",
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
                              <div className="text-white border-b border-[#333234] mt-[10px] pb-[10px]  overflow-hidden">
                                <p className="text-sm leading-relaxed break-word whitespace-pre-wrap">
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
                                              {chunk.source?.length < 30
                                                ? chunk.source.replace(
                                                    ".pdf",
                                                    ""
                                                  )
                                                : chunk.source.slice(0, 27) +
                                                  "..."}
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
        </motion.div>
      </div>
    </div>
  );
});

export default PDFViewerPage;
