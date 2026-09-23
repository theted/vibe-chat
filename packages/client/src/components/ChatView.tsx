import { useMemo } from "react";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { useModal } from "@/hooks/useModal";
import { isContinuation } from "@/utils/messageGrouping";
import { toPanelAiParticipants } from "@/utils/participants";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import GuestNotice from "./GuestNotice";
import Icon from "./Icon";
import LoginModal from "./LoginModal";
import MessageInput from "./MessageInput";
import ParticipantsDrawer from "./ParticipantsDrawer";
import ParticipantsList from "./ParticipantsList";
import PrivateChatBanner from "./PrivateChatBanner";
import SettingsModal from "./SettingsModal";
import TypingIndicator from "./TypingIndicator";
import type { ChatViewProps } from "@/types";

// Transcript and composer share one measure so their left edges line up
const COLUMN_CLASSES = "mx-auto w-full max-w-4xl";
const ERROR_BORDER_STYLE = {
  borderColor: "color-mix(in oklab, var(--danger) 40%, transparent)",
};

const ChatView = ({
  theme,
  toggleTheme,
  connectionStatus,
  roomInfo,
  username,
  isAuthenticated,
  participants,
  aiParticipants = null,
  messages,
  typingUsers,
  typingAIs,
  showScrollButton,
  onScrollToBottom,
  onLogout,
  onJoin,
  onUsernameChange,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onPrivateConversationStart,
  onPrivateConversationEnd,
  isPrivateChat = false,
  privateChatAi = null,
  error,
  messagesEndRef,
  messagesContainerRef,
}: ChatViewProps) => {
  // Bundled catalogue only as a placeholder before the server answers; once it
  // has, an empty list is shown as empty rather than papered over.
  const aiParticipantList = aiParticipants ?? DEFAULT_AI_PARTICIPANTS;
  const menu = useModal();
  const login = useModal();
  const participantsDrawer = useModal();

  // Lookup for reply-quote rendering - resolves a reply's trigger id to the
  // quoted message while it is still in the loaded history
  const activeAiCount = useMemo(
    () => toPanelAiParticipants(aiParticipantList).length,
    [aiParticipantList],
  );

  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
      <main className="relative flex min-w-0 flex-1 flex-col">
        <ChatHeader
          topic={roomInfo?.topic}
          isConnected={connectionStatus.connected}
          isAuthenticated={isAuthenticated}
          onLoginOpen={login.open}
          onSettingsOpen={menu.open}
          onParticipantsOpen={participantsDrawer.open}
          participantCount={participants.length + activeAiCount}
        />

        {isPrivateChat && onPrivateConversationEnd && (
          <PrivateChatBanner
            ai={privateChatAi}
            onLeave={onPrivateConversationEnd}
          />
        )}

        <SettingsModal
          isOpen={menu.isOpen}
          isVisible={menu.isVisible}
          onClose={menu.close}
          onLoginOpen={login.open}
          theme={theme}
          toggleTheme={toggleTheme}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
        />

        <LoginModal
          isOpen={login.isOpen}
          isVisible={login.isVisible}
          onClose={login.close}
          username={username}
          onUsernameChange={onUsernameChange}
          onJoin={onJoin}
          connectionStatus={connectionStatus}
        />

        <div
          className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          ref={messagesContainerRef}
        >
          <div className={`${COLUMN_CLASSES} pb-6 pt-2`}>
            {messages.length === 0 && (
              <p className="px-6 pt-16 text-center text-sm text-muted">
                Nothing said yet. Say hello, or type @ to bring a model in.
              </p>
            )}
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                aiParticipants={aiParticipantList}
                participants={participants}
                isContinuation={isContinuation(messages[index - 1], message)}
                quotedMessage={
                  message.mentionsTriggerMessageId
                    ? messagesById.get(message.mentionsTriggerMessageId)
                    : undefined
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="relative shrink-0 px-3 pb-3 sm:px-6 sm:pb-5">
          {showScrollButton && (
            <button
              type="button"
              className="absolute -top-12 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-raised text-muted shadow-lg shadow-black/20 transition-colors hover:text-fg animate-fade-in"
              onClick={onScrollToBottom}
              aria-label="Jump to latest message"
            >
              <Icon name="arrow-down" className="h-4 w-4" />
            </button>
          )}

          <div className={`${COLUMN_CLASSES} space-y-2`}>
            <TypingIndicator typingUsers={typingUsers} typingAIs={typingAIs} />

            {error && (
              <div
                className="rounded-lg border px-4 py-2.5 text-sm text-danger animate-rise-in"
                style={ERROR_BORDER_STYLE}
                role="alert"
              >
                {error}
              </div>
            )}

            {!isAuthenticated && <GuestNotice onJoin={login.open} />}

            <MessageInput
              onSendMessage={onSendMessage}
              onTypingStart={onTypingStart}
              onTypingStop={onTypingStop}
              disabled={!connectionStatus.connected || !isAuthenticated}
            />
          </div>
        </footer>
      </main>

      <ParticipantsDrawer
        isOpen={participantsDrawer.isOpen}
        isVisible={participantsDrawer.isVisible}
        onClose={participantsDrawer.close}
        participants={participants}
        aiParticipants={aiParticipantList}
        typingUsers={typingUsers}
        typingAIs={typingAIs}
        onAISelect={onPrivateConversationStart}
        activePrivateAiId={privateChatAi?.id ?? null}
      />

      <ParticipantsList
        participants={participants}
        aiParticipants={aiParticipantList}
        typingUsers={typingUsers}
        typingAIs={typingAIs}
        isVisible={true}
        onAISelect={onPrivateConversationStart}
        activePrivateAiId={privateChatAi?.id ?? null}
      />
    </div>
  );
};

export default ChatView;
