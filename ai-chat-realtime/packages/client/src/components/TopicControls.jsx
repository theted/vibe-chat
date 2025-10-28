/**
 * TopicControls Component - Controls for changing chat topic
 */

import React, { useState } from 'react';

const TopicControls = ({ currentTopic, onTopicChange, disabled = false }) => {
  const [newTopic, setNewTopic] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTopic.trim() && !disabled) {
      onTopicChange(newTopic.trim());
      setNewTopic('');
    }
  };

  return (
    <div className="topic-controls">
      <input
        type="text"
        className="topic-input"
        value={newTopic}
        onChange={(e) => setNewTopic(e.target.value)}
        placeholder={`Current topic: ${currentTopic}`}
        disabled={disabled}
        maxLength={100}
      />
      <button
        type="submit"
        className="topic-button"
        onClick={handleSubmit}
        disabled={disabled || !newTopic.trim()}
      >
        Change Topic
      </button>
    </div>
  );
};

export default TopicControls;