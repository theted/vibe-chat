/**
 * Main App Component - Real-time AI Chat Application
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import ChatMessage from './components/ChatMessage';
import MessageInput from './components/MessageInput';
import TopicControls from './components/TopicControls';
import ParticipantsList from './components/ParticipantsList';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function App() {
  // State
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });

  // Debug connection status changes
  useEffect(() => {
    console.log('🔌 Connection status changed:', connectionStatus);
  }, [connectionStatus]);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const loadStoredMessages = () => {
      try {
        const stored = localStorage.getItem('ai-chat-messages');
        if (stored) {
          const parsedMessages = JSON.parse(stored);
          if (Array.isArray(parsedMessages)) {
            setMessages(parsedMessages);
          }
        }
      } catch (error) {
        console.warn('Failed to load messages from localStorage:', error);
      }
    };
    
    loadStoredMessages();
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    const saveMessagesToStorage = (messagesToSave) => {
      try {
        // Limit to last 100 messages
        const limitedMessages = messagesToSave.slice(-100);
        localStorage.setItem('ai-chat-messages', JSON.stringify(limitedMessages));
      } catch (error) {
        console.warn('Failed to save messages to localStorage:', error);
      }
    };

    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);
  const [roomInfo, setRoomInfo] = useState({ topic: 'General discussion' });
  const [aiStatus, setAiStatus] = useState({ status: 'active' });
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Socket connection
  const {
    on,
    joinRoom,
    sendMessage,
    changeTopic,
    getRoomInfo,
    getAIStatus,
    adminWakeAIs,
    adminSleepAIs
  } = useSocket(SERVER_URL);

  // Setup socket event listeners
  useEffect(() => {
    // Connection events
    on('connection-status', (status) => {
      console.log('🔌 Connection status update:', status);
      setConnectionStatus(status);
      if (!status.connected) {
        setIsJoined(false);
      }
    });

    on('connection-established', (data) => {
      console.log('Connection established:', data);
    });

    // Room events
    on('room-joined', (data) => {
      setIsJoined(true);
      setRoomInfo(data);
      setParticipants(data.participants || []);
      setError(null);
      console.log('Joined room:', data);
    });

    on('user-joined', (data) => {
      const systemMessage = {
        id: `user-joined-${Date.now()}`,
        sender: 'System',
        content: `${data.username} joined the chat`,
        senderType: 'system',
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    on('user-left', (data) => {
      const systemMessage = {
        id: `user-left-${Date.now()}`,
        sender: 'System',
        content: `${data.username} left the chat`,
        senderType: 'system',
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    // Message events
    on('new-message', (message) => {
      setMessages(prev => [...prev, {
        ...message,
        id: message.id || `msg-${Date.now()}-${Math.random()}`
      }]);
    });

    // Topic events
    on('topic-changed', (data) => {
      setRoomInfo(prev => ({ ...prev, topic: data.newTopic }));
      const systemMessage = {
        id: `topic-changed-${Date.now()}`,
        sender: 'System',
        content: `Topic changed to: "${data.newTopic}" by ${data.changedBy}`,
        senderType: 'system',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    // AI status events
    on('ai-status-changed', (data) => {
      setAiStatus(data);
    });

    on('ais-sleeping', (data) => {
      setAiStatus({ status: 'sleeping', reason: data.reason });
    });

    on('ais-awakened', () => {
      setAiStatus({ status: 'active' });
    });

    // Error events
    on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    // Room info events
    on('room-info', (data) => {
      setRoomInfo(data.room);
      setParticipants(data.participants || []);
    });

  }, [on]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Handlers
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (username.trim()) {
      joinRoom(username.trim(), 'default');
    }
  };

  const handleSendMessage = (content) => {
    sendMessage(content);
  };

  const handleTopicChange = (newTopic) => {
    changeTopic(newTopic);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAdminWakeAIs = () => {
    adminWakeAIs();
  };

  const handleAdminSleepAIs = () => {
    adminSleepAIs();
  };

  // Render username form if not joined
  if (!isJoined) {
    return (
      <div className="chat-app">
        <div className="chat-main">
          <div className="chat-container">
            <div className="chat-header">
              <div>
                <h1>AI Chat Realtime</h1>
                <div className="chat-info">Enter your username to join the conversation</div>
              </div>
              <div className="connection-status">
                <div className={`status-dot ${connectionStatus.connected ? 'connected' : ''}`}></div>
                {connectionStatus.connected ? 'Connected' : 'Connecting...'}
              </div>
            </div>
            
            <div className="chat-messages">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                gap: '2rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <h2>Welcome to AI Chat Realtime! 🤖</h2>
                  <p>Join the conversation with AI personalities from different providers.</p>
                  <p>Each AI has its own unique personality and communication style.</p>
                </div>
                
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <form onSubmit={handleJoinRoom} className="username-form">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    maxLength={50}
                    pattern="[a-zA-Z0-9_-]+"
                    title="Username can only contain letters, numbers, dash, and underscore"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={!connectionStatus.connected || !username.trim()}
                  >
                    Join Chat
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show participants list even on login screen */}
        <ParticipantsList
          participants={[]}
          aiParticipants={[]}
          isVisible={true}
        />
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="chat-app">
      <div className="chat-main">
        <div className="chat-container">
          {/* Header */}
          <div className="chat-header">
            <div>
              <h1>AI Chat Realtime</h1>
              <div className="chat-info">
                Topic: {roomInfo.topic} • {username}
              </div>
            </div>
            <div>
              <div className="connection-status">
                <div className={`status-dot ${connectionStatus.connected ? 'connected' : ''}`}></div>
                {connectionStatus.connected ? 'Connected' : 'Reconnecting...'}
              </div>
              <div className="participants-count">
                {participants.length} user{participants.length !== 1 ? 's' : ''} + 6 AIs
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" ref={messagesContainerRef}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button className="scroll-to-bottom" onClick={scrollToBottom}>
              ↓
            </button>
          )}

          {/* Input area */}
          <div className="chat-input-area">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* AI Status */}
            <div className={`ai-status ${aiStatus.status}`}>
              AI Status: {aiStatus.status === 'sleeping' ? 
                `😴 Sleeping (${aiStatus.reason || 'unknown reason'})` : 
                '🤖 Active and ready to chat'
              }
              {aiStatus.status === 'sleeping' && (
                <button 
                  onClick={handleAdminWakeAIs}
                  style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.8rem' }}
                >
                  Wake AIs
                </button>
              )}
              {aiStatus.status === 'active' && (
                <button 
                  onClick={handleAdminSleepAIs}
                  style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.8rem' }}
                >
                  Sleep AIs
                </button>
              )}
            </div>

            {/* Topic Controls */}
            <TopicControls
              currentTopic={roomInfo.topic}
              onTopicChange={handleTopicChange}
              disabled={!connectionStatus.connected}
            />

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!connectionStatus.connected}
            />
          </div>
        </div>
      </div>
      
      {/* Participants List */}
      <ParticipantsList
        participants={participants}
        aiParticipants={[]} // Will be populated with actual AI status data later
        isVisible={true}
      />
    </div>
  );
}

export default App;