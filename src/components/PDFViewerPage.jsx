import { ChevronDown, Star, ChevronUp, FileText, Send, ExternalLink } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Document, Page, pdfjs } from 'react-pdf'

// Configure PDF.js worker - simple local approach
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

export default function PDFViewerPage() {
  const [sidebarWidth, setSidebarWidth] = useState(384) // 24rem = 384px
  const [isResizing, setIsResizing] = useState(false)

  // PDF state
  const [activeDocuments, setActiveDocuments] = useState([])
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [pdfWidth, setPdfWidth] = useState(800)
  const [documentStates, setDocumentStates] = useState({}) // Store state for each document
  const [pendingScrollActions, setPendingScrollActions] = useState({})

  // Chat state
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Get unique sources from API response chunks
  const extractUniqueSourcesFromResponse = (apiResponse) => {
    if (!apiResponse.chunks || !Array.isArray(apiResponse.chunks)) return []
    
    const uniqueSources = new Set()
    apiResponse.chunks.forEach(chunk => {
      if (chunk.source) {
        uniqueSources.add(chunk.source)
      }
    })
    
    return Array.from(uniqueSources).map(source => ({
      name: source,
      url: `https://api.bookshelf.diy/finance/gpt/api/v1/static/docs/${source}`,
      id: source.replace(/[^a-zA-Z0-9]/g, '_')
    }))
  }

  // Get current active document
  const getCurrentDocument = () => {
    if (activeDocuments.length === 0) return null
    return activeDocuments[activeTabIndex] || null
  }

  // API function to query the document
  const queryDocument = async (query) => {
    try {
      const response = await fetch('https://api.bookshelf.diy/finance/gpt/api/v1/weaviate/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error('Failed to query document')
      }

      return await response.json()
    } catch (error) {
      console.error('Error querying document:', error)
      throw error
    }
  }

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = { type: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const apiResponse = await queryDocument(inputMessage)

      // Extract unique sources and update active documents
      const newSources = extractUniqueSourcesFromResponse(apiResponse)
      if (newSources.length > 0) {
        setActiveDocuments(prevDocs => {
          const existingUrls = new Set(prevDocs.map(doc => doc.url))
          const uniqueNewSources = newSources.filter(source => !existingUrls.has(source.url))
          const updatedDocs = [...prevDocs, ...uniqueNewSources]
          
          // If this is the first document, set it as active
          if (prevDocs.length === 0 && updatedDocs.length > 0) {
            setActiveTabIndex(0)
          }
          
          return updatedDocs
        })
      }

      const aiMessage = {
        type: 'ai',
        content: apiResponse.generated_answer,
        chunks: apiResponse.chunks || []
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage = {
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        chunks: []
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle reference button click
  const handleReferenceClick = (chunk) => {
    const targetPage = Math.floor(chunk.page_start)
    // Find the document that contains this chunk
    const targetDocIndex = activeDocuments.findIndex(doc => doc.name === chunk.source)
    
    if (targetDocIndex !== -1) {
      const targetDoc = activeDocuments[targetDocIndex]
      
      // If switching to a different tab
      if (targetDocIndex !== activeTabIndex) {
        // Check if target document is already loaded
        const docState = documentStates[targetDoc.id]
        if (docState && docState.isLoaded) {
          // Document is loaded, switch tab and scroll immediately
          setActiveTabIndex(targetDocIndex)
          setTimeout(() => {
            scrollToPageForDocument(targetDoc.id, targetPage)
          }, 100)
        } else {
          // Document not loaded yet, set pending action
          setPendingScrollActions(prev => ({
            ...prev,
            [targetDoc.id]: { targetPage }
          }))
          setActiveTabIndex(targetDocIndex)
        }
      } else {
        // Same tab, just scroll
        scrollToPageForDocument(targetDoc.id, targetPage)
      }
    } else {
      // Fallback to current document
      scrollToPage(targetPage)
    }
  }

  // PDF handlers for each document - memoized to prevent re-renders
  const onDocumentLoadSuccess = useCallback((docId) => ({ numPages }) => {
    // Update document state with numPages
    setDocumentStates(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        numPages,
        isLoaded: true
      }
    }))
    
    // Check if there's a pending scroll action for this document
    const pendingAction = pendingScrollActions[docId]
    if (pendingAction) {
      setTimeout(() => {
        scrollToPageForDocument(docId, pendingAction.targetPage)
        setPendingScrollActions(prev => {
          const newActions = { ...prev }
          delete newActions[docId]
          return newActions
        })
      }, 300)
    }
  }, [pendingScrollActions])

  const scrollToPageForDocument = useCallback((docId, page) => {
    const docState = documentStates[docId]
    if (!docState || !docState.numPages) return
    
    const targetPage = Math.max(1, Math.min(docState.numPages, page))
    const pageElement = document.getElementById(`${docId}-page-${targetPage}`)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Update document state
      setDocumentStates(prev => ({
        ...prev,
        [docId]: {
          ...prev[docId],
          currentPageInView: targetPage,
          pageNumber: targetPage
        }
      }))
    }
  }, [documentStates])

  const scrollToPage = (page) => {
    const currentDoc = getCurrentDocument()
    if (currentDoc) {
      scrollToPageForDocument(currentDoc.id, page)
    }
  }

  const goToPage = (page) => {
    scrollToPage(page)
  }

  // Get current document state
  const getCurrentDocumentState = () => {
    const currentDoc = getCurrentDocument()
    if (!currentDoc) return { currentPageInView: 1, pageNumber: 1, numPages: null }
    return documentStates[currentDoc.id] || { currentPageInView: 1, pageNumber: 1, numPages: null }
  }

  useEffect(() => {
    let rafId

    const handleMouseMove = (e) => {
      if (!isResizing) return
      
      if (rafId) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX
        const clampedWidth = Math.max(300, Math.min(600, newWidth))
        setSidebarWidth(clampedWidth)
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove, { passive: true })
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [isResizing])

  // Update PDF width with debouncing to prevent constant re-rendering during resize
  useEffect(() => {
    let timeoutId
    
    const updatePdfWidth = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const availableWidth = window.innerWidth - sidebarWidth - 100
        const newWidth = Math.min(availableWidth * 0.9, 900)
        
        // Only update if there's a significant difference to prevent micro-updates
        if (Math.abs(newWidth - pdfWidth) > 10) {
          setPdfWidth(newWidth)
        }
      }, 100) // Wait 100ms after resize stops
    }
    
    updatePdfWidth()
    
    // Also listen to window resize
    window.addEventListener('resize', updatePdfWidth)
    
    return () => {
      window.removeEventListener('resize', updatePdfWidth)
      clearTimeout(timeoutId)
    }
  }, [sidebarWidth, pdfWidth])

  // Track which page is currently in view for active document
  useEffect(() => {
    const currentDoc = getCurrentDocument()
    if (!currentDoc) return
    
    const docState = documentStates[currentDoc.id]
    if (!docState || !docState.numPages || !docState.isLoaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idParts = entry.target.id.split('-')
            const docId = idParts.slice(0, -2).join('-') // Everything except last 2 parts
            const pageNum = parseInt(idParts[idParts.length - 1]) // Last part is page number
            
            if (docId === currentDoc.id) {
              setDocumentStates(prev => ({
                ...prev,
                [docId]: {
                  ...prev[docId],
                  currentPageInView: pageNum,
                  pageNumber: pageNum
                }
              }))
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    // Observe all page elements for the current document
    for (let i = 1; i <= docState.numPages; i++) {
      const pageElement = document.getElementById(`${currentDoc.id}-page-${i}`)
      if (pageElement) {
        observer.observe(pageElement)
      }
    }

    return () => observer.disconnect()
  }, [activeTabIndex, documentStates])

  const handleMouseDown = () => {
    setIsResizing(true)
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Star className="w-5 h-5 text-purple-600 fill-purple-600" />
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-base font-medium text-gray-900">
              {getCurrentDocument() ? getCurrentDocument().name : 'Finance Genie'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Show full-width chat when no documents, split view when documents available */}
        {activeDocuments.length === 0 ? (
          <div className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
            <div className="flex-1 p-8 overflow-auto">
              <div className="max-w-2xl mx-auto">
                {messages.length === 0 && (
                  <div className="text-center mb-12">
                    <div className="mb-8">
                      <h1 className="text-5xl font-bold text-gray-900 mb-4">
                        Talk to your Finance Genie
                      </h1>
                      <p className="text-lg text-gray-600 mb-6">
                        Ask questions about financial documents and get instant insights
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <div 
                        className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => setInputMessage('What was Amazon\'s revenue growth in 2024?')}
                      >
                        <h3 className="font-medium text-gray-900 mb-1">Revenue Analysis</h3>
                        <p className="text-sm text-gray-600">Ask about company revenues, growth rates, and financial performance</p>
                      </div>
                      <div 
                        className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => setInputMessage('Compare Apple\'s margins across different product categories')}
                      >
                        <h3 className="font-medium text-gray-900 mb-1">Profitability Insights</h3>
                        <p className="text-sm text-gray-600">Explore margins, profitability, and cost structures</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className="space-y-4">
                      {message.type === 'user' ? (
                        <div className="flex justify-end">
                          <div className="bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-gray-900">
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <p className="text-sm leading-relaxed">{message.content}</p>

                            {message.chunks && message.chunks.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">References</h4>
                                <div className="flex flex-wrap gap-2">
                                  {message.chunks.map((chunk, chunkIndex) => (
                                    <Button
                                      key={chunkIndex}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                      onClick={() => handleReferenceClick(chunk)}
                                      title={`${chunk.source} - Page ${Math.floor(chunk.page_start)}`}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      {chunk.source.replace('.pdf', '')} p.{Math.floor(chunk.page_start)}
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

                  {isLoading && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        <span className="text-sm text-gray-600">Analyzing documents...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat input at bottom */}
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="max-w-2xl mx-auto">
                <div className="flex gap-3">
                  <Input
                    placeholder="Ask me anything about finance..."
                    className="flex-1 h-12 border-purple-200 focus:border-purple-500 focus:ring-purple-500 text-base"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleSendMessage()
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 h-12"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white flex flex-col" style={{ width: `calc(100% - ${sidebarWidth}px)`, transition: 'none' }}>
              {/* Document Tabs */}
              <div className="border-b border-gray-200 px-6 py-2 bg-white flex-shrink-0">
                <div className="flex space-x-1 overflow-x-auto">
                  {activeDocuments.map((doc, index) => (
                    <button
                      key={doc.id}
                      onClick={() => setActiveTabIndex(index)}
                      className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors ${
                        index === activeTabIndex
                          ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {doc.name.replace('.pdf', '')}
                      {activeDocuments.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const docToClose = activeDocuments[index]

                            // Remove document state when closing
                            setDocumentStates(prev => {
                              const newStates = { ...prev }
                              delete newStates[docToClose.id]
                              return newStates
                            })

                            const newDocs = activeDocuments.filter((_, i) => i !== index)
                            setActiveDocuments(newDocs)

                            if (activeTabIndex >= newDocs.length) {
                              setActiveTabIndex(Math.max(0, newDocs.length - 1))
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
              
              <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-6 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ChevronUp
                    className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => goToPage(getCurrentDocumentState().currentPageInView - 1)}
                  />
                  <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">{getCurrentDocumentState().currentPageInView}</span>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm text-gray-600">{getCurrentDocumentState().numPages || '...'}</span>
                  <ChevronDown
                    className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => goToPage(getCurrentDocumentState().currentPageInView + 1)}
                  />
                </div>
              </div>

              <div 
                className="flex-1 bg-gray-100 overflow-auto p-4 pdf-container"
                style={{
                  opacity: isResizing ? 0.7 : 1,
                  transition: 'opacity 0.1s ease'
                }}
              >
                <div className="flex justify-center">
                  <div className="space-y-4">
                    {activeDocuments.map((doc, index) => {
                      const docState = documentStates[doc.id] || {}
                      const isVisible = index === activeTabIndex
                      const pendingAction = pendingScrollActions[doc.id]

                      return (
                        <div
                          key={`pdf-${doc.id}`}
                          style={{
                            display: isVisible ? 'block' : 'none',
                            transition: isResizing ? 'none' : 'transform 0.2s ease'
                          }}
                        >
                          <Document
                            file={doc.url}
                            onLoadSuccess={onDocumentLoadSuccess(doc.id)}
                            onLoadError={(error) => {
                              console.error('PDF load error:', error)
                              setPendingScrollActions(prev => {
                                const newActions = { ...prev }
                                delete newActions[doc.id]
                                return newActions
                              })
                            }}
                            loading={
                              <div className="flex items-center justify-center h-96 w-96">
                                <div className="text-gray-500">
                                  Loading PDF...
                                  {pendingAction && (
                                    <div className="text-xs mt-2">Will navigate to page {pendingAction.targetPage}</div>
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
                            {docState.numPages && Array.from({ length: docState.numPages }, (_, pageIndex) => {
                              const pageNumber = pageIndex + 1
                              return (
                                <div
                                  key={pageNumber}
                                  id={`${doc.id}-page-${pageNumber}`}
                                  className="bg-white shadow-lg rounded-lg overflow-hidden mb-4"
                                >
                                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 font-medium">
                                    Page {pageNumber}
                                  </div>
                                  <Page
                                    pageNumber={pageNumber}
                                    width={pdfWidth}
                                    loading={
                                      <div className="flex items-center justify-center h-96">
                                        <div className="text-gray-500">Loading page {pageNumber}...</div>
                                      </div>
                                    }
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                  />
                                </div>
                              )
                            })}
                          </Document>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="w-1 bg-gray-300 hover:bg-purple-400 cursor-col-resize transition-colors select-none"
              onMouseDown={handleMouseDown}
              style={{ userSelect: 'none' }}
            />

            <div
              className="bg-purple-50 border-l border-purple-200 flex flex-col flex-shrink-0"
              style={{ width: `${sidebarWidth}px`, transition: 'none' }}
            >
              <div className="flex-1 p-6 overflow-auto">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className="space-y-4">
                      {message.type === 'user' ? (
                        <div className="flex justify-end">
                          <div className="bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-gray-900">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm leading-relaxed">{message.content}</p>

                            {message.chunks && message.chunks.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">References</h4>
                                <div className="flex flex-wrap gap-2">
                                  {message.chunks.map((chunk, chunkIndex) => (
                                    <Button
                                      key={chunkIndex}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                      onClick={() => handleReferenceClick(chunk)}
                                      title={`${chunk.source} - Page ${Math.floor(chunk.page_start)}`}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      {chunk.source.replace('.pdf', '')} p.{Math.floor(chunk.page_start)}
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

                  {isLoading && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        <span className="text-sm text-gray-600">Analyzing documents...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat input at bottom of sidebar */}
              <div className="p-4 border-t border-purple-200 bg-white">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about the documents..."
                    className="flex-1 border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleSendMessage()
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}