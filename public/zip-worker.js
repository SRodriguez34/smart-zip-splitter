/**
 * ZIP Processing Web Worker
 * Procesa archivos ZIP en background thread para evitar bloquear la UI
 */

// Importar JSZip para el worker
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

// Estado del worker
let currentTask = null;
let isProcessing = false;

// Configuración
const PROGRESS_UPDATE_INTERVAL = 250; // ms
const MEMORY_CHECK_INTERVAL = 1000; // ms

/**
 * Maneja mensajes del hilo principal
 */
self.addEventListener('message', async (event) => {
  const { type, id, payload } = event.data;
  
  try {
    switch (type) {
      case 'PING':
        handlePing(id);
        break;
        
      case 'PROCESS_ZIP':
        await handleProcessZip(id, payload);
        break;
        
      case 'CANCEL':
        handleCancel(id);
        break;
        
      default:
        postMessage({
          type: 'ERROR',
          id,
          payload: {
            message: `Unknown message type: ${type}`,
            code: 'UNKNOWN_MESSAGE_TYPE'
          }
        });
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      id,
      payload: {
        message: error.message || 'Unknown error occurred',
        code: 'WORKER_ERROR',
        cancelled: false
      }
    });
  }
});

/**
 * Responde a ping
 */
function handlePing(id) {
  postMessage({
    type: 'PONG',
    id,
    payload: {
      status: 'alive',
      processing: isProcessing,
      currentTask: currentTask?.id || null
    }
  });
}

/**
 * Maneja cancelación de tarea
 */
function handleCancel(id) {
  if (currentTask && currentTask.id === id) {
    currentTask.cancelled = true;
    postMessage({
      type: 'ERROR',
      id,
      payload: {
        message: 'Processing cancelled by user',
        code: 'CANCELLED',
        cancelled: true
      }
    });
    resetWorkerState();
  }
}

/**
 * Procesa archivo ZIP
 */
async function handleProcessZip(id, payload) {
  if (isProcessing) {
    throw new Error('Another processing task is already running');
  }

  currentTask = {
    id,
    startTime: Date.now(),
    cancelled: false
  };
  
  isProcessing = true;
  
  try {
    const { fileArrayBuffer, options } = payload;
    
    // Fase 1: Inicialización
    reportProgress(id, 'initialization', 0, 'Initializing ZIP processor...');
    
    // Validar datos recibidos
    if (!fileArrayBuffer || !options) {
      throw new Error('Invalid payload: missing fileArrayBuffer or options');
    }

    // Fase 2: Lectura del ZIP
    reportProgress(id, 'reading', 10, 'Loading ZIP file...');
    const zip = await loadZipFromBuffer(fileArrayBuffer);
    
    checkCancellation();

    // Fase 3: Análisis
    reportProgress(id, 'analyzing', 25, 'Analyzing ZIP contents...');
    const analysis = await analyzeZipContents(zip);
    
    checkCancellation();

    // Fase 4: Procesamiento
    reportProgress(id, 'processing', 40, 'Creating file fragments...');
    const fragments = await createFragments(zip, options, analysis, id);
    
    checkCancellation();

    // Fase 5: Compresión
    reportProgress(id, 'compression', 80, 'Compressing fragments...');
    const processedFragments = await compressFragments(fragments, options, id);
    
    checkCancellation();

    // Fase 6: Finalización
    reportProgress(id, 'finalization', 95, 'Finalizing process...');
    const metrics = calculateMetrics(currentTask.startTime, fileArrayBuffer.byteLength, processedFragments);
    
    // Enviar resultado exitoso
    postMessage({
      type: 'COMPLETE',
      id,
      payload: {
        success: true,
        fragments: processedFragments.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          checksum: f.checksum
        })),
        metrics
      }
    });

    // Enviar blobs de fragmentos por separado para evitar problemas de transferencia
    for (let i = 0; i < processedFragments.length; i++) {
      postMessage({
        type: 'FRAGMENT_BLOB',
        id,
        payload: {
          fragmentIndex: i,
          blob: processedFragments[i].blob
        }
      });
    }

    reportProgress(id, 'complete', 100, 'Processing completed successfully!');
    
  } finally {
    resetWorkerState();
  }
}

/**
 * Carga ZIP desde ArrayBuffer
 */
async function loadZipFromBuffer(arrayBuffer) {
  try {
    const zip = new JSZip();
    return await zip.loadAsync(arrayBuffer);
  } catch (error) {
    throw new Error(`Failed to load ZIP file: ${error.message}`);
  }
}

/**
 * Analiza contenido del ZIP
 */
async function analyzeZipContents(zip) {
  const analysis = {
    totalEntries: 0,
    totalUncompressedSize: 0,
    largestFile: 0,
    fileTypes: {}
  };

  const entries = Object.values(zip.files);
  
  for (const entry of entries) {
    if (!entry.dir) {
      analysis.totalEntries++;
      
      const size = entry._data?.uncompressedSize || 0;
      analysis.totalUncompressedSize += size;
      analysis.largestFile = Math.max(analysis.largestFile, size);
      
      // Contar tipos de archivo
      const extension = entry.name.split('.').pop()?.toLowerCase() || 'unknown';
      analysis.fileTypes[extension] = (analysis.fileTypes[extension] || 0) + 1;
    }
  }

  return analysis;
}

/**
 * Crea fragmentos del ZIP
 */
async function createFragments(zip, options, analysis, taskId) {
  const fragments = [];
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  
  let currentFragmentSize = 0;
  let currentFragmentEntries = [];
  let fragmentIndex = 0;
  
  const totalEntries = entries.length;

  for (let i = 0; i < entries.length; i++) {
    checkCancellation();
    
    const entry = entries[i];
    const entrySize = entry._data?.uncompressedSize || 0;
    
    // Reportar progreso basado en archivos procesados
    const progressPercent = Math.round((i / totalEntries) * 30); // 30% del progreso total
    reportProgress(taskId, 'processing', 40 + progressPercent, 
      `Processing file ${i + 1}/${totalEntries}: ${entry.name.substring(0, 40)}...`);
    
    // Si agregar esta entrada excede el tamaño del fragmento
    if (currentFragmentSize + entrySize > options.fragmentSize && currentFragmentEntries.length > 0) {
      fragments.push({
        index: fragmentIndex,
        entries: [...currentFragmentEntries],
        estimatedSize: currentFragmentSize
      });
      
      currentFragmentEntries = [entry];
      currentFragmentSize = entrySize;
      fragmentIndex++;
    } else {
      currentFragmentEntries.push(entry);
      currentFragmentSize += entrySize;
    }
  }

  // Agregar último fragmento si tiene contenido
  if (currentFragmentEntries.length > 0) {
    fragments.push({
      index: fragmentIndex,
      entries: [...currentFragmentEntries],
      estimatedSize: currentFragmentSize
    });
  }

  return fragments;
}

/**
 * Comprime fragmentos
 */
async function compressFragments(fragments, options, taskId) {
  const processedFragments = [];
  const totalFragments = fragments.length;

  for (let i = 0; i < fragments.length; i++) {
    checkCancellation();
    
    const fragment = fragments[i];
    
    // Reportar progreso de compresión
    const progressPercent = Math.round((i / totalFragments) * 15); // 15% del progreso total
    reportProgress(taskId, 'compression', 80 + progressPercent,
      `Compressing fragment ${i + 1}/${totalFragments}...`);
    
    const fragmentZip = new JSZip();
    const fragmentId = `fragment_${fragment.index.toString().padStart(3, '0')}`;
    
    // Agregar archivos al fragmento
    for (const entry of fragment.entries) {
      const content = await entry.async('arraybuffer');
      fragmentZip.file(entry.name, content);
    }

    // Generar ZIP comprimido
    const fragmentBlob = await fragmentZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: options.compressionLevel || 6
      }
    });

    // Calcular checksum
    const checksum = await calculateChecksum(fragmentBlob);
    
    // Crear nombre del fragmento
    const originalName = options.customFilename || 'archive';
    const fragmentName = `${originalName}_part${(fragment.index + 1).toString().padStart(3, '0')}.zip`;

    processedFragments.push({
      id: fragmentId,
      name: fragmentName,
      size: fragmentBlob.size,
      blob: fragmentBlob,
      checksum: checksum
    });
  }

  return processedFragments;
}

/**
 * Calcula checksum SHA-256 de un blob
 */
async function calculateChecksum(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calcula métricas finales
 */
function calculateMetrics(startTime, originalSize, fragments) {
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const totalFragmentSize = fragments.reduce((sum, f) => sum + f.size, 0);
  
  return {
    processingTime: totalTime,
    originalSize,
    compressedSize: totalFragmentSize,
    compressionRatio: originalSize > 0 ? totalFragmentSize / originalSize : 1,
    fragmentCount: fragments.length,
    averageFragmentSize: fragments.length > 0 ? totalFragmentSize / fragments.length : 0
  };
}

/**
 * Reporta progreso al hilo principal
 */
function reportProgress(taskId, phase, progress, message) {
  if (currentTask && !currentTask.cancelled) {
    postMessage({
      type: 'PROGRESS',
      id: taskId,
      payload: {
        phase,
        progress: Math.min(100, Math.max(0, progress)),
        message
      }
    });
  }
}

/**
 * Verifica si la tarea fue cancelada
 */
function checkCancellation() {
  if (currentTask && currentTask.cancelled) {
    throw new Error('Processing was cancelled');
  }
}

/**
 * Resetea estado del worker
 */
function resetWorkerState() {
  currentTask = null;
  isProcessing = false;
}

// Notificar que el worker está listo
postMessage({
  type: 'READY',
  id: 'init',
  payload: {
    message: 'ZIP Worker initialized and ready'
  }
});