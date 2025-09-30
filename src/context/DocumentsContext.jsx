import { createContext, useContext, useState, useCallback } from "react";

const DocsContext = createContext();

export const DocumentsProvider = ({ children }) => {
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const extractUniqueSourcesFromResponse = useCallback((apiResponse) => {
    if (!apiResponse?.chunks || !Array.isArray(apiResponse.chunks)) return [];
    const uniqueSources = new Set();
    apiResponse.chunks.forEach((chunk) => {
      if (chunk.source) uniqueSources.add(chunk.source);
    });
    return Array.from(uniqueSources).map((source) => ({
      name: source,
      url: `https://api.bookshelf.diy/finance/gpt/api/v1/static/docs/${source}`,
      id: source.replace(/[^a-zA-Z0-9]/g, "_"),
    }));
  }, []);

  return (
    <DocsContext.Provider
      value={{
        activeDocuments,
        setActiveDocuments,
        activeTabIndex,
        setActiveTabIndex,
        extractUniqueSourcesFromResponse,
      }}
    >
      {children}
    </DocsContext.Provider>
  );
};

export const useDocsContext = () => useContext(DocsContext);
