/**
 * useSocket Hook - React hook for Socket.IO integration
 */

import { useEffect, useCallback, useRef } from 'react';
import socketService from '../services/SocketService';

export const useSocket = (serverUrl) => {
  const listenersRef = useRef(new Map());

  useEffect(() => {
    console.log('🔌 useSocket: Connecting to', serverUrl);
    // Connect to server
    socketService.connect(serverUrl);

    // Cleanup on unmount
    return () => {
      console.log('🔌 useSocket: Cleaning up listeners');
      // Remove all listeners added by this hook instance
      for (const [event, callback] of listenersRef.current) {
        socketService.off(event, callback);
      }
      listenersRef.current.clear();
    };
  }, [serverUrl]);

  const on = useCallback((event, callback) => {
    console.log('🔌 useSocket: Adding listener for', event);
    // Remove existing listener for this event if any
    const existingCallback = listenersRef.current.get(event);
    if (existingCallback) {
      socketService.off(event, existingCallback);
    }

    // Add new listener
    socketService.on(event, callback);
    listenersRef.current.set(event, callback);
  }, []);

  const emit = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  const joinRoom = useCallback((username, roomId) => {
    socketService.joinRoom(username, roomId);
  }, []);

  const sendMessage = useCallback((content) => {
    socketService.sendMessage(content);
  }, []);

  const changeTopic = useCallback((topic) => {
    socketService.changeTopic(topic);
  }, []);

  const getRoomInfo = useCallback(() => {
    socketService.getRoomInfo();
  }, []);

  const getAIStatus = useCallback(() => {
    socketService.getAIStatus();
  }, []);

  const adminWakeAIs = useCallback(() => {
    socketService.adminWakeAIs();
  }, []);

  const adminSleepAIs = useCallback(() => {
    socketService.adminSleepAIs();
  }, []);

  const triggerAI = useCallback((aiNames, message, context) => {
    socketService.triggerAI(aiNames, message, context);
  }, []);

  const startTyping = useCallback(() => {
    socketService.startTyping();
  }, []);

  const stopTyping = useCallback(() => {
    socketService.stopTyping();
  }, []);

  return {
    on,
    emit,
    joinRoom,
    sendMessage,
    changeTopic,
    getRoomInfo,
    getAIStatus,
    adminWakeAIs,
    adminSleepAIs,
    triggerAI,
    startTyping,
    stopTyping,
    isConnected: socketService.isConnected(),
    socketId: socketService.getSocketId()
  };
};