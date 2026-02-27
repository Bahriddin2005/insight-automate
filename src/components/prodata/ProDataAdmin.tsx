import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Database, Brain, Activity, RefreshCw, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';

interface Props {
  data: any[] | null;
  columns: string[];
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface UploadLog {
  id: string;
  file_name: string;
  row_count: number;
  column_count: number;
  quality_score: number;
  created_at: string;
}

interface DashboardLog {
  id: string;
  name: string;
  file_name: string | null;
  created_at: string;
  is_public: boolean;
}

export default function ProDataAdmin({ data, columns }: Props) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [uploads, setUploads] = useState<UploadLog[]>([]);
  const [dashboards, setDashboards] = useState<DashboardLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, uploadsRes, dashboardsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('upload_sessions').select('id, file_name, row_count, column_count, quality_score, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('dashboard_configs').select('id, name, file_name, created_at, is_public').order('created_at', { ascending: false }).limit(50),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (uploadsRes.data) setUploads(uploadsRes.data);
      if (dashboardsRes.data) setDashboards(dashboardsRes.data);
    } catch (e) {
      console.error('Admin load error:', e);
    }
    setLoading(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!user) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Tizimga kiring</p>
          <p className="text-sm mt-1">Admin panelga kirish uchun autentifikatsiya kerak</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Foydalanuvchilar', value: profiles.length, icon: Users, color: 'text-primary' },
          { label: 'Datasetlar', value: uploads.length, icon: Database, color: 'text-accent' },
          { label: 'Dashboardlar', value: dashboards.length, icon: Activity, color: 'text-warning' },
          { label: 'Public', value: dashboards.filter(d => d.is_public).length, icon: FileText, color: 'text-primary' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="text-xs"><Users className="w-3 h-3 mr-1" /> Foydalanuvchilar</TabsTrigger>
          <TabsTrigger value="datasets" className="text-xs"><Database className="w-3 h-3 mr-1" /> Datasetlar</TabsTrigger>
          <TabsTrigger value="dashboards" className="text-xs"><Activity className="w-3 h-3 mr-1" /> Dashboardlar</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="overflow-x-auto pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 px-3 text-left font-medium">Ism</th>
                    <th className="py-2 px-3 text-left font-medium">Email</th>
                    <th className="py-2 px-3 text-left font-medium">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 px-3 text-foreground">{p.full_name || '—'}</td>
                      <td className="py-2 px-3 text-muted-foreground">{p.email || '—'}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Hech narsa topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets">
          <Card>
            <CardContent className="overflow-x-auto pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 px-3 text-left font-medium">Fayl</th>
                    <th className="py-2 px-3 text-left font-medium">Qatorlar</th>
                    <th className="py-2 px-3 text-left font-medium">Ustunlar</th>
                    <th className="py-2 px-3 text-left font-medium">Sifat</th>
                    <th className="py-2 px-3 text-left font-medium">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 px-3 text-foreground font-medium">{u.file_name}</td>
                      <td className="py-2 px-3 data-font text-foreground">{u.row_count.toLocaleString()}</td>
                      <td className="py-2 px-3 data-font text-foreground">{u.column_count}</td>
                      <td className="py-2 px-3">
                        <Badge variant={u.quality_score > 80 ? 'default' : 'secondary'} className="text-xs">
                          {u.quality_score}%
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                  {uploads.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Hech narsa topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboards">
          <Card>
            <CardContent className="overflow-x-auto pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 px-3 text-left font-medium">Nom</th>
                    <th className="py-2 px-3 text-left font-medium">Fayl</th>
                    <th className="py-2 px-3 text-left font-medium">Status</th>
                    <th className="py-2 px-3 text-left font-medium">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboards.map(d => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 px-3 text-foreground font-medium">{d.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{d.file_name || '—'}</td>
                      <td className="py-2 px-3">
                        <Badge variant={d.is_public ? 'default' : 'outline'} className="text-xs">
                          {d.is_public ? 'Public' : 'Private'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(d.created_at)}</td>
                    </tr>
                  ))}
                  {dashboards.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Hech narsa topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
