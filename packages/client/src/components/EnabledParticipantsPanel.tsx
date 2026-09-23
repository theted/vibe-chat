/**
 * EnabledParticipantsPanel Component - Grid of currently enabled AI participants
 */

import { DASHBOARD_STYLES } from "@/config/dashboard";
import { voiceStyleFor } from "@/utils/voice";
import type { AiParticipant } from "@/config/aiParticipants";

interface EnabledParticipantsPanelProps {
  aiParticipants: AiParticipant[];
}

const EnabledParticipantsPanel = ({
  aiParticipants,
}: EnabledParticipantsPanelProps) => {
  const activeAiParticipants = aiParticipants
    .filter((participant) => participant.status === "active")
    .sort((first, second) =>
      (first.name || "").localeCompare(second.name || ""),
    );

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className={DASHBOARD_STYLES.sectionTitle}>Enabled models</h2>
        <span className="text-sm tabular-nums text-faint">
          {activeAiParticipants.length} enabled
        </span>
      </div>

      {activeAiParticipants.length === 0 ? (
        <p className={`${DASHBOARD_STYLES.panel} px-5 py-4 text-sm text-muted`}>
          No models are enabled. Check the server’s API keys.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {activeAiParticipants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center gap-3 bg-surface px-4 py-3"
              style={voiceStyleFor(participant.provider)}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-voice-soft text-lg"
                aria-hidden="true"
              >
                {participant.emoji || "🤖"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">
                  {participant.name}
                </p>
                <p className="truncate text-xs text-faint">
                  <span>@{participant.alias}</span>
                  <span className="text-voice">
                    {" "}
                    {participant.provider || "Unknown"}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default EnabledParticipantsPanel;
