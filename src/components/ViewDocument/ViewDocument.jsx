import React, { memo, useMemo } from "react";
import { Document, Page } from "react-pdf";

const DocumentViewer = memo(
  ({
    doc,
    isVisible,
    isResizing,
    pdfWidth,
    docState,
    // charBoxes,
    pendingAction,
    onDocumentLoadSuccess,
    setPendingScrollActions,
    // handleGetCharBoxes,
    // renderBoundingHighlights,
  }) => {
    const pages = useMemo(() => {
      if (!docState.numPages) return null;

      return Array.from({ length: docState.numPages }, (_, pageIndex) => {
        const pageNumber = pageIndex + 1;

        return (
          <div
            key={pageNumber}
            id={`${doc.id}-page-${pageNumber}`}
            className="relative bg-white shadow-lg rounded-lg overflow-hidden mb-4"
          >
            <div className="bg-gray-50 px-4 py-2 text-sm text-black font-medium">
              Page {pageNumber}
            </div>
            <div style={{ position: "relative" }}>
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
      });
    }, [doc.id, docState.numPages, pdfWidth]);

    return (
      <div
        style={{
          display: isVisible ? "block" : "none",
          transition: isResizing ? "none" : "transform 0.2s ease",
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
                    Will navigate to page {pendingAction.targetPage}
                  </div>
                )}
              </div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-96 w-96">
              <div className="text-red-500">Error loading PDF: {doc.name}</div>
            </div>
          }
        >
          {pages}
        </Document>
      </div>
    );
  }
);

export default DocumentViewer;
