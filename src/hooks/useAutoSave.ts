import { useEffect, useCallback } from 'react';
import type { TranscriptMessage } from '@/types/intake';

const STORAGE_KEY = 'intake-wizard-autosave';

interface AutoSaveState {
  currentCategory: string;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  enrichedAnswers: Record<string, string>;
  transcript: TranscriptMessage[];
  pendingFollowUp: string | null;
  savedAt: string;
}

export function useAutoSave() {
  const saveState = useCallback((state: Omit<AutoSaveState, 'savedAt'>) => {
    try {
      const saveData: AutoSaveState = {
        ...state,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      console.log('Auto-saved interview progress');
    } catch (error) {
      console.error('Failed to auto-save:', error);
    }
  }, []);

  const loadState = useCallback((): AutoSaveState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      
      const state = JSON.parse(saved) as AutoSaveState;
      
      // Check if save is less than 24 hours old
      const savedAt = new Date(state.savedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        console.log('Auto-save expired, clearing');
        clearState();
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to load auto-save:', error);
      return null;
    }
  }, []);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared auto-save');
    } catch (error) {
      console.error('Failed to clear auto-save:', error);
    }
  }, []);

  const hasSavedState = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      
      const state = JSON.parse(saved) as AutoSaveState;
      const savedAt = new Date(state.savedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
      
      return hoursDiff <= 24 && Object.keys(state.answers).length > 0;
    } catch {
      return false;
    }
  }, []);

  return {
    saveState,
    loadState,
    clearState,
    hasSavedState,
  };
}
