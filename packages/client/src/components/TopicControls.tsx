/**
 * TopicControls Component - Controls for changing chat topic
 */

import { useState, type FormEvent } from "react";
import Icon from "./Icon";
import type { TopicControlsProps } from "@/types";

const TopicControls = ({
  currentTopic,
  onTopicChange,
  disabled = false,
}: TopicControlsProps) => {
  const [newTopic, setNewTopic] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newTopic.trim() && !disabled) {
      onTopicChange(newTopic.trim());
      setNewTopic("");
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder-slate-400 bg-white/90 backdrop-blur-sm text-sm dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-purple-400 dark:focus:ring-purple-400/30"
        value={newTopic}
        onChange={(e) => setNewTopic(e.target.value)}
        placeholder={`Current topic: ${currentTopic}`}
        disabled={disabled}
        maxLength={100}
      />
      <button
        type="submit"
        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white px-4 py-2 rounded-xl font-medium disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 text-sm shadow-md hover:shadow-lg flex items-center gap-1 dark:from-purple-500 dark:to-purple-700 dark:hover:from-purple-600 dark:hover:to-purple-800 dark:disabled:from-slate-700 dark:disabled:to-slate-800"
        onClick={handleSubmit}
        disabled={disabled || !newTopic.trim()}
      >
        <Icon name="tag" className="w-4 h-4" />
        <span className="hidden sm:inline">Topic</span>
      </button>
    </div>
  );
};

export default TopicControls;
