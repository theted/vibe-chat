/**
 * usePreviewState — state for the unauthenticated preview feed (messages
 * and participants shown before joining), with refs kept in sync for
 * socket-handler closures.
 */

import { useEffect, useRef, useState } from "react";
import type { Message, Participant } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

export const usePreviewState = () => {
  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [previewParticipants, setPreviewParticipants] = useState<Participant[]>([]);
  // null (not []) until the server sends a list: an empty list is a real
  // answer ("no models are loaded") and must not fall back to the bundled
  // catalogue, or the UI invents models that cannot reply.
  const [previewAiParticipants, setPreviewAiParticipants] = useState<
    AiParticipant[] | null
  >(null);

  const previewMessagesRef = useRef<Message[]>([]);
  const previewParticipantsRef = useRef<Participant[]>([]);
  const previewAiParticipantsRef = useRef<AiParticipant[] | null>(null);

  useEffect(() => { previewMessagesRef.current = previewMessages; }, [previewMessages]);
  useEffect(() => { previewParticipantsRef.current = previewParticipants; }, [previewParticipants]);
  useEffect(() => { previewAiParticipantsRef.current = previewAiParticipants; }, [previewAiParticipants]);

  return {
    previewMessages,
    setPreviewMessages,
    previewParticipants,
    setPreviewParticipants,
    previewAiParticipants,
    setPreviewAiParticipants,
    previewMessagesRef,
    previewParticipantsRef,
    previewAiParticipantsRef,
  };
};
