import { ChatProvider } from "../ChatContext";
import { DocumentsProvider } from "../DocumentsContext";
import { UIProvider } from "../UIContext";
import { SocketProvider } from "../SocketContext";

export const AppProviders = ({ children }) => (
  <SocketProvider>
    <DocumentsProvider>
      <ChatProvider>
        <UIProvider>{children}</UIProvider>
      </ChatProvider>
    </DocumentsProvider>
  </SocketProvider>
);
