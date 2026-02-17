/**
 * Enterprise Analytics Studio — Security & Governance
 * RBAC, audit logs, credential storage notes
 */

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface AuditAction {
  type: 'model_change' | 'dataset_publish' | 'report_embed' | 'export' | 'login' | 'config_change';
  userId?: string;
  resourceId?: string;
  resourceType?: 'dataset' | 'report' | 'workspace';
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface RLSContext {
  userId?: string;
  roles?: string[];
  region?: string;
  department?: string;
}

/** Placeholder: In production, persist to Supabase audit_logs table */
export function logAudit(action: Omit<AuditAction, 'timestamp'>): void {
  const entry: AuditAction = {
    ...action,
    timestamp: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    console.debug('[Audit]', entry);
    // await supabase.from('audit_logs').insert(entry);
  }
}
