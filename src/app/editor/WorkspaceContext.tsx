'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

import type { ReactNode } from 'react';
import type { DraftData, ResearchItem, FactSheet, GeneratorId, GeneratorSettings, StepLog } from '@/types';

type GenericInputMode = 'idea' | 'article';

type PersistedState = {
  draft: DraftData;
  savedResearch: ResearchItem[];
  factSheet: FactSheet;
  selectedGeneratorId: GeneratorId;
  generatorSettings: Record<GeneratorId, GeneratorSettings>;
  articleSources: string[];
  sourceColumnBody: string;
  columnIdea: string;
  genericInputMode: GenericInputMode;
}

type WorkspaceContextType = {
  draft: DraftData;
  setDraft: (draft: DraftData) => void;
  savedResearch: ResearchItem[];
  addResearchItem: (item: ResearchItem) => void;
  removeResearchItem: (index: number) => void;
  factSheet: FactSheet;
  updateFactSheet: (updates: Partial<FactSheet>) => void;
  selectedGeneratorId: GeneratorId;
  setSelectedGeneratorId: (id: GeneratorId) => void;
  generatorSettings: Record<GeneratorId, GeneratorSettings>;
  updateGeneratorSettings: (id: GeneratorId, settings: GeneratorSettings) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  pipelineSteps: StepLog[];
  setPipelineSteps: (steps: StepLog[]) => void;
  articleSources: string[];
  setArticleSources: (sources: string[]) => void;
  sourceColumnBody: string;
  setSourceColumnBody: (body: string) => void;
  columnIdea: string;
  setColumnIdea: (idea: string) => void;
  genericInputMode: GenericInputMode;
  setGenericInputMode: (mode: GenericInputMode) => void;
  resetAll: () => void;
}

const STORAGE_KEY = 'column-editorial-hub-workspace';

const DEFAULT_DRAFT: DraftData = { title: '', body: '' };
const DEFAULT_FACTSHEET: FactSheet = { keyFacts: [], timeline: [], quotes: [] };

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DraftData>(DEFAULT_DRAFT);
  const [savedResearch, setSavedResearch] = useState<ResearchItem[]>([]);
  const [factSheet, setFactSheet] = useState<FactSheet>(DEFAULT_FACTSHEET);
  const [selectedGeneratorId, setSelectedGeneratorId] = useState<GeneratorId>('generic');
  const [generatorSettings, setGeneratorSettings] = useState<Record<GeneratorId, GeneratorSettings>>(
    {} as Record<GeneratorId, GeneratorSettings>
  );
  const [articleSources, setArticleSources] = useState<string[]>([]);
  const [sourceColumnBody, setSourceColumnBody] = useState<string>('');
  const [columnIdea, setColumnIdea] = useState<string>('');
  const [genericInputMode, setGenericInputMode] = useState<GenericInputMode>('idea');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<StepLog[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      setDraft(persisted.draft ?? DEFAULT_DRAFT);
      setSavedResearch(persisted.savedResearch ?? []);
      setFactSheet(persisted.factSheet ?? DEFAULT_FACTSHEET);
      setSelectedGeneratorId(persisted.selectedGeneratorId ?? 'generic');
      setGeneratorSettings(persisted.generatorSettings ?? ({} as Record<GeneratorId, GeneratorSettings>));
      setArticleSources(persisted.articleSources ?? []);
      setSourceColumnBody(persisted.sourceColumnBody ?? '');
      setColumnIdea(persisted.columnIdea ?? '');
      setGenericInputMode(persisted.genericInputMode ?? 'idea');
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage (only after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state: PersistedState = {
        draft,
        savedResearch,
        factSheet,
        selectedGeneratorId,
        generatorSettings,
        articleSources,
        sourceColumnBody,
        columnIdea,
        genericInputMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, draft, savedResearch, factSheet, selectedGeneratorId, generatorSettings, articleSources, sourceColumnBody, columnIdea, genericInputMode]);

  const addResearchItem = useCallback((item: ResearchItem) => {
    setSavedResearch(prev => {
      if (prev.some(r => r.link === item.link)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeResearchItem = useCallback((index: number) => {
    setSavedResearch(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateFactSheet = useCallback((updates: Partial<FactSheet>) => {
    setFactSheet(prev => ({ ...prev, ...updates }));
  }, []);

  const updateGeneratorSettings = useCallback((id: GeneratorId, settings: GeneratorSettings) => {
    setGeneratorSettings(prev => ({ ...prev, [id]: settings }));
  }, []);

  const resetAll = useCallback(() => {
    setDraft(DEFAULT_DRAFT);
    setSavedResearch([]);
    setFactSheet(DEFAULT_FACTSHEET);
    setSelectedGeneratorId('generic');
    setGeneratorSettings({} as Record<GeneratorId, GeneratorSettings>);
    setArticleSources([]);
    setSourceColumnBody('');
    setColumnIdea('');
    setGenericInputMode('idea');
    setPipelineSteps([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      draft,
      setDraft,
      savedResearch,
      addResearchItem,
      removeResearchItem,
      factSheet,
      updateFactSheet,
      selectedGeneratorId,
      setSelectedGeneratorId,
      generatorSettings,
      updateGeneratorSettings,
      isGenerating,
      setIsGenerating,
      pipelineSteps,
      setPipelineSteps,
      articleSources,
      setArticleSources,
      sourceColumnBody,
      setSourceColumnBody,
      columnIdea,
      setColumnIdea,
      genericInputMode,
      setGenericInputMode,
      resetAll,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
