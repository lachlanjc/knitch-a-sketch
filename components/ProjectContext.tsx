"use client";

import type { Spec } from "@json-render/core";

import { createContext, use } from "react";

export interface SketchEntry {
  id: string;
  imageUrl: string;
  spec: Spec | null;
  status: "pending" | "ready" | "error";
  createdAt: number;
}

export interface ProjectState {
  entries: SketchEntry[];
  selectedEntryId: string | null;
}

export interface ProjectActions {
  submitSnapshot: (version: number, dataUrl: string) => Promise<void>;
  cancelPending: () => void;
  clearHistory: () => void;
  setSelectedEntryId: (id: string | null) => void;
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
