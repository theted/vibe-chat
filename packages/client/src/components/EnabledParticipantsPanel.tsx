/**
 * EnabledParticipantsPanel Component - Grid of currently enabled AI participants
 */

import { DASHBOARD_STYLES } from "@/config/dashboard";
import type { AiParticipant } from "@/config/aiParticipants";

interface EnabledParticipantsPanelProps {
  aiParticipants: AiParticipant[];
}

const EnabledParticipantsPanel = ({ aiParticipants }: EnabledParticipantsPanelProps) => {
  const activeAiParticipants = aiParticipants
    .filter((participant) => participant.status === "active")
    .sort((first, second) => (first.name || "").localeCompare(second.name || ""));

  return (
    <div className={`${DASHBOARD_STYLES.card} mb-8`}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          Enabled AI Participants
        </h3>
        <span className="text-sm text-gray-500">
          {activeAiParticipants.length} enabled
        </span>
      </div>

      {activeAiParticipants.length === 0 ? (
        <p className="text-sm text-gray-500">
          No active AI participants are currently enabled.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAiParticipants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <span className="text-2xl" aria-hidden="true">
                {participant.emoji || "🤖"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{participant.name}</p>
                <p className="text-xs text-gray-500">@{participant.alias}</p>
                <p className="text-xs text-gray-400 mt-1">Provider: {participant.provider || "Unknown"}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-green-600">Active</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EnabledParticipantsPanel;
