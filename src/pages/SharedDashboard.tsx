import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from '@/components/dashboard/Dashboard';
import TemplateDashboard from '@/components/dashboard/TemplateDashboard';
import { useAuth } from '@/lib/authContext';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import type { TemplateId } from '@/lib/dashboardTemplates';

export default function SharedDashboard() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [chartOrder, setChartOrder] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('share_token', token)
        .maybeSingle();

      if (err || !data) {
        setError('Dashboard not found or access denied.');
        setLoading(false);
        return;
      }

      if (!data.is_public && data.user_id !== user?.id) {
        setError('This dashboard is private. Please log in.');
        setLoading(false);
        return;
      }

      if (data.analysis_data) {
        setAnalysis(data.analysis_data as unknown as DatasetAnalysis);
        setFileName(data.file_name || data.name);
        if (data.template_id) {
          setTemplateId(data.template_id as TemplateId);
        }
        if (data.chart_order && Array.isArray(data.chart_order)) {
          setChartOrder(data.chart_order as string[]);
        }
      } else {
        setError('No analysis data found.');
      }
      setLoading(false);
    })();
  }, [token, user]);

  if (loading) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <p className="text-destructive text-lg">{error}</p>
    </div>
  );

  if (!analysis) return null;

  if (templateId) {
    return (
      <TemplateDashboard
        analysis={analysis}
        templateId={templateId}
        fileName={fileName}
        onBack={() => window.history.back()}
        onSwitchTemplate={() => {}}
        onFullDashboard={() => {}}
        initialChartOrder={chartOrder}
      />
    );
  }

  return <Dashboard analysis={analysis} fileName={fileName} onReset={() => window.history.back()} />;
}
