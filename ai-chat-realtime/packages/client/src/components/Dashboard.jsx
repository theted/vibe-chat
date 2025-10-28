/**
 * Dashboard Component - Real-time metrics display
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalAIMessages: 0,
    totalUserMessages: 0,
    totalMessages: 0,
    messagesPerMinute: 0,
    activeUsers: 0,
    activeRooms: 0,
    uptime: 0,
    timestamp: Date.now()
  });
  
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });
  const [history, setHistory] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  // Socket connection
  const { on, emit } = useSocket(SERVER_URL);

  // Setup socket listeners
  useEffect(() => {
    // Connection events
    on('connect', () => {
      setConnectionStatus({ connected: true });
      emit('join-dashboard');
      emit('get-metrics');
      emit('get-metrics-history', { duration: 60 * 60 * 1000 }); // Last hour
    });

    on('disconnect', () => {
      setConnectionStatus({ connected: false });
    });

    // Metrics events
    on('metrics-update', (data) => {
      setMetrics(data);
    });

    on('metrics-history', (data) => {
      setHistory(data);
    });

    // Join dashboard immediately if connected
    emit('join-dashboard');
    
  }, [on, emit]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus.connected) {
        emit('get-metrics');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionStatus.connected, emit]);

  // Format uptime
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Calculate percentage
  const getPercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const MetricCard = ({ title, value, subtitle, icon, color = 'blue' }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-${color}-600 text-sm font-medium uppercase tracking-wide`}>{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
          {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`text-${color}-500 text-4xl`}>{icon}</div>
      </div>
    </div>
  );

  const ProgressBar = ({ value, max, label, color = 'blue' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">{value} / {max}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`bg-gradient-to-r from-${color}-400 to-${color}-600 h-3 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              AI Chat Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Real-time metrics and analytics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              ← Back to Chat
            </Link>
            
            <div className="flex items-center gap-2 text-sm bg-white rounded-lg px-4 py-2 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span>{connectionStatus.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            <div className="text-sm text-gray-500 bg-white rounded-lg px-4 py-2 shadow-sm">
              Last updated: {formatTime(metrics.timestamp)}
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard 
            title="Total Messages" 
            value={metrics.totalMessages}
            subtitle="All time"
            icon="💬"
            color="blue"
          />
          
          <MetricCard 
            title="AI Messages" 
            value={metrics.totalAIMessages}
            subtitle={`${getPercentage(metrics.totalAIMessages, metrics.totalMessages)}% of total`}
            icon="🤖"
            color="purple"
          />
          
          <MetricCard 
            title="User Messages" 
            value={metrics.totalUserMessages}
            subtitle={`${getPercentage(metrics.totalUserMessages, metrics.totalMessages)}% of total`}
            icon="👤"
            color="green"
          />
          
          <MetricCard 
            title="Messages/Minute" 
            value={metrics.messagesPerMinute}
            subtitle="Current rate"
            icon="⚡"
            color="orange"
          />
          
          <MetricCard 
            title="Active Users" 
            value={metrics.activeUsers}
            subtitle="Currently online"
            icon="👥"
            color="teal"
          />
          
          <MetricCard 
            title="Server Uptime" 
            value={formatUptime(metrics.uptime)}
            subtitle="Since last restart"
            icon="⏱️"
            color="indigo"
          />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Message Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Message Distribution</h3>
            
            <ProgressBar 
              value={metrics.totalAIMessages} 
              max={metrics.totalMessages}
              label="AI Messages"
              color="purple"
            />
            
            <ProgressBar 
              value={metrics.totalUserMessages} 
              max={metrics.totalMessages}
              label="User Messages"
              color="green"
            />

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between mb-2">
                  <span>AI to User Ratio:</span>
                  <span className="font-medium">
                    {metrics.totalUserMessages > 0 
                      ? (metrics.totalAIMessages / metrics.totalUserMessages).toFixed(2) 
                      : '0'} : 1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Activity Level:</span>
                  <span className={`font-medium ${
                    metrics.messagesPerMinute > 10 ? 'text-red-600' :
                    metrics.messagesPerMinute > 5 ? 'text-orange-600' :
                    metrics.messagesPerMinute > 1 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {metrics.messagesPerMinute > 10 ? 'Very High' :
                     metrics.messagesPerMinute > 5 ? 'High' :
                     metrics.messagesPerMinute > 1 ? 'Moderate' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">System Status</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🌐</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">WebSocket Server</p>
                    <p className="text-sm text-gray-600">Real-time connection</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">🤖</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">AI Services</p>
                    <p className="text-sm text-gray-600">Multiple providers active</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-lg">📊</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Metrics Collection</p>
                    <p className="text-sm text-gray-600">Real-time tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Collecting</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Dashboard updates automatically every 2-5 seconds</p>
          <p className="mt-1">Server running for {formatUptime(metrics.uptime)}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;