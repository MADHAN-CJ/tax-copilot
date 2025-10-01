import React, { memo, useRef, useState, useEffect, useCallback } from "react";
import { Document, Page } from "react-pdf";

const PAGE_HEIGHT = 900; // fallback estimate for canvas height (tweak if you want)
const HEADER_HEIGHT = 44;
const PAGE_MARGIN = 16;
const ITEM_FULL_HEIGHT = PAGE_HEIGHT + HEADER_HEIGHT + PAGE_MARGIN;
const CONTAINER_HEIGHT = 800; // visible viewport height inside the component
const PAGE_WIDTH = 700; // width passed to <Page /> (tweak as needed)
const BUFFER_PAGES = 2; // how many pages before/after to also render

const DocumentViewer = memo((props) => {
  const {
    doc,
    pageRefs,
    isResizing,
    pendingAction,
    onDocumentLoadSuccess,
    setPendingScrollActions,
    onRegisterScrollTo,
    // pdfWidth,
    // charBoxes,
    // handleGetCharBoxes,
    // renderBoundingHighlights,
    references,
  } = props;

  //refs
  const containerRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);
  //states
  const [numPages, setNumPages] = useState(0);
  const [range, setRange] = useState([0, 0]);

  // Safe wrapper to call parent's onDocumentLoadSuccess in multiple common forms:
  const callParentOnLoad = useCallback(
    (pdf) => {
      if (!onDocumentLoadSuccess) return;
      try {
        const maybeHandler = onDocumentLoadSuccess(doc.id);
        if (typeof maybeHandler === "function") {
          maybeHandler(pdf);
          return;
        }
      } catch (e) {
        // ignore
      }
      try {
        //onDocumentLoadSuccess(docId, pdf)
        onDocumentLoadSuccess(doc.id, pdf);
        return;
      } catch (e) {
        // ignore
      }
      try {
        //onDocumentLoadSuccess(pdf)
        onDocumentLoadSuccess(pdf);
      } catch (e) {
        // ignore
      }
    },
    [onDocumentLoadSuccess, doc.id]
  );

  const onLoadSuccessLocal = useCallback(
    (pdf) => {
      if (!pdf || !pdf.numPages) return;
      setNumPages(pdf.numPages);
      // set initial range to first few pages
      const end = Math.min(pdf.numPages - 1, BUFFER_PAGES + 2);
      setRange([0, end]);
      callParentOnLoad(pdf);
    },
    [callParentOnLoad]
  );

  // handle load error
  const onLoadErrorLocal = useCallback(
    (err) => {
      console.error("PDF load error:", err);
      if (setPendingScrollActions) {
        setPendingScrollActions((prev) => {
          const newActions = { ...prev };
          if (doc && doc.id) delete newActions[doc.id];
          return newActions;
        });
      }
    },
    [doc, setPendingScrollActions]
  );

  // onScroll compute visible range based on estimated ITEM_FULL_HEIGHT
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = null;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollTop = el.scrollTop;
        const clientH = el.clientHeight || CONTAINER_HEIGHT;
        const startIndex = Math.max(
          0,
          Math.floor(scrollTop / ITEM_FULL_HEIGHT) - BUFFER_PAGES
        );
        const endIndex = Math.min(
          Math.max(0, numPages - 1),
          Math.ceil((scrollTop + clientH) / ITEM_FULL_HEIGHT) + BUFFER_PAGES
        );
        setRange((prev) => {
          if (prev[0] === startIndex && prev[1] === endIndex) return prev;
          return [startIndex, endIndex];
        });
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // also trigger once to set initial range
    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [numPages]);

  const scrollToPage = useCallback((pageNumber) => {
    if (!containerRef.current) return;
    const top = (pageNumber - 1) * ITEM_FULL_HEIGHT;
    containerRef.current.scrollTo({ top, behavior: "smooth" });
  }, []);

  //autoscroll to 1st reference
  useEffect(() => {
    if (!references || references.length === 0) return;
    if (numPages === 0) return;
    if (hasAutoScrolledRef.current) return;
    // get the first reference (lowest page_start)
    const firstRef = references.reduce((min, r) =>
      r.page_start < min.page_start ? r : min
    );

    const targetPage = Math.floor(firstRef.page_start);

    setTimeout(() => {
      scrollToPage(targetPage);
      hasAutoScrolledRef.current = true;
    }, 200);
  }, [references, numPages, scrollToPage]);

  useEffect(() => {
    if (onRegisterScrollTo && doc?.id) {
      onRegisterScrollTo(doc.id, scrollToPage);
    }
  }, [onRegisterScrollTo, doc?.id, scrollToPage]);

  // Loading state while we don't know numPages
  if (!numPages) {
    return (
      <div
        style={{
          display: "block",
          transition: isResizing ? "none" : "transform 0.2s ease",
        }}
      >
        <Document
          file={doc.url}
          onLoadSuccess={onLoadSuccessLocal}
          onLoadError={onLoadErrorLocal}
          loading={
            <div className="flex items-center justify-center h-96 w-96">
              <div className="text-gray-500">
                Loading PDF...
                {pendingAction && (
                  <div className="text-xs mt-2">
                    Will navigate to page {pendingAction.targetPage}
                  </div>
                )}
              </div>
            </div>
          }
        >
          {/* No pages rendered until metadata arrives */}
        </Document>
      </div>
    );
  }

  // compute visible page numbers (1-based)
  const startPage = range[0] + 1;
  const endPage = range[1] + 1;

  // spacer total height
  const totalHeight = numPages * ITEM_FULL_HEIGHT;

  return (
    <div
      style={{
        display: "block",
        transition: isResizing ? "none" : "transform 0.2s ease",
      }}
    >
      <Document
        file={doc.url}
        onLoadSuccess={onLoadSuccessLocal}
        onLoadError={onLoadErrorLocal}
        loading={
          <div className="flex items-center justify-center h-96 w-96">
            <div className="text-gray-500">Loading PDF...</div>
          </div>
        }
      >
        <div
          ref={containerRef}
          style={{
            height: CONTAINER_HEIGHT,
            overflowY: "auto",
            position: "relative",
            width: PAGE_WIDTH + 32,
            borderRadius: 6,
          }}
        >
          {/* Tall spacer to create scrollbar representing full document */}
          <div style={{ height: totalHeight, position: "relative" }}>
            {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
              const pageNumber = startPage + i;
              const top = (pageNumber - 1) * ITEM_FULL_HEIGHT;
              return (
                <div
                  key={pageNumber}
                  id={`${doc.id}-page-${pageNumber}`}
                  ref={(el) => {
                    if (pageRefs && pageRefs.current) {
                      pageRefs.current[`${doc.id}-page-${pageNumber}`] = el;
                    }
                  }}
                  style={{
                    position: "absolute",
                    top,
                    left: 0,
                    right: 0,
                    height: ITEM_FULL_HEIGHT,
                    padding: 8,
                    boxSizing: "border-box",
                  }}
                  className="relative bg-white shadow-lg rounded-lg overflow-hidden mb-4"
                >
                  <div className="bg-gray-50 px-4 py-2 text-sm text-black font-medium">
                    Page {pageNumber}
                  </div>

                  <div style={{ position: "relative" }}>
                    <Page
                      pageNumber={pageNumber}
                      width={PAGE_WIDTH}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="flex items-center justify-center h-48">
                          <div className="text-gray-500">
                            Loading page {pageNumber}...
                          </div>
                        </div>
                      }
                      // onLoadSuccess={(page) =>
                      //   handleGetCharBoxes(
                      //     doc.id,
                      //     page,
                      //     pageNumber,
                      //     pdfWidth / page.getViewport({ scale: 1 }).width
                      //   )
                      // }
                    />
                    {/* <div
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
                      {renderBoundingHighlights(doc.id, pageNumber, charBoxes)}
                    </div> */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Document>
    </div>
  );
});

export default DocumentViewer;
