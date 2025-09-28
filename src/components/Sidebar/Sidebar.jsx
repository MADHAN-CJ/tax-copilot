import React, { useEffect, useMemo, useState } from "react";
//styles
import {
  StylesHistoryWrapper,
  StylesNewChatButton,
  StylesSearchInput,
  StylesTokenUsage,
} from "../LandingPage/styles";
//utils
import { onClickBounceEffect } from "../../utils/utils";
//context
import { useSocketContext } from "../../context/WebSocketContext";
//images
import SearchIcon from "../../assets/images/search-icon.svg";
import NewChatButton from "../../assets/images/new-chat-button.svg";
import { useLocation, useNavigate } from "react-router";

//total token count
const totalTokenCount = "100000";

const SidebarComponent = () => {
  //context
  const { setActiveDocuments, tokenUsage, isSidebarOpen, setMessages } =
    useSocketContext();
  const navigate = useNavigate();
  const location = useLocation();
  //states
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  //get the searched thread
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

  // debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue.toLowerCase());
    }, 300); // 300ms delay

    return () => clearTimeout(handler);
  }, [searchValue]);

  const usedTokens = tokenUsage?.data?.userData?.tokensUsed || 0;
  const progress = Math.min((usedTokens / totalTokenCount) * 100, 100);
  return (
    <>
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
              onClickBounceEffect(event, 150, () => {
                setMessages([]);
                setActiveDocuments([]);
                navigate("/");
              })
            }
          >
            <img src={NewChatButton} alt="chat" /> New Chat
          </StylesNewChatButton>

          <StylesHistoryWrapper>
            <h1 className="history-header">HISTORY</h1>
            <ul className="history-list">
              {filteredThreads?.length > 0 ? (
                filteredThreads?.map((query, uniqueQuery) => {
                  const isActive = location.pathname === `/c/${query?.id}`;
                  return (
                    <li
                      className={`hover:text-gray-300 cursor-pointer query-name ${
                        isActive ? "bg-[#2a292b] text-white rounded-md" : ""
                      }`}
                      key={uniqueQuery}
                      onClick={() => {
                        setMessages([]);
                        setActiveDocuments([]);
                        navigate(`/c/${query?.id}`);
                      }}
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
    </>
  );
};

export default SidebarComponent;
