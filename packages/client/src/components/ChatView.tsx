import { useMemo } from "react";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { VoiceContext } from "@/context/VoiceContext";
import { useModal } from "@/hooks/useModal";
import { useQuoteReply } from "@/hooks/useQuoteReply";
import { useRoomVoices } from "@/hooks/useRoomVoices";
import { useStickToBottom } from "@/hooks/useStickToBottom";
import { toPanelAiParticipants } from "@/utils/participants";
import {
  getPrivateRoomHues,
  getRoomHues,
  roomHueStyle,
} from "@/utils/roomVoices";
import AIStatusNotice from "./AIStatusNotice";
import ChatHeader from "./ChatHeader";
import CircuitBackdrop from "./CircuitBackdrop";
import GuestNotice from "./GuestNotice";
import Icon from "./Icon";
import LoginModal from "./LoginModal";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import ParticipantsDrawer from "./ParticipantsDrawer";
import ParticipantsList from "./ParticipantsList";
import PrivateChatBanner from "./PrivateChatBanner";
import RoomAura from "./RoomAura";
import SettingsModal from "./SettingsModal";
import TypingIndicator from "./TypingIndicator";
import type { AiParticipant } from "@/config/aiParticipants";
import type { ChatViewProps } from "@/types";

// Transcript and composer share one measure so their left edges line up
const COLUMN_CLASSES = "mx-auto w-full max-w-4xl";
const ERROR_BORDER_STYLE = {
  borderColor: "color-mix(in oklab, var(--danger) 40%, transparent)",
};
const NO_PRIVATE_CHAT_AIS: AiParticipant[] = [];

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
  aiStatus = null,
  showScrollButton,
  onScrollToBottom,
  onLogout,
  onJoin,
  onUsernameChange,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onModelSelect,
  onPrivateConversationEnd,
  isPrivateChat = false,
  privateChatAis = NO_PRIVATE_CHAT_AIS,
  privateRoster = null,
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

  const activeAiCount = useMemo(
    () => toPanelAiParticipants(aiParticipantList).length,
    [aiParticipantList],
  );

  // Lookup for reply quotes - resolves a reply's quoted id to the message
  // while it is still in the loaded history
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );
  const { replyingTo, startReply, cancelReply, sendMessage } = useQuoteReply(
    messagesById,
    onSendMessage,
  );
  const canSend = connectionStatus.connected && isAuthenticated;

  const { recentSpeakers, hueFor } = useRoomVoices(messages, aiParticipantList);
  useStickToBottom(messagesContainerRef, messagesEndRef, !showScrollButton);

  // The aura and composer edge take on the colours of whoever spoke last; a
  // private chat glows in its members' voices before any of them has spoken
  const roomStyle = useMemo(() => {
    const privateHues = getPrivateRoomHues(privateChatAis, hueFor);
    return roomHueStyle(
      privateHues.length > 0
        ? privateHues
        : getRoomHues(messages, aiParticipantList, hueFor),
    );
  }, [privateChatAis, messages, aiParticipantList, hueFor]);

  return (
    <VoiceContext.Provider value={hueFor}>
      <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
        <main
          className="room-tinted relative isolate flex min-w-0 flex-1 flex-col"
          style={roomStyle}
        >
          <RoomAura />
          <CircuitBackdrop />
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
              ais={privateChatAis}
              onLeave={onPrivateConversationEnd}
              onAddModels={participantsDrawer.open}
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
            className="thin-scrollbar fade-top min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            ref={messagesContainerRef}
          >
            <div className={`${COLUMN_CLASSES} pb-6 pt-4`}>
              <MessageList
                messages={messages}
                messagesById={messagesById}
                aiParticipants={aiParticipantList}
                participants={participants}
                onReply={canSend ? startReply : undefined}
              />
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
              <TypingIndicator
                typingUsers={typingUsers}
                typingAIs={typingAIs}
                aiParticipants={aiParticipantList}
              />

              {error && (
                <div
                  className="rounded-lg border px-4 py-2.5 text-sm text-danger animate-rise-in"
                  style={ERROR_BORDER_STYLE}
                  role="alert"
                >
                  {error}
                </div>
              )}

              <AIStatusNotice
                aiStatus={aiStatus}
                isAuthenticated={isAuthenticated}
              />

              {!isAuthenticated && <GuestNotice onJoin={login.open} />}

              <MessageInput
                onSendMessage={sendMessage}
                onTypingStart={onTypingStart}
                onTypingStop={onTypingStop}
                disabled={!canSend}
                replyingTo={replyingTo}
                onCancelReply={cancelReply}
                aiParticipants={aiParticipantList}
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
          recentSpeakers={recentSpeakers}
          typingUsers={typingUsers}
          typingAIs={typingAIs}
          onAISelect={onModelSelect}
          privateRoster={privateRoster}
        />

        <ParticipantsList
          participants={participants}
          aiParticipants={aiParticipantList}
          recentSpeakers={recentSpeakers}
          typingUsers={typingUsers}
          typingAIs={typingAIs}
          isVisible={true}
          onAISelect={onModelSelect}
          privateRoster={privateRoster}
        />
      </div>
    </VoiceContext.Provider>
  );
};

export default ChatView;
