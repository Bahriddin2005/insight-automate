import { FileSpreadsheet, Globe, Clock } from 'lucide-react';

interface DataSourceBadgeProps {
  fileName: string;
  timestamp?: Date;
}

export default function DataSourceBadge({ fileName, timestamp }: DataSourceBadgeProps) {
  const isApi = fileName.startsWith('API:') || fileName.startsWith('api:');
  const displayTime = timestamp || new Date();

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 border border-border/50 text-xs">
      {isApi ? (
        <Globe className="w-3 h-3 text-primary" />
      ) : (
        <FileSpreadsheet className="w-3 h-3 text-accent" />
      )}
      <span className="text-foreground font-medium">{isApi ? 'API' : 'File'}</span>
      <span className="text-muted-foreground">·</span>
      <Clock className="w-3 h-3 text-muted-foreground" />
      <span className="text-muted-foreground">{displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}
