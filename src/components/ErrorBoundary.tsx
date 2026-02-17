import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[280px] flex flex-col items-center justify-center gap-4 p-6 bg-muted/30 rounded-xl border border-border">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <div className="text-center max-w-md">
            <h3 className="font-semibold text-foreground mb-1">Xatolik yuz berdi</h3>
            <p className="text-sm text-muted-foreground mb-3">{this.state.error.message}</p>
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Orqaga qaytish
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
