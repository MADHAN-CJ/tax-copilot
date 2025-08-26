import styled from "styled-components";

export const StylesLandingPageWrapper = styled.div`
  background-color: #151415;
  height: calc(100vh - 60px);
  color: white;
  display: flex;
  flex-direction: column;
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
