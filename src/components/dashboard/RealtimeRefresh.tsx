import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onRefresh: () => void;
  intervalSeconds?: number;
}

export default function RealtimeRefresh({ onRefresh, intervalSeconds = 30 }: Props) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const doRefresh = useCallback(() => {
    setIsRefreshing(true);
    onRefresh();
    setLastRefreshed(new Date());
    setCountdown(intervalSeconds);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh, intervalSeconds]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(doRefresh, intervalSeconds * 1000);
      countdownRef.current = setInterval(() => {
        setCountdown(c => (c <= 1 ? intervalSeconds : c - 1));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, intervalSeconds, doRefresh]);

  const timeSinceRefresh = () => {
    const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
      <Button
        variant={autoRefresh ? 'default' : 'outline'}
        size="sm"
        onClick={() => setAutoRefresh(!autoRefresh)}
        className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 gap-1"
      >
        {autoRefresh ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Auto'}</span>
      </Button>

      <AnimatePresence>
        {autoRefresh && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="text-[10px] text-muted-foreground font-mono overflow-hidden whitespace-nowrap"
          >
            {countdown}s
          </motion.span>
        )}
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        onClick={doRefresh}
        className="h-7 w-7 sm:h-8 sm:w-8"
        disabled={isRefreshing}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>

      <span className="text-[10px] text-muted-foreground hidden sm:inline">
        {timeSinceRefresh()}
      </span>
    </motion.div>
  );
}
