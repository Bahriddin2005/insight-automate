import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface TableauVizProps {
  vizUrl: string;
  userFilters?: Record<string, string>;
  parameters?: Record<string, string>;
  toolbar?: 'top' | 'bottom' | 'hidden';
  device?: 'default' | 'desktop' | 'tablet' | 'phone';
  height?: string;
  onMarkSelection?: (marks: unknown) => void;
  onFilterChange?: (filter: unknown) => void;
  onParameterChange?: (param: unknown) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'tableau-viz': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        token?: string;
        toolbar?: string;
        device?: string;
        'hide-tabs'?: boolean;
        ref?: React.Ref<any>;
      };
      'viz-filter': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        field?: string;
        value?: string;
      };
      'viz-parameter': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        name?: string;
        value?: string;
      };
    }
  }
}

export default function TableauViz({
  vizUrl,
  userFilters = {},
  parameters = {},
  toolbar = 'hidden',
  device = 'default',
  height = '700px',
  onMarkSelection,
  onFilterChange,
  onParameterChange,
}: TableauVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vizRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Tableau Embedding API v3 script
  useEffect(() => {
    const scriptId = 'tableau-embedding-api';
    if (document.getElementById(scriptId)) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'module';
    script.src = 'https://embedding.tableauusercontent.com/tableau.embedding.3.latest.min.js';
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError('Tableau Embedding API yuklanmadi');
    document.head.appendChild(script);
  }, []);

  // Fetch JWT token
  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('tableau-auth', {
        body: { userAttributes: userFilters },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.token) throw new Error('Token olinmadi');
      setToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token olishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [userFilters]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Render viz when token and script are ready
  useEffect(() => {
    if (!token || !scriptLoaded || !containerRef.current) return;

    // Clear previous
    containerRef.current.innerHTML = '';

    const viz = document.createElement('tableau-viz');
    viz.setAttribute('src', vizUrl);
    viz.setAttribute('token', token);
    viz.setAttribute('toolbar', toolbar);
    if (device !== 'default') viz.setAttribute('device', device);
    viz.style.width = '100%';
    viz.style.height = height;

    // Add filters
    Object.entries(userFilters).forEach(([field, value]) => {
      const filter = document.createElement('viz-filter');
      filter.setAttribute('field', field);
      filter.setAttribute('value', value);
      viz.appendChild(filter);
    });

    // Add parameters
    Object.entries(parameters).forEach(([name, value]) => {
      const param = document.createElement('viz-parameter');
      param.setAttribute('name', name);
      param.setAttribute('value', value);
      viz.appendChild(param);
    });

    // Event listeners
    viz.addEventListener('firstinteractive', () => setLoading(false));

    if (onMarkSelection) {
      viz.addEventListener('markselectionchanged', (e: any) => onMarkSelection(e.detail));
    }
    if (onFilterChange) {
      viz.addEventListener('filterchanged', (e: any) => onFilterChange(e.detail));
    }
    if (onParameterChange) {
      viz.addEventListener('parameterchanged', (e: any) => onParameterChange(e.detail));
    }

    containerRef.current.appendChild(viz);
    vizRef.current = viz;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [token, scriptLoaded, vizUrl, toolbar, device, height]);

  const toggleFullscreen = () => {
    if (!containerRef.current?.parentElement) return;
    if (!document.fullscreenElement) {
      containerRef.current.parentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-8 min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground text-center">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchToken}>
          <RefreshCw className="w-4 h-4 mr-2" /> Qayta urinish
        </Button>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Dashboard yuklanmoqda...</span>
        </div>
      )}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchToken}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <div ref={containerRef} style={{ minHeight: height }} />
    </Card>
  );
}
