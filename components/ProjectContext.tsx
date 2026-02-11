"use client";

import type { ChatStatus, UIMessage } from "ai";

import { createContext, use } from "react";

export interface ProjectState {
  messages: UIMessage[];
  status: ChatStatus;
  selectedUserId: string | null;
}

export interface ProjectActions {
  submitSnapshot: (version: number, dataUrl: string) => Promise<void>;
  cancelPending: () => void;
  clearHistory: () => void;
  setSelectedUserId: (id: string | null) => void;
}

export interface ProjectMeta {
  storageKey: string;
}

export interface ProjectContextValue {
  state: ProjectState;
  actions: ProjectActions;
  meta: ProjectMeta;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProjectContext = () => {
  const context = use(ProjectContext);
  if (!context) {
    throw new Error("Project components must be used within <Project>");
  }
  return context;
};
