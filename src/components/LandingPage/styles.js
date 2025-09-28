import styled from "styled-components";

export const StylesLandingPageWrapper = styled.div`
  background-color: #151415;
  height: calc(100vh - 60px);
  color: white;
  display: flex;
  margin: 20px;
`;

export const StylesLandingPageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  background: #1c1b1d;
  padding: 0 20px;

  //text
  color: #fff;
  font-family: "SF Pro";
  font-style: normal;

  .logo-text {
    color: #827f88;
    text-align: right;
    font-family: "DM Sans";
    font-size: 16px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    letter-spacing: -0.32px;
  }

  .header-right {
    color: #827f88;
    text-align: right;
    font-family: "DM Sans";
    font-size: 16px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    letter-spacing: -0.32px;
  }
`;

export const StylesLandingPageBodyWrapper = styled.div`
  border-radius: 10px;
  display: flex;
  flex: 1;
  overflow: hidden;
  background-color: #1c1b1d;
  border-top-left-radius: ${({ $isSidebarOpen }) =>
    $isSidebarOpen ? "0px" : "10px"};

  .section {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .section.left-part {
    padding: 10px 20px;

    .left-part-header {
      height: 30px;
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 30px;

      .left-part-header-left {
        width: 119px;
        height: 30px;
        flex-shrink: 0;
        border-radius: 5px;
        background: #151415;
      }

      .left-part-header-right {
        width: 311px;
        height: 30px;
        flex-shrink: 0;
        border-radius: 5px;
        background: #151415;
      }
    }
    .left-part-body {
      flex: 1;
      border-radius: 10px 10px 0 0;
      background: #151415;
      box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 47px;

      .left-part-body-bottom {
        max-width: 344px;

        h1 {
          color: #fff;
          text-align: center;
          font-family: "DM Sans";
          font-size: 31px;
          font-style: normal;
          font-weight: 700;
          line-height: normal;
          letter-spacing: -0.62px;
          margin-bottom: 8px;
        }

        p {
          color: #fff;
          text-align: center;
          font-family: "DM Sans";
          font-size: 14px;
          font-style: normal;
          font-weight: 400;
          line-height: 18px; /* 128.571% */
          letter-spacing: -0.28px;
        }
      }
    }
  }

  .section.right-part {
    border-left: 2px solid #333234;
    display: flex;
    padding-top: 200px;
    flex-direction: column;
    position: relative;

    p {
      color: #fff;
      text-align: center;
      font-family: "DM Sans";
      font-size: 36px;
      font-style: normal;
      font-weight: 600;
      line-height: 46px;
      letter-spacing: -0.72px;
      z-index: 0;
    }

    .search-container-wrapper {
      position: absolute;
      bottom: 20px;
      right: 20px;
      left: 20px;
      z-index: 99;

      .right-part-bottom-section {
        .bottom-card-section {
          display: flex;
          gap: 20px;
          padding: 20px 0;
          overflow-x: auto;

          .right-part-card {
            color: #fff;
            font-family: "DM Sans";
            font-size: 14px;
            font-style: normal;
            font-weight: 400;
            line-height: 18px;
            letter-spacing: -0.28px;
            min-width: 130px;
            cursor: pointer;
            border-radius: 10px;
            border: 1px solid #333234;
            padding: 10px;
          }
        }

        .search-container {
          position: relative;
          height: 100px;
          border-radius: 10px;
          border: 1px solid #333234;
          padding: 15px 0px 0px 15px;
          /* margin: 0 40px; */
          margin-bottom: 20px;

          textarea {
            all: unset;
            height: 100%;
            width: 100%;
            color: white;
            &::placeholder {
              color: #827f88;
              font-family: "DM Sans";
              font-size: 16px;
              font-style: normal;
              font-weight: 500;
              line-height: 26px;
              letter-spacing: -0.32px;
            }
          }

          .button-text {
            position: absolute;
            display: flex;
            align-items: center;
            gap: 11px;
            right: 10px;
            bottom: 10px;

            .gpt-name {
              color: #827f88;
              font-family: "DM Sans";
              font-size: 14px;
              font-style: normal;
              font-weight: 600;
              line-height: 26px;
              letter-spacing: -0.28px;
            }

            .submit-button {
              width: 32px;
              height: 32px;
              border-radius: 5px;
              background: #8e2bfe;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
          }
        }
      }
    }
  }
`;

export const StylesSearchContainerWrapper = styled.div`
  position: absolute;
  bottom: 0;
  z-index: 99;
  right: 20px;
  left: 20px;
  background-color: #1c1b1d;

  .right-part-bottom-section {
    .search-container {
      position: relative;
      height: 100px;
      border-radius: 10px;
      border: 1px solid #333234;
      padding: 15px 0px 0px 15px;

      textarea {
        all: unset;
        height: 100%;
        width: 100%;
        color: white;
        &::placeholder {
          color: #827f88;
          font-family: "DM Sans";
          font-size: 16px;
          font-style: normal;
          font-weight: 500;
          line-height: 26px;
          letter-spacing: -0.32px;
        }
      }

      .button-text {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 11px;
        right: 10px;
        bottom: 10px;

        .gpt-name {
          color: #827f88;
          font-family: "DM Sans";
          font-size: 14px;
          font-style: normal;
          font-weight: 600;
          line-height: 26px;
          letter-spacing: -0.28px;
        }

        .submit-button {
          width: 32px;
          height: 32px;
          border-radius: 5px;
          background: #8e2bfe;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      }
    }
  }
`;

//search input in search bar
export const StylesSearchInput = styled.div`
  color: #fff;
  font-family: "DM Sans";
  font-size: 14px;
  font-weight: 500;
  line-height: 26px;
  letter-spacing: -0.28px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  padding-right: 0;

  border-bottom: 1px solid #333234;
  border-top: 1px solid #333234;

  input {
    all: unset !important;
  }
`;

export const StylesTokenUsage = styled.div`
  padding: 20px;

  .token-header {
    color: #fff;
    font-family: "DM Sans";
    font-size: 12px;

    font-weight: 500;
    line-height: normal;
    letter-spacing: 0.72px;
  }

  .progress-bar {
    margin-top: 5px;
    margin-bottom: 8px;
    background-color: #fff;
    border-radius: 8px;
    height: 8px;
    width: 100%;
    overflow: hidden;
  }

  .progress-fill {
    background-color: #8e2bfe;
    height: 100%;
    transition: width 0.4s ease;
  }
  .token-numbers {
    display: flex;
    justify-content: space-between;
    color: #fff;
    font-family: "DM Sans";
    font-size: 14px;
    font-weight: 700;
    line-height: normal;
    letter-spacing: -0.28px;
    margin-bottom: 10px;
  }

  .token-text {
    display: flex;
    justify-content: space-between;
    color: #827f88;
    font-family: "DM Sans";
    font-size: 14px;
    font-weight: 500;
    line-height: normal;
    letter-spacing: -0.28px;
  }
`;

export const StylesNewChatButton = styled.button`
  all: unset;
  display: flex;
  width: 180px;
  padding: 7px 5px;
  justify-content: center;
  align-items: center;
  gap: 6px;
  border-radius: 5px;
  background: #8e2bfe;
  margin-left: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  text-align: center;
  color: #fff;
`;

export const StylesHistoryWrapper = styled.div`
  padding-left: 20px;
  border-top: 1px solid #333234;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 340px);

  .history-list {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
    padding-right: 10px;

    //scroll bar styles
    &::-webkit-scrollbar {
      width: 8px;
      background: #151415;
      border-radius: 30px;
    }
    &::-webkit-scrollbar-thumb {
      background: #1c1b1d;
      border-radius: 30px;
      border: 1px solid #151415;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 30px;
    }

    & > * {
      margin-bottom: 16px;
    }
  }
  .history-header {
    color: #fff;
    font-family: "DM Sans";
    font-size: 12px;
    font-weight: 500;
    line-height: normal;
    letter-spacing: 0.72px;
    padding: 10px 0 20px 0px;
  }

  .query-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fff;
    font-family: "DM Sans";
    font-size: 14px;
    font-weight: 500;
    line-height: 26px;
    letter-spacing: -0.28px;

    display: block;
    width: 100%;
    padding: 5px;
    border-radius: 6px;

    &:hover {
      background-color: #333234;
    }
  }
`;
