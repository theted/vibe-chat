/**
 * ParticipantsList Component - Shows connected users and AI participants
 */

import React from "react";
import { motion } from "framer-motion";
import { DEFAULT_AI_PARTICIPANTS } from "../config/aiParticipants.ts";

import Icon from "./Icon.jsx";

import AnimatedListItem from "./AnimatedListItem.jsx";
import SectionHeader from "./SectionHeader.jsx";

const ParticipantsList = ({
  participants = [],
  aiParticipants = [],
  typingUsers = [],
  typingAIs = [],
  isVisible = true,
}) => {
  if (!isVisible) return null;

  const normalize = (value) =>
    value
      ? value
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";

  const baseAIList =
    aiParticipants.length > 0 ? aiParticipants : DEFAULT_AI_PARTICIPANTS;
  const aiList = baseAIList.map((ai) => {
    const alias = ai.alias || ai.name || ai.displayName;
    return {
      ...ai,
      displayName: ai.displayName || ai.name,
      alias,
      normalizedAlias: normalize(ai.normalizedAlias || alias),
      status: ai.status || "active",
    };
  });

  const aiProviders = aiList.reduce((groups, ai) => {
    const provider = ai.provider || "Other";
    if (!groups.has(provider)) {
      groups.set(provider, []);
    }
    groups.get(provider).push(ai);
    return groups;
  }, new Map());

  const sortedProviders = Array.from(aiProviders.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  const getModelSortKey = (ai) =>
    (ai.displayName || ai.name || "").toLowerCase();

  const isUserTyping = (username) => {
    const normalizedUsername = username?.toLowerCase();
    return typingUsers.some((user) => {
      if (user.isLocal) return false;
      return user.normalized === normalizedUsername || user.name === username;
    });
  };

  const isAITyping = (aiEntry) => {
    const normalizedTarget = normalize(
      aiEntry.alias || aiEntry.name || aiEntry.displayName
    );
    return typingAIs.some((ai) => {
      if (ai.id && aiEntry.id && ai.id === aiEntry.id) return true;
      if (
        ai.normalizedAlias &&
        normalizedTarget &&
        ai.normalizedAlias === normalizedTarget
      )
        return true;
      if (
        ai.alias &&
        normalizedTarget &&
        normalize(ai.alias) === normalizedTarget
      )
        return true;
      return false;
    });
  };

  return (
    <div className="w-80 bg-gradient-to-b from-slate-50/50 to-white/70 backdrop-blur-sm border-l border-transparent flex flex-col rounded-tr-3xl rounded-br-3xl lg:flex hidden dark:from-slate-950/40 dark:to-slate-950/20 dark:border-slate-800/60">
      <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-4 rounded-tr-3xl border-b border-white/10 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center dark:bg-slate-900/60">
            <Icon name="participants" className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white/95">
            Participants ({participants.length + aiList.length})
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Users */}
        {participants.length > 0 && (
          <div className="border-b border-slate-100 dark:border-slate-800/60">
            <SectionHeader icon="users" title="Users" count={participants.length} />
            <div className="pb-2">
              {participants.map((participant, index) => {
                const typing = isUserTyping(participant.username);
                return (
                  <AnimatedListItem
                    key={`user-${index}`}
                    index={index}
                    className="hover:bg-blue-50 dark:hover:bg-slate-800/60"
                  >
                    <div
                      className={`w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                        typing ? "animate-pulse" : ""
                      }`}
                    >
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 flex-1 dark:text-slate-200">
                      {participant.username}
                    </span>
                    {typing ? (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 dark:bg-yellow-500/20 dark:text-yellow-200">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce dark:bg-yellow-300"></div>
                        typing...
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium dark:bg-green-500/20 dark:text-green-200">
                        online
                      </span>
                    )}
                  </AnimatedListItem>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Participants */}
        <div>
          <SectionHeader icon="monitor" title="AI Assistants" count={aiList.length} />
          <div className="pb-2">
            {(() => {
              let aiIndex = 0;
              return sortedProviders.map((provider) => {
                const providerParticipants = [...aiProviders.get(provider)].sort(
                  (a, b) => getModelSortKey(a).localeCompare(getModelSortKey(b))
                );

                return (
                  <div key={provider} className="pb-2 last:pb-0">
                    <div
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/70 dark:text-slate-300 dark:bg-slate-900/60"
                      data-testid={`ai-provider-${provider}`}
                    >
                      {provider} ({providerParticipants.length})
                    </div>
                    {providerParticipants.map((ai) => {
                      const generating = isAITyping(ai);
                      const itemIndex = aiIndex;
                      aiIndex += 1;
                      return (
                        <AnimatedListItem
                          key={`ai-${provider}-${ai.id || ai.alias || aiIndex}`}
                          index={itemIndex}
                          className="hover:bg-purple-50 dark:hover:bg-slate-800/60"
                        >
                          <div
                            className={`text-2xl ${generating ? "animate-pulse" : ""}`}
                          >
                            {ai.emoji || "🤖"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-medium text-slate-700 truncate dark:text-slate-200"
                              data-testid={`ai-name-${ai.id || ai.alias || aiIndex}`}
                            >
                              {ai.displayName || ai.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate dark:text-slate-400">
                              {ai.provider}
                            </div>
                          </div>
                          {generating ? (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 dark:bg-purple-500/20 dark:text-purple-200">
                              <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce dark:bg-purple-300"></div>
                              typing...
                            </span>
                          ) : (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                ai.status === "active"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200"
                              }`}
                            >
                              {ai.status}
                            </span>
                          )}
                        </AnimatedListItem>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
