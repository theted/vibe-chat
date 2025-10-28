/**
 * ParticipantsList Component - Shows connected users and AI participants
 */

import React from 'react';

const ParticipantsList = ({ participants = [], aiParticipants = [], isVisible = true }) => {
  if (!isVisible) return null;

  // Default AI participants based on the available providers
  const defaultAIParticipants = [
    { name: 'Claude', provider: 'Anthropic', status: 'active', emoji: '🤖' },
    { name: 'GPT-4', provider: 'OpenAI', status: 'active', emoji: '🧠' },
    { name: 'Grok', provider: 'xAI', status: 'active', emoji: '🦾' },
    { name: 'Gemini', provider: 'Google', status: 'active', emoji: '💎' },
    { name: 'Command R', provider: 'Cohere', status: 'active', emoji: '🔮' },
    { name: 'Mistral', provider: 'Mistral AI', status: 'active', emoji: '🌟' }
  ];

  const aiList = aiParticipants.length > 0 ? aiParticipants : defaultAIParticipants;

  return (
    <div className="participants-list">
      <div className="participants-header">
        <h3>Participants ({participants.length + aiList.length})</h3>
      </div>

      <div className="participants-content">
        {/* Users */}
        {participants.length > 0 && (
          <div className="participants-section">
            <h4>Users ({participants.length})</h4>
            <div className="participants-items">
              {participants.map((participant, index) => (
                <div key={`user-${index}`} className="participant-item user">
                  <span className="participant-icon">👤</span>
                  <span className="participant-name">{participant.username}</span>
                  <span className="participant-status online">online</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Participants */}
        <div className="participants-section">
          <h4>AI Assistants ({aiList.length})</h4>
          <div className="participants-items">
            {aiList.map((ai, index) => (
              <div key={`ai-${index}`} className="participant-item ai">
                <span className="participant-icon">{ai.emoji}</span>
                <div className="participant-info">
                  <span className="participant-name">{ai.name}</span>
                  <span className="participant-provider">{ai.provider}</span>
                </div>
                <span className={`participant-status ${ai.status}`}>
                  {ai.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;