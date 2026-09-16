import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, X, Copy, Trash2, ChevronDown, Wifi, WifiOff, AlertTriangle, CheckCircle, Info, Bug } from 'lucide-react';

interface LogEntry {
  id: number;
  type: 'log' | 'warn' | 'error' | 'info' | 'success';
  message: string;
  timestamp: Date;
  args: any[];
}

type ToastType = 'info' | 'success' | 'warning' | 'error';

// ═══════════════════════════════════════════════════════════════
// Instalar interceptor de console ANTES de que se use
// ═══════════════════════════════════════════════════════════════
let logCounter = 0;
const logListeners: Array<(entry: LogEntry) => void> = [];

function notifyLog(type: LogEntry['type'], args: any[]) {
  logCounter++;
  const message = args
    .map(a => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'string') return a;
      if (typeof a === 'number' || typeof a === 'boolean') return String(a);
      try {
        return JSON.stringify(a, null, 0);
      } catch {
        return String(a);
      }
    })
    .join(' ');

  const entry: LogEntry = {
    id: logCounter,
    type,
    message,
    timestamp: new Date(),
    args
  };

  logListeners.forEach(l => l(entry));
}

// Guardar referencias originales
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

// Instalar interceptor (solo una vez)
let interceptorInstalled = false;
function installInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    notifyLog('log', args);
  };
  console.warn = (...args: any[]) => {
    originalWarn.apply(console, args);
    notifyLog('warn', args);
  };
  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    notifyLog('error', args);
  };
  console.info = (...args: any[]) => {
    originalInfo.apply(console, args);
    notifyLog('info', args);
  };

  // Capturar errores no manejados
  window.addEventListener('error', (e) => {
    notifyLog('error', [`[Uncaught] ${e.message}`, `${e.filename}:${e.lineno}`]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    notifyLog('error', [`[Unhandled Promise] ${e.reason?.message || e.reason || 'Unknown'}`]);
  });
}

installInterceptor();

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════
export const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Suscribirse a logs
  useEffect(() => {
    const listener = (entry: LogEntry) => {
      setLogs(prev => {
        const next = [...prev, entry];
        return next.length > 500 ? next.slice(-500) : next;
      });
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };
    logListeners.push(listener);
    return () => {
      const idx = logListeners.indexOf(listener);
      if (idx >= 0) logListeners.splice(idx, 1);
    };
  }, [isOpen]);

  // Detectar conexión
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      notifyLog('info', ['📶 Conexión restaurada']);
    };
    const onOffline = () => {
      setIsOnline(false);
      notifyLog('warn', ['📵 Sin conexión a internet']);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Autoscroll
  useEffect(() => {
    if (isOpen && autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, autoScroll]);

  // Detectar si el usuario está scrolleando manualmente
  const handleScroll = useCallback(() => {
    const el = logsContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleClose = () => setIsOpen(false);

  const handleClear = () => {
    setLogs([]);
    setUnreadCount(0);
  };

  const handleCopy = async () => {
    const text = logs
      .map(l => `[${l.timestamp.toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notifyLog('success', ['✅ Logs copiados al portapapeles']);
    } catch {
      // Fallback para APK sin clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      notifyLog('success', ['✅ Logs copiados (fallback)']);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'error') return l.type === 'error';
    if (filter === 'warn') return l.type === 'warn' || l.type === 'error';
    return true;
  });

  const errorCount = logs.filter(l => l.type === 'error').length;
  const warnCount = logs.filter(l => l.type === 'warn').length;

  // ═══════════════════════════════════════════════════════════════
  // BOTÓN FLOTANTE
  // ═══════════════════════════════════════════════════════════════
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-3 z-[9999] w-12 h-12 rounded-full bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-700 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
        aria-label="Abrir consola de debug"
        style={{ touchAction: 'none' }}
      >
        <Settings className="w-5 h-5 text-amber-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isOnline && (
          <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border border-slate-900">
            <WifiOff className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </button>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PANEL FULLSCREEN
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col font-mono"
      style={{ fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">Debug Console</span>
          <span className="text-[10px] text-slate-500">
            {filteredLogs.length} logs
          </span>
          {errorCount > 0 && (
            <span className="text-[10px] text-red-400 font-bold">
              • {errorCount} errores
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] text-yellow-400 font-bold">
              • {warnCount} warnings
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
            isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Copiar logs"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Limpiar logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition active:scale-95"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 bg-slate-900/50 shrink-0">
        {(['all', 'warn', 'error'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition ${
              filter === f
                ? f === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : f === 'warn'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-slate-700 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'warn' ? 'Warnings+' : 'Errores'}
          </button>
        ))}
      </div>

      {/* Logs list */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">
            No hay logs {filter !== 'all' ? `de tipo "${filter}"` : ''} aún
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogRow key={log.id} log={log} />
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Autoscroll toggle */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold shadow-2xl flex items-center gap-1 active:scale-95"
        >
          <ChevronDown className="w-3 h-3" />
          Ir al final
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Fila de log individual
// ═══════════════════════════════════════════════════════════════
const LogRow: React.FC<{ log: LogEntry }> = React.memo(({ log }) => {
  const time = log.timestamp.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const styles = {
    log: { border: 'border-l-slate-500', text: 'text-slate-200', bg: 'bg-slate-900/40', icon: null },
    info: { border: 'border-l-blue-500', text: 'text-blue-300', bg: 'bg-blue-950/20', icon: <Info className="w-2.5 h-2.5" /> },
    warn: { border: 'border-l-yellow-500', text: 'text-yellow-300', bg: 'bg-yellow-950/20', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
    error: { border: 'border-l-red-500', text: 'text-red-300', bg: 'bg-red-950/30', icon: <X className="w-2.5 h-2.5" /> },
    success: { border: 'border-l-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-950/20', icon: <CheckCircle className="w-2.5 h-2.5" /> }
  }[log.type] || { border: 'border-l-slate-500', text: 'text-slate-200', bg: 'bg-slate-900/40', icon: null };

  return (
    <div className={`px-2 py-1 rounded border-l-2 ${styles.border} ${styles.bg} text-[10px] leading-tight break-all`}>
      <div className="flex items-start gap-1.5">
        <span className="text-slate-500 shrink-0 font-mono">
          {time}
        </span>
        {styles.icon && (
          <span className={`shrink-0 mt-0.5 ${styles.text}`}>
            {styles.icon}
          </span>
        )}
        <span className={`flex-1 ${styles.text} whitespace-pre-wrap`}>
          {log.message}
        </span>
      </div>
    </div>
  );
});

LogRow.displayName = 'LogRow';

// ═══════════════════════════════════════════════════════════════
// Helpers para usar en toda la app
// ═══════════════════════════════════════════════════════════════
export function dlogInfo(...args: any[]) {
  console.info(...args);
}
export function dlogSuccess(...args: any[]) {
  console.log('✅', ...args);
}
export function dlogWarn(...args: any[]) {
  console.warn(...args);
}
export function dlogError(...args: any[]) {
  console.error(...args);
}
