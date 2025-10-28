#!/usr/bin/env node

/**
 * Debug WebSocket Connection - Test connection outside React
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

console.log('🧪 Testing WebSocket connection to:', SERVER_URL);
console.log('');

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
});

socket.on('connect', () => {
  console.log('✅ Connected successfully!');
  console.log('   Socket ID:', socket.id);
  console.log('   Connected:', socket.connected);
  
  // Test joining a room
  console.log('');
  console.log('🧪 Testing room join...');
  socket.emit('join-room', { username: 'TestUser', roomId: 'default' });
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔌 Connection error:', error.message);
  console.error('Error type:', error.type);
  console.error('Full error:', error);
});

socket.on('room-joined', (data) => {
  console.log('✅ Room joined successfully!');
  console.log('   Room data:', data);
  
  // Test sending a message
  console.log('');
  console.log('🧪 Testing message send...');
  socket.emit('user-message', { content: 'Hello from debug script!' });
});

socket.on('new-message', (message) => {
  console.log('📨 Received message:', message);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Test connection establishment
socket.on('connection-established', (data) => {
  console.log('🔗 Connection established event:', data);
});

// Auto-disconnect after 10 seconds
setTimeout(() => {
  console.log('');
  console.log('🔚 Test completed. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);

console.log('⏳ Connecting... (will auto-disconnect in 10 seconds)');