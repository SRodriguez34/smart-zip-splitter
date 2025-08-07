/**
 * Advanced Settings Component
 * Panel de configuración avanzada para personalizar opciones de procesamiento
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  HardDrive, 
  Server, 
  Archive, 
  Sliders,
  Info,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState, useAppActions } from '@/hooks/use-app-state';
import { useStrategySelection } from '@/hooks/use-strategy-selection';
import { useProcessing } from '@/hooks/use-processing';

interface AdvancedSettingsProps {
  className?: string;
}

/**
 * Componente de configuración avanzada
 */
export function AdvancedSettings({ className }: AdvancedSettingsProps) {
  const { state, dispatch } = useAppState();
  const actions = useAppActions();
  const { selectStrategy, availableStrategies, getRecommendedFragmentSize, estimateProcessingTime } = useStrategySelection();
  const { capabilities } = useProcessing();
  
  const [isExpanded, setIsExpanded] = useState(state.showAdvancedOptions);

  // Helper para formatear tamaño de archivo
  const formatSize = (sizeInMB: number) => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB} MB`;
  };

  // Obtener configuración recomendada
  const recommendedFragmentSize = state.currentFile ? getRecommendedFragmentSize() : 25;
  const estimatedTime = state.currentFile && state.selectedStrategy ? 
    estimateProcessingTime(state.selectedStrategy.type) : 0;

  // Calcular número estimado de fragmentos
  const estimatedFragments = state.currentFile ? 
    Math.ceil(state.currentFile.size / (state.processingConfig.targetFragmentSize * 1024 * 1024)) : 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    actions.toggleAdvancedOptions();
  };

  const resetToDefaults = () => {
    actions.resetConfig();
    actions.addNotification({
      type: 'info',
      title: 'Settings reset',
      message: 'All settings have been reset to their default values'
    });
  };

  return (
    <TooltipProvider>
      <Card className={`border-slate-200 dark:border-slate-700 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle className="text-lg">Advanced Settings</CardTitle>
              {state.currentFile && (
                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                  {formatSize(Math.round(state.currentFile.size / (1024 * 1024)))}
                </span>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CardContent className="space-y-6 pt-0">
                {/* Strategy Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Processing Strategy</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose how your files will be processed</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="grid gap-3">
                    {availableStrategies.map((strategy) => (
                      <motion.div
                        key={strategy.type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={state.selectedStrategy?.type === strategy.type ? "default" : "outline"}
                          className={`w-full h-auto p-4 justify-start ${
                            state.selectedStrategy?.type === strategy.type 
                              ? 'bg-brand-primary hover:bg-brand-primary-hover' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => selectStrategy(strategy.type)}
                          disabled={!availableStrategies.includes(strategy)}
                        >
                          <div className="flex items-center space-x-3">
                            {strategy.type === 'CLIENT_SIDE' && <Zap className="h-5 w-5" />}
                            {strategy.type === 'CLIENT_DRIVE' && <HardDrive className="h-5 w-5" />}
                            {strategy.type === 'SERVER_PREMIUM' && <Server className="h-5 w-5" />}
                            
                            <div className="text-left">
                              <div className="font-medium">{strategy.name}</div>
                              <div className="text-xs opacity-75">{strategy.description}</div>
                            </div>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Strategy info */}
                  {state.selectedStrategy && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <Archive className="h-4 w-4 text-brand-primary" />
                        <span className="font-medium">Estimated processing:</span>
                      </div>
                      <div className="ml-6 text-slate-600 dark:text-slate-400">
                        <p>Time: ~{estimatedTime}s</p>
                        <p>Fragments: ~{estimatedFragments}</p>
                        <p>Max file size: {formatSize(Math.round(state.selectedStrategy.maxSize / (1024 * 1024)))}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Fragment Size Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fragment Size</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">Recommended: {recommendedFragmentSize}MB</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Size of each fragment file created</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="px-3">
                      <Slider
                        value={[state.processingConfig.targetFragmentSize]}
                        onValueChange={(value) => actions.updateConfig({ targetFragmentSize: value[0] })}
                        max={500}
                        min={5}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>5 MB</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {state.processingConfig.targetFragmentSize} MB
                      </span>
                      <span>500 MB</span>
                    </div>

                    {state.processingConfig.targetFragmentSize !== recommendedFragmentSize && (
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => actions.updateConfig({ targetFragmentSize: recommendedFragmentSize })}
                          className="text-xs text-brand-primary hover:text-brand-primary-hover"
                        >
                          Use recommended ({recommendedFragmentSize}MB)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Compression Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Compression Level</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Higher compression = smaller files but slower processing</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Select
                    value={state.processingConfig.compressionLevel.toString()}
                    onValueChange={(value) => actions.updateConfig({ compressionLevel: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No compression (Fastest)</SelectItem>
                      <SelectItem value="1">Fast compression</SelectItem>
                      <SelectItem value="6">Balanced (Recommended)</SelectItem>
                      <SelectItem value="9">Maximum compression (Slowest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Additional Options */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Additional Options</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="include-manifest" className="text-sm">Include manifest file</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Includes a JSON file with fragment information</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="include-manifest"
                        checked={state.processingConfig.includeManifest}
                        onCheckedChange={(checked) => actions.updateConfig({ includeManifest: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="create-zip-archive" className="text-sm">Create ZIP archive</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Package all fragments into a single ZIP file</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="create-zip-archive"
                        checked={state.processingConfig.createZipArchive}
                        onCheckedChange={(checked) => actions.updateConfig({ createZipArchive: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Fragment Naming */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fragment Naming</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How fragment files will be named</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Select
                    value={state.processingConfig.fragmentNaming}
                    onValueChange={(value) => actions.updateConfig({ fragmentNaming: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">Sequential (part001, part002...)</SelectItem>
                      <SelectItem value="descriptive">Descriptive (images, documents...)</SelectItem>
                      <SelectItem value="timestamp">Timestamp (2024_01_15_001...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Button */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs text-slate-500">
                    {state.currentFile && (
                      <>Estimated {estimatedFragments} fragment{estimatedFragments !== 1 ? 's' : ''}</>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToDefaults}
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset to defaults
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </TooltipProvider>
  );
}

/**
 * Componente compacto de configuración para mostrar en la barra lateral
 */
export function QuickSettings() {
  const { state } = useAppState();
  const { availableStrategies } = useStrategySelection();

  if (!state.currentFile) {
    return null;
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">Quick Settings</span>
          </div>
          
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Strategy:</span>
              <span className="font-medium">{state.selectedStrategy?.name || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Fragment size:</span>
              <span className="font-medium">{state.processingConfig.targetFragmentSize} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Compression:</span>
              <span className="font-medium">
                {state.processingConfig.compressionLevel === 0 ? 'None' :
                 state.processingConfig.compressionLevel <= 3 ? 'Fast' :
                 state.processingConfig.compressionLevel <= 6 ? 'Balanced' : 'Maximum'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}