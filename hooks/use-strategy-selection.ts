/**
 * Strategy Selection Hook
 * Hook especializado para gestión inteligente de estrategias de procesamiento
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useAppState, useAppActions } from './use-app-state';
import { 
  AVAILABLE_STRATEGIES,
  analyzeFile,
  selectOptimalStrategy,
  generateStrategyConfig,
  getAvailableStrategies,
  getPersonalizedRecommendations,
  isStrategyCompatible
} from '@/lib/strategy-selector';
import type { ProcessingStrategy, ProcessingStrategyType, FileAnalysis } from '@/types/processing';

export interface StrategyRecommendation {
  primary: ProcessingStrategy;
  alternatives: ProcessingStrategy[];
  reasoning: string;
  confidence: number; // 0-1
  pros: string[];
  cons: string[];
  estimatedTime: number;
  estimatedCost: number;
}

export interface StrategyComparison {
  strategy: ProcessingStrategy;
  compatible: boolean;
  estimatedTime: number;
  fragmentSize: number;
  fragmentCount: number;
  pros: string[];
  cons: string[];
  costLevel: 'free' | 'low' | 'medium' | 'high';
  requiresAuth: boolean;
}

export interface StrategySelectionHookReturn {
  // Available strategies
  allStrategies: ProcessingStrategy[];
  availableStrategies: ProcessingStrategy[];
  compatibleStrategies: ProcessingStrategy[];
  
  // Current selection
  selectedStrategy: ProcessingStrategy | null;
  recommendedStrategy: ProcessingStrategy | null;
  
  // Analysis
  recommendations: StrategyRecommendation | null;
  comparisons: StrategyComparison[];
  
  // Actions
  selectStrategy: (strategy: ProcessingStrategyType) => void;
  selectRecommended: () => void;
  autoSelectOptimal: () => void;
  refreshAnalysis: () => Promise<void>;
  
  // Utilities
  isStrategyAvailable: (strategy: ProcessingStrategyType) => boolean;
  getStrategyDetails: (strategy: ProcessingStrategyType) => ProcessingStrategy | null;
  compareStrategies: (strategies: ProcessingStrategyType[]) => StrategyComparison[];
}

/**
 * Hook para gestión inteligente de estrategias
 */
export function useStrategySelection(): StrategySelectionHookReturn {
  const { state } = useAppState();
  const actions = useAppActions();

  // Estrategias disponibles basadas en capacidades del sistema
  const allStrategies = useMemo(() => Object.values(AVAILABLE_STRATEGIES), []);

  const availableStrategies = useMemo(() => {
    return allStrategies.filter(strategy => {
      switch (strategy.type) {
        case 'CLIENT_SIDE':
          return true; // Siempre disponible
        case 'CLIENT_DRIVE':
          return state.isGoogleAuthenticated;
        case 'SERVER_PREMIUM':
          return false; // Por implementar
        default:
          return false;
      }
    });
  }, [allStrategies, state.isGoogleAuthenticated]);

  const compatibleStrategies = useMemo(() => {
    if (!state.currentFile) return availableStrategies;
    
    return availableStrategies.filter(strategy => 
      isStrategyCompatible(strategy.type, state.currentFile!.size)
    );
  }, [availableStrategies, state.currentFile]);

  // Estrategia recomendada basada en análisis
  const recommendedStrategy = useMemo(() => {
    if (!state.fileAnalysis) return null;
    
    const recommendedType = state.fileAnalysis.recommendedStrategy;
    return AVAILABLE_STRATEGIES[recommendedType] || null;
  }, [state.fileAnalysis]);

  // Generar recomendaciones personalizadas
  const recommendations = useMemo((): StrategyRecommendation | null => {
    if (!state.fileAnalysis || !state.currentFile) return null;

    try {
      const baseRecommendations = getPersonalizedRecommendations(state.fileAnalysis);
      const primary = baseRecommendations.primary;
      
      // Calcular confianza basada en qué tan cerca está el archivo de los límites
      const fileSize = state.currentFile.size;
      const maxSize = primary.maxSize;
      const confidence = Math.max(0.3, 1 - (fileSize / maxSize));
      
      // Generar pros y cons específicos
      const pros = [...primary.features];
      const cons: string[] = [];
      
      if (primary.type === 'CLIENT_SIDE') {
        if (fileSize > 50 * 1024 * 1024) { // > 50MB
          cons.push('May be slow for very large files');
        }
        if (!state.isGoogleAuthenticated) {
          pros.push('No account registration required');
        }
      } else if (primary.type === 'CLIENT_DRIVE') {
        if (!state.isGoogleAuthenticated) {
          cons.push('Requires Google account');
        }
        pros.push('Automatic cloud backup');
      }

      return {
        primary,
        alternatives: baseRecommendations.alternatives,
        reasoning: baseRecommendations.reasoning,
        confidence,
        pros,
        cons,
        estimatedTime: state.fileAnalysis.estimatedProcessingTime,
        estimatedCost: primary.type === 'CLIENT_SIDE' ? 0 : (primary.type === 'CLIENT_DRIVE' ? 0 : 10)
      };
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return null;
    }
  }, [state.fileAnalysis, state.currentFile, state.isGoogleAuthenticated]);

  // Comparaciones detalladas de estrategias
  const comparisons = useMemo((): StrategyComparison[] => {
    if (!state.currentFile) return [];

    return compatibleStrategies.map(strategy => {
      const fileSize = state.currentFile!.size;
      const config = generateStrategyConfig(strategy.type, fileSize);
      
      const pros: string[] = [];
      const cons: string[] = [];
      
      // Generar pros y cons específicos
      switch (strategy.type) {
        case 'CLIENT_SIDE':
          pros.push('Instant processing', 'Complete privacy', 'Works offline');
          if (fileSize > 75 * 1024 * 1024) {
            cons.push('May slow down browser');
          }
          break;
          
        case 'CLIENT_DRIVE':
          pros.push('Cloud storage', 'Easy sharing', 'Automatic backups');
          cons.push('Requires Google account', 'Internet dependent');
          break;
          
        case 'SERVER_PREMIUM':
          pros.push('Handles massive files', 'Fastest processing', 'Advanced features');
          cons.push('Paid service', 'File upload required');
          break;
      }

      return {
        strategy,
        compatible: isStrategyCompatible(strategy.type, fileSize),
        estimatedTime: config.processingTime,
        fragmentSize: config.targetFragmentSize,
        fragmentCount: config.estimatedFragments,
        pros,
        cons,
        costLevel: strategy.type === 'SERVER_PREMIUM' ? 'medium' : 'free',
        requiresAuth: strategy.type === 'CLIENT_DRIVE' || strategy.type === 'SERVER_PREMIUM'
      };
    });
  }, [compatibleStrategies, state.currentFile]);

  // Actualizar estrategias disponibles cuando cambie la autenticación
  useEffect(() => {
    actions.setAvailableStrategies(availableStrategies);
  }, [availableStrategies, actions]);

  // Auto-seleccionar estrategia recomendada si no hay selección
  useEffect(() => {
    if (recommendedStrategy && !state.selectedStrategy && availableStrategies.includes(recommendedStrategy)) {
      actions.setStrategy(recommendedStrategy);
    }
  }, [recommendedStrategy, state.selectedStrategy, availableStrategies, actions]);

  // Acciones
  const selectStrategy = useCallback((strategyType: ProcessingStrategyType) => {
    const strategy = AVAILABLE_STRATEGIES[strategyType];
    if (!strategy) {
      actions.addNotification({
        type: 'error',
        title: 'Invalid strategy',
        message: `Strategy ${strategyType} not found`
      });
      return;
    }

    if (!availableStrategies.includes(strategy)) {
      actions.addNotification({
        type: 'warning',
        title: 'Strategy unavailable',
        message: getUnavailabilityReason(strategyType)
      });
      return;
    }

    if (!isStrategyCompatible(strategyType, state.currentFile?.size || 0)) {
      actions.addNotification({
        type: 'error',
        title: 'Strategy incompatible',
        message: `File too large for ${strategy.name} strategy`
      });
      return;
    }

    actions.setStrategy(strategy);
    
    // Auto-actualizar configuración basada en la estrategia
    if (state.currentFile) {
      const config = generateStrategyConfig(strategyType, state.currentFile.size);
      actions.updateConfig({
        targetFragmentSize: config.targetFragmentSize,
        compressionLevel: config.compressionLevel
      });
    }

    actions.addNotification({
      type: 'success',
      title: 'Strategy selected',
      message: `Using ${strategy.name} for processing`
    });
  }, [availableStrategies, state.currentFile, actions]);

  const selectRecommended = useCallback(() => {
    if (recommendedStrategy) {
      selectStrategy(recommendedStrategy.type);
    } else {
      actions.addNotification({
        type: 'warning',
        title: 'No recommendation',
        message: 'Analyze a file first to get recommendations'
      });
    }
  }, [recommendedStrategy, selectStrategy, actions]);

  const autoSelectOptimal = useCallback(() => {
    if (!state.currentFile) {
      actions.addNotification({
        type: 'warning',
        title: 'No file selected',
        message: 'Select a file first for optimal strategy selection'
      });
      return;
    }

    const optimalType = selectOptimalStrategy(state.currentFile.size);
    const optimalStrategy = AVAILABLE_STRATEGIES[optimalType];

    if (availableStrategies.includes(optimalStrategy)) {
      selectStrategy(optimalType);
    } else {
      // Buscar la mejor alternativa disponible
      const alternative = compatibleStrategies[0];
      if (alternative) {
        selectStrategy(alternative.type);
        actions.addNotification({
          type: 'info',
          title: 'Alternative selected',
          message: `${optimalStrategy.name} not available, using ${alternative.name} instead`
        });
      }
    }
  }, [state.currentFile, availableStrategies, compatibleStrategies, selectStrategy, actions]);

  const refreshAnalysis = useCallback(async () => {
    if (!state.currentFile) {
      throw new Error('No file to analyze');
    }

    try {
      actions.setStatus('analyzing');
      const analysis = await analyzeFile(state.currentFile);
      actions.setAnalysis(analysis);
      actions.setStatus('idle');
      
      actions.addNotification({
        type: 'success',
        title: 'Analysis updated',
        message: 'File analysis has been refreshed'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Analysis failed';
      actions.setError({
        code: 'ANALYSIS_FAILED',
        message: errorMsg,
        recoverable: true,
        suggestedAction: 'Try again or select a different file'
      });
    }
  }, [state.currentFile, actions]);

  // Utilidades
  const isStrategyAvailable = useCallback((strategyType: ProcessingStrategyType) => {
    const strategy = AVAILABLE_STRATEGIES[strategyType];
    return strategy && availableStrategies.includes(strategy);
  }, [availableStrategies]);

  const getStrategyDetails = useCallback((strategyType: ProcessingStrategyType) => {
    return AVAILABLE_STRATEGIES[strategyType] || null;
  }, []);

  const compareStrategies = useCallback((strategyTypes: ProcessingStrategyType[]) => {
    return strategyTypes.map(type => {
      const comparison = comparisons.find(c => c.strategy.type === type);
      return comparison || {
        strategy: AVAILABLE_STRATEGIES[type],
        compatible: false,
        estimatedTime: 0,
        fragmentSize: 0,
        fragmentCount: 0,
        pros: [],
        cons: ['Strategy not available'],
        costLevel: 'free' as const,
        requiresAuth: false
      };
    });
  }, [comparisons]);

  // Funciones auxiliares
  function getUnavailabilityReason(strategyType: ProcessingStrategyType): string {
    switch (strategyType) {
      case 'CLIENT_DRIVE':
        return 'Google Drive integration requires authentication';
      case 'SERVER_PREMIUM':
        return 'Premium server processing is not available yet';
      default:
        return 'Strategy is currently unavailable';
    }
  }

  return {
    // Available strategies
    allStrategies,
    availableStrategies,
    compatibleStrategies,
    
    // Current selection
    selectedStrategy: state.selectedStrategy,
    recommendedStrategy,
    
    // Analysis
    recommendations,
    comparisons,
    
    // Actions
    selectStrategy,
    selectRecommended,
    autoSelectOptimal,
    refreshAnalysis,
    
    // Utilities
    isStrategyAvailable,
    getStrategyDetails,
    compareStrategies
  };
}