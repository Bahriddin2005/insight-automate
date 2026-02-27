import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Plus, Trash2, RefreshCw, Eye, Loader2, CheckCircle2, XCircle, Shield, Play } from 'lucide-react';
import PlatformLayout from '@/components/layout/PlatformLayout';
import TableauViz from '@/components/tableau/TableauViz';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';

interface TableauVizRecord {
  id: string;
  name: string;
  viz_url: string;
  project: string;
  tags: string[];
  allowed_roles: string[];
  description: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface RefreshLog {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  triggered_by: string;
}

export default function TableauDashboards() {
  const { user } = useAuth();
  const [vizzes, setVizzes] = useState<TableauVizRecord[]>([]);
  const [logs, setLogs] = useState<RefreshLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViz, setSelectedViz] = useState<TableauVizRecord | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshForm, setRefreshForm] = useState({ resource_type: 'workbook', resource_id: '', resource_name: '' });
  const [form, setForm] = useState({ name: '', viz_url: '', project: '', description: '', tags: '', allowed_roles: '' });
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [vizRes, logRes, rolesRes] = await Promise.all([
      supabase.from('tableau_vizzes').select('*').order('created_at', { ascending: false }),
      supabase.from('tableau_refresh_logs').select('*').order('started_at', { ascending: false }).limit(50),
      user ? supabase.from('user_roles').select('role').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);
    if (vizRes.data) setVizzes(vizRes.data as unknown as TableauVizRecord[]);
    if (logRes.data) setLogs(logRes.data as unknown as RefreshLog[]);
    if (rolesRes.data) setUserRoles((rolesRes.data as any[]).map(r => r.role));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const isAdmin = userRoles.includes('admin');

  const handleAdd = async () => {
    if (!user || !form.name || !form.viz_url) return;
    const { error } = await supabase.from('tableau_vizzes').insert({
      name: form.name,
      viz_url: form.viz_url,
      project: form.project,
      description: form.description,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      allowed_roles: form.allowed_roles.split(',').map(t => t.trim()).filter(Boolean),
      created_by: user.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Dashboard qo\'shildi');
    setForm({ name: '', viz_url: '', project: '', description: '', tags: '', allowed_roles: '' });
    setShowAddDialog(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('tableau_vizzes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('O\'chirildi');
    if (selectedViz?.id === id) setSelectedViz(null);
    loadData();
  };

  const handleToggleActive = async (viz: TableauVizRecord) => {
    await supabase.from('tableau_vizzes').update({ is_active: !viz.is_active } as any).eq('id', viz.id);
    loadData();
  };

  const handleRefresh = async () => {
    if (!refreshForm.resource_id) { toast.error('Resource ID kiriting'); return; }
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tableau-refresh', {
        body: refreshForm,
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Refresh boshlandi! Job ID: ${data.job_id}`);
      setShowRefreshDialog(false);
      setRefreshForm({ resource_type: 'workbook', resource_id: '', resource_name: '' });
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Refresh xatolik');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('uz-UZ');

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Tableau Dashboards
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Embed & manage Tableau dashboards with SSO + RLS
              {userRoles.length > 0 && (
                <span className="ml-2">
                  {userRoles.map(r => (
                    <Badge key={r} variant="outline" className="text-[10px] ml-1">
                      <Shield className="w-3 h-3 mr-0.5" />{r}
                    </Badge>
                  ))}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Refresh trigger dialog */}
            <Dialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Data Refresh Trigger</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Resurs turi</Label>
                    <Select value={refreshForm.resource_type} onValueChange={v => setRefreshForm(f => ({ ...f, resource_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workbook">Workbook</SelectItem>
                        <SelectItem value="datasource">Datasource</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Resource ID</Label>
                    <Input value={refreshForm.resource_id} onChange={e => setRefreshForm(f => ({ ...f, resource_id: e.target.value }))} placeholder="Tableau workbook/datasource ID" />
                    <p className="text-[11px] text-muted-foreground mt-1">Tableau Server/Cloud dan oling: Settings → ID</p>
                  </div>
                  <div>
                    <Label>Nomi (ixtiyoriy)</Label>
                    <Input value={refreshForm.resource_name} onChange={e => setRefreshForm(f => ({ ...f, resource_name: e.target.value }))} placeholder="Sales Workbook" />
                  </div>
                  <Button onClick={handleRefresh} disabled={refreshing} className="w-full">
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    Refresh boshlash
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add viz dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Qo'shish</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yangi Tableau Dashboard</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nomi</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sales Dashboard" /></div>
                  <div><Label>Viz URL</Label><Input value={form.viz_url} onChange={e => setForm(f => ({ ...f, viz_url: e.target.value }))} placeholder="https://10ax.online.tableau.com/..." /></div>
                  <div><Label>Loyiha</Label><Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="Marketing" /></div>
                  <div><Label>Tavsif</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div><Label>Teglar (vergul bilan)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="sales, monthly, KPI" /></div>
                  <div>
                    <Label>Ruxsat etilgan rollar (vergul bilan, bo'sh = hammaga)</Label>
                    <Input value={form.allowed_roles} onChange={e => setForm(f => ({ ...f, allowed_roles: e.target.value }))} placeholder="admin, moderator" />
                    <p className="text-[11px] text-muted-foreground mt-1">Bo'sh qoldirsangiz barcha foydalanuvchilar ko'ra oladi</p>
                  </div>
                  <Button onClick={handleAdd} className="w-full">Saqlash</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <Tabs defaultValue="dashboards">
          <TabsList>
            <TabsTrigger value="dashboards">Dashboardlar</TabsTrigger>
            <TabsTrigger value="logs">Refresh Logs ({logs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboards" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : vizzes.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Hali dashboard qo'shilmagan</p>
                <p className="text-xs mt-1">Sizning rolingizga mos dashboardlar yo'q yoki hali qo'shilmagan</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Birinchi dashboardni qo'shing
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vizzes.map(viz => (
                    <Card
                      key={viz.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedViz?.id === viz.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedViz(viz)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{viz.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{viz.project || 'No project'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleToggleActive(viz); }}>
                            {viz.is_active ? <Eye className="w-3.5 h-3.5 text-primary" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(viz.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {viz.tags?.map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                        {viz.allowed_roles?.length > 0 && viz.allowed_roles.map(role => (
                          <Badge key={role} variant="outline" className="text-[10px]">
                            <Shield className="w-2.5 h-2.5 mr-0.5" />{role}
                          </Badge>
                        ))}
                      </div>
                      {!viz.is_active && <Badge variant="outline" className="mt-2 text-[10px]">Nofaol</Badge>}
                    </Card>
                  ))}
                </div>

                {selectedViz && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="font-semibold text-foreground">{selectedViz.name}</h2>
                      {selectedViz.description && <span className="text-xs text-muted-foreground">— {selectedViz.description}</span>}
                    </div>
                    <TableauViz vizUrl={selectedViz.viz_url} toolbar="bottom" device="default" height="700px" />
                  </motion.div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Yangilash</Button>
            </div>
            {logs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">Hali refresh log yo'q</Card>
            ) : (
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="p-3">Resurs</th><th className="p-3">Turi</th><th className="p-3">Status</th>
                    <th className="p-3">Boshlangan</th><th className="p-3">Tugallangan</th><th className="p-3">Xatolik</th>
                  </tr></thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{log.resource_name || log.resource_id}</td>
                        <td className="p-3"><Badge variant="secondary" className="text-[10px]">{log.resource_type}</Badge></td>
                        <td className="p-3">
                          {log.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-primary" /> :
                           log.status === 'error' ? <XCircle className="w-4 h-4 text-destructive" /> :
                           <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(log.started_at)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{log.finished_at ? formatDate(log.finished_at) : '—'}</td>
                        <td className="p-3 text-xs text-destructive max-w-[200px] truncate">{log.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PlatformLayout>
  );
}
