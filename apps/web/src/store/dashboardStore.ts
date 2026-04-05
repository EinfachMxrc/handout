/**
 * Dashboard UI store – local/ephemeral UI state ONLY.
 * Authoritative session data lives in Convex.
 */
import { create } from "zustand";

interface DashboardState {
  // Selection
  selectedHandoutId: string | null;
  selectedSessionId: string | null;
  selectedBlockId: string | null;

  // Modal states
  isCreateHandoutOpen: boolean;
  isCreateBlockOpen: boolean;
  isEditBlockOpen: boolean;
  isQRCodeOpen: boolean;
  isDeleteConfirmOpen: boolean;
  deleteTarget: { type: "handout" | "block" | "session"; id: string } | null;

  // Editor draft (temporary, not yet saved)
  blockEditorDraft: {
    title: string;
    content: string;
    revealSlide: number;
    revealToSlide?: number;
    relockOnBack: boolean;
    alwaysVisible: boolean;
    manuallyTriggered: boolean;
  } | null;

  // UI mode
  activeTab: "handouts" | "sessions";
  jumpToSlideInput: string;

  // Actions
  setSelectedHandout: (id: string | null) => void;
  setSelectedSession: (id: string | null) => void;
  setSelectedBlock: (id: string | null) => void;
  openCreateHandout: () => void;
  closeCreateHandout: () => void;
  openCreateBlock: () => void;
  closeCreateBlock: () => void;
  openEditBlock: (blockId: string) => void;
  closeEditBlock: () => void;
  openQRCode: () => void;
  closeQRCode: () => void;
  openDeleteConfirm: (target: DashboardState["deleteTarget"]) => void;
  closeDeleteConfirm: () => void;
  setBlockEditorDraft: (draft: DashboardState["blockEditorDraft"]) => void;
  setActiveTab: (tab: DashboardState["activeTab"]) => void;
  setJumpToSlideInput: (val: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedHandoutId: null,
  selectedSessionId: null,
  selectedBlockId: null,
  isCreateHandoutOpen: false,
  isCreateBlockOpen: false,
  isEditBlockOpen: false,
  isQRCodeOpen: false,
  isDeleteConfirmOpen: false,
  deleteTarget: null,
  blockEditorDraft: null,
  activeTab: "handouts",
  jumpToSlideInput: "",

  setSelectedHandout: (id) => set({ selectedHandoutId: id }),
  setSelectedSession: (id) => set({ selectedSessionId: id }),
  setSelectedBlock: (id) => set({ selectedBlockId: id }),
  openCreateHandout: () => set({ isCreateHandoutOpen: true }),
  closeCreateHandout: () => set({ isCreateHandoutOpen: false }),
  openCreateBlock: () => set({ isCreateBlockOpen: true }),
  closeCreateBlock: () => set({ isCreateBlockOpen: false }),
  openEditBlock: (blockId) => set({ isEditBlockOpen: true, selectedBlockId: blockId }),
  closeEditBlock: () => set({ isEditBlockOpen: false }),
  openQRCode: () => set({ isQRCodeOpen: true }),
  closeQRCode: () => set({ isQRCodeOpen: false }),
  openDeleteConfirm: (target) => set({ isDeleteConfirmOpen: true, deleteTarget: target }),
  closeDeleteConfirm: () => set({ isDeleteConfirmOpen: false, deleteTarget: null }),
  setBlockEditorDraft: (draft) => set({ blockEditorDraft: draft }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setJumpToSlideInput: (val) => set({ jumpToSlideInput: val }),
}));
