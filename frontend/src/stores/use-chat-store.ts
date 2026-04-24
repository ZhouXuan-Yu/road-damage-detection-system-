import { create } from "zustand";
import { ChatMessage } from "@/types/agent";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setSessionId: (id: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: "",
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  setSessionId: (sessionId) => set({ sessionId }),
  reset: () => set({ messages: [], isLoading: false }),
}));
