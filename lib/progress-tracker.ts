/**
 * Progress Tracker
 * Sistema de seguimiento de progreso con estimaciones precisas y métricas en tiempo real
 */

import type { ProcessingStrategy, ProcessingStrategyType } from '@/types/processing';
import type { ProgressState } from '@/types/ui';

export interface ProgressPhase {
  name: string;
  weight: number; // Peso relativo de la fase (0-1)
  estimatedDuration: number; // En segundos
  description: string;
}

export interface ProgressMetrics {
  startTime: number;
  currentTime: number;
  elapsedTime: number;
  estimatedTotalTime: number;
  remainingTime: number;
  completedBytes: number;
  totalBytes: number;
  throughput: number; // bytes por segundo
  efficiency: number; // 0-1, qué tan cerca estamos de las estimaciones
}

export interface ProgressUpdate {
  phase: string;
  phaseProgress: number; // 0-100
  totalProgress: number; // 0-100
  state: ProgressState;
  message: string;
  metrics: ProgressMetrics;
  estimatedTimeRemaining: number;
}

/**
 * Clase principal para seguimiento de progreso
 */
export class ProgressTracker {
  private phases: ProgressPhase[] = [];
  private currentPhaseIndex: number = 0;
  private currentPhaseProgress: number = 0;
  private startTime: number = 0;
  private totalBytes: number = 0;
  private completedBytes: number = 0;
  private strategy: ProcessingStrategyType;
  private callbacks: ((update: ProgressUpdate) => void)[] = [];
  private throughputSamples: { timestamp: number; bytes: number }[] = [];
  private lastUpdateTime: number = 0;

  constructor(strategy: ProcessingStrategyType, totalBytes: number) {
    this.strategy = strategy;
    this.totalBytes = totalBytes;
    this.setupPhasesForStrategy();
  }

  /**
   * Configura las fases según la estrategia de procesamiento
   */
  private setupPhasesForStrategy(): void {
    const fileSizeMB = this.totalBytes / (1024 * 1024);

    switch (this.strategy) {
      case 'CLIENT_SIDE':
        this.phases = [
          {
            name: 'initialization',
            weight: 0.05,
            estimatedDuration: 1,
            description: 'Initializing ZIP processor...'
          },
          {
            name: 'reading',
            weight: 0.15,
            estimatedDuration: Math.max(2, fileSizeMB * 0.1),
            description: 'Reading ZIP file...'
          },
          {
            name: 'analyzing',
            weight: 0.10,
            estimatedDuration: Math.max(1, fileSizeMB * 0.05),
            description: 'Analyzing ZIP contents...'
          },
          {
            name: 'processing',
            weight: 0.50,
            estimatedDuration: Math.max(5, fileSizeMB * 0.2),
            description: 'Creating file fragments...'
          },
          {
            name: 'compression',
            weight: 0.15,
            estimatedDuration: Math.max(2, fileSizeMB * 0.1),
            description: 'Compressing fragments...'
          },
          {
            name: 'finalization',
            weight: 0.05,
            estimatedDuration: 1,
            description: 'Finalizing process...'
          }
        ];
        break;

      case 'CLIENT_DRIVE':
        this.phases = [
          {
            name: 'initialization',
            weight: 0.03,
            estimatedDuration: 2,
            description: 'Initializing Google Drive integration...'
          },
          {
            name: 'authentication',
            weight: 0.07,
            estimatedDuration: 3,
            description: 'Authenticating with Google Drive...'
          },
          {
            name: 'reading',
            weight: 0.10,
            estimatedDuration: Math.max(3, fileSizeMB * 0.08),
            description: 'Reading ZIP file...'
          },
          {
            name: 'analyzing',
            weight: 0.05,
            estimatedDuration: Math.max(2, fileSizeMB * 0.03),
            description: 'Analyzing ZIP contents...'
          },
          {
            name: 'processing',
            weight: 0.25,
            estimatedDuration: Math.max(5, fileSizeMB * 0.15),
            description: 'Creating file fragments...'
          },
          {
            name: 'uploading',
            weight: 0.40,
            estimatedDuration: Math.max(10, fileSizeMB * 0.3),
            description: 'Uploading to Google Drive...'
          },
          {
            name: 'sharing',
            weight: 0.08,
            estimatedDuration: 3,
            description: 'Creating shareable links...'
          },
          {
            name: 'finalization',
            weight: 0.02,
            estimatedDuration: 1,
            description: 'Finalizing process...'
          }
        ];
        break;

      case 'SERVER_PREMIUM':
        this.phases = [
          {
            name: 'initialization',
            weight: 0.02,
            estimatedDuration: 1,
            description: 'Connecting to processing server...'
          },
          {
            name: 'uploading',
            weight: 0.25,
            estimatedDuration: Math.max(5, fileSizeMB * 0.1),
            description: 'Uploading to server...'
          },
          {
            name: 'queuing',
            weight: 0.03,
            estimatedDuration: 2,
            description: 'Queuing for processing...'
          },
          {
            name: 'processing',
            weight: 0.60,
            estimatedDuration: Math.max(3, fileSizeMB * 0.05),
            description: 'Server processing...'
          },
          {
            name: 'downloading',
            weight: 0.08,
            estimatedDuration: Math.max(2, fileSizeMB * 0.02),
            description: 'Downloading results...'
          },
          {
            name: 'finalization',
            weight: 0.02,
            estimatedDuration: 1,
            description: 'Finalizing process...'
          }
        ];
        break;
    }
  }

  /**
   * Inicia el seguimiento de progreso
   */
  public start(): void {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.currentPhaseIndex = 0;
    this.currentPhaseProgress = 0;
    this.completedBytes = 0;
    this.throughputSamples = [];
    
    this.emitUpdate();
  }

  /**
   * Actualiza el progreso de la fase actual
   */
  public updatePhaseProgress(progress: number, completedBytes?: number): void {
    this.currentPhaseProgress = Math.max(0, Math.min(100, progress));
    
    if (completedBytes !== undefined) {
      this.completedBytes = Math.max(0, Math.min(this.totalBytes, completedBytes));
      this.updateThroughputSample();
    }

    this.emitUpdate();
  }

  /**
   * Avanza a la siguiente fase
   */
  public nextPhase(message?: string): void {
    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
      this.currentPhaseProgress = 0;
      
      if (message) {
        this.phases[this.currentPhaseIndex].description = message;
      }
    }
    
    this.emitUpdate();
  }

  /**
   * Establece una fase específica
   */
  public setPhase(phaseName: string, progress: number = 0): void {
    const phaseIndex = this.phases.findIndex(p => p.name === phaseName);
    if (phaseIndex >= 0) {
      this.currentPhaseIndex = phaseIndex;
      this.currentPhaseProgress = Math.max(0, Math.min(100, progress));
      this.emitUpdate();
    }
  }

  /**
   * Completa el procesamiento
   */
  public complete(): void {
    this.currentPhaseIndex = this.phases.length - 1;
    this.currentPhaseProgress = 100;
    this.completedBytes = this.totalBytes;
    this.emitUpdate();
  }

  /**
   * Marca el procesamiento como fallido
   */
  public error(message: string): void {
    const errorUpdate: ProgressUpdate = {
      phase: 'error',
      phaseProgress: 0,
      totalProgress: this.calculateTotalProgress(),
      state: 'error',
      message,
      metrics: this.calculateMetrics(),
      estimatedTimeRemaining: 0
    };

    this.notifyCallbacks(errorUpdate);
  }

  /**
   * Suscribe a actualizaciones de progreso
   */
  public subscribe(callback: (update: ProgressUpdate) => void): () => void {
    this.callbacks.push(callback);
    
    // Devolver función de desuscripción
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index >= 0) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Calcula el progreso total
   */
  private calculateTotalProgress(): number {
    let totalProgress = 0;
    
    // Agregar progreso de fases completadas
    for (let i = 0; i < this.currentPhaseIndex; i++) {
      totalProgress += this.phases[i].weight * 100;
    }
    
    // Agregar progreso de fase actual
    if (this.currentPhaseIndex < this.phases.length) {
      const currentPhaseWeight = this.phases[this.currentPhaseIndex].weight;
      totalProgress += (this.currentPhaseProgress / 100) * currentPhaseWeight * 100;
    }
    
    return Math.min(100, totalProgress);
  }

  /**
   * Calcula métricas detalladas
   */
  private calculateMetrics(): ProgressMetrics {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000; // En segundos
    
    // Calcular throughput promedio
    const throughput = this.calculateThroughput();
    
    // Estimar tiempo total basado en progreso actual
    const totalProgress = this.calculateTotalProgress();
    const estimatedTotalTime = totalProgress > 0 ? (elapsedTime * 100) / totalProgress : 0;
    
    // Calcular tiempo restante
    const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
    
    // Calcular eficiencia comparando con estimaciones iniciales
    const estimatedElapsedTime = this.getEstimatedElapsedTime();
    const efficiency = estimatedElapsedTime > 0 ? Math.min(1, estimatedElapsedTime / elapsedTime) : 1;
    
    return {
      startTime: this.startTime,
      currentTime,
      elapsedTime,
      estimatedTotalTime,
      remainingTime,
      completedBytes: this.completedBytes,
      totalBytes: this.totalBytes,
      throughput,
      efficiency
    };
  }

  /**
   * Calcula el throughput actual
   */
  private calculateThroughput(): number {
    if (this.throughputSamples.length < 2) {
      return 0;
    }
    
    // Usar las últimas 10 muestras para un promedio móvil
    const recentSamples = this.throughputSamples.slice(-10);
    const timeSpan = recentSamples[recentSamples.length - 1].timestamp - recentSamples[0].timestamp;
    const bytesProcessed = recentSamples[recentSamples.length - 1].bytes - recentSamples[0].bytes;
    
    return timeSpan > 0 ? (bytesProcessed / timeSpan) * 1000 : 0; // bytes por segundo
  }

  /**
   * Actualiza la muestra de throughput
   */
  private updateThroughputSample(): void {
    const currentTime = Date.now();
    
    // Agregar nueva muestra solo si ha pasado tiempo suficiente
    if (currentTime - this.lastUpdateTime >= 500) { // Cada 500ms
      this.throughputSamples.push({
        timestamp: currentTime,
        bytes: this.completedBytes
      });
      
      // Mantener solo las últimas 20 muestras
      if (this.throughputSamples.length > 20) {
        this.throughputSamples.shift();
      }
      
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * Obtiene el tiempo estimado transcurrido según las fases
   */
  private getEstimatedElapsedTime(): number {
    let estimatedTime = 0;
    
    // Tiempo de fases completadas
    for (let i = 0; i < this.currentPhaseIndex; i++) {
      estimatedTime += this.phases[i].estimatedDuration;
    }
    
    // Tiempo de fase actual
    if (this.currentPhaseIndex < this.phases.length) {
      const currentPhaseDuration = this.phases[this.currentPhaseIndex].estimatedDuration;
      estimatedTime += (this.currentPhaseProgress / 100) * currentPhaseDuration;
    }
    
    return estimatedTime;
  }

  /**
   * Determina el estado actual
   */
  private getCurrentState(): ProgressState {
    if (this.currentPhaseIndex >= this.phases.length - 1 && this.currentPhaseProgress >= 100) {
      return 'complete';
    }
    
    const currentPhase = this.phases[this.currentPhaseIndex];
    
    switch (currentPhase.name) {
      case 'initialization':
      case 'reading':
      case 'analyzing':
        return 'analyzing';
      case 'processing':
      case 'compression':
        return 'processing';
      case 'uploading':
      case 'downloading':
        return 'uploading';
      default:
        return 'processing';
    }
  }

  /**
   * Emite actualización de progreso
   */
  private emitUpdate(): void {
    const currentPhase = this.phases[this.currentPhaseIndex];
    const metrics = this.calculateMetrics();
    
    const update: ProgressUpdate = {
      phase: currentPhase.name,
      phaseProgress: this.currentPhaseProgress,
      totalProgress: this.calculateTotalProgress(),
      state: this.getCurrentState(),
      message: this.generateContextualMessage(currentPhase, metrics),
      metrics,
      estimatedTimeRemaining: metrics.remainingTime
    };

    this.notifyCallbacks(update);
  }

  /**
   * Genera mensaje contextual basado en la fase y métricas
   */
  private generateContextualMessage(phase: ProgressPhase, metrics: ProgressMetrics): string {
    const baseMessage = phase.description;
    
    // Agregar información contextual según la fase
    if (phase.name === 'processing' && this.completedBytes > 0) {
      const processedMB = (this.completedBytes / (1024 * 1024)).toFixed(1);
      const totalMB = (this.totalBytes / (1024 * 1024)).toFixed(1);
      return `${baseMessage} (${processedMB}/${totalMB} MB)`;
    }
    
    if (phase.name === 'uploading' && metrics.throughput > 0) {
      const speedMBps = (metrics.throughput / (1024 * 1024)).toFixed(1);
      return `${baseMessage} (${speedMBps} MB/s)`;
    }
    
    if (metrics.remainingTime > 0 && metrics.remainingTime < 300) { // Menos de 5 minutos
      const remainingMinutes = Math.ceil(metrics.remainingTime / 60);
      const unit = remainingMinutes === 1 ? 'minute' : 'minutes';
      return `${baseMessage} (~${remainingMinutes} ${unit} remaining)`;
    }
    
    return baseMessage;
  }

  /**
   * Notifica a todos los callbacks
   */
  private notifyCallbacks(update: ProgressUpdate): void {
    this.callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Obtiene información de la fase actual
   */
  public getCurrentPhase(): ProgressPhase | null {
    return this.currentPhaseIndex < this.phases.length ? this.phases[this.currentPhaseIndex] : null;
  }

  /**
   * Obtiene todas las fases
   */
  public getPhases(): ProgressPhase[] {
    return [...this.phases];
  }

  /**
   * Obtiene métricas actuales
   */
  public getMetrics(): ProgressMetrics {
    return this.calculateMetrics();
  }

  /**
   * Limpia recursos
   */
  public dispose(): void {
    this.callbacks.length = 0;
    this.throughputSamples.length = 0;
  }
}