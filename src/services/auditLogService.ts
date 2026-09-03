import { auth } from '../config/firebase';
import { cleanUndefined } from '../utils/firestoreSanitizer';

export interface BackendAuditLogInput {
  action: string;
  module: string;
  description: string;
  details?: string;
  recordId?: string;
  recordCode?: string;
  recordName?: string;
  teamId?: string | null;
  targetUserId?: string;
  targetUserName?: string;
  beforeData?: any;
  afterData?: any;
  level?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export async function sendAuditLogToBackend(log: BackendAuditLogInput): Promise<boolean> {
  const endpoint = '/api/audit-log';
  try {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(false);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (tokenErr) {
        console.warn('Could not get auth token for audit log:', tokenErr);
      }
    }

    const payload = cleanUndefined({
      ...log,
      teamId: log.teamId || null,
      userId: log.userId || auth.currentUser?.uid || 'anonymous',
      userEmail: log.userEmail || auth.currentUser?.email || '',
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.warn('[AuditLog Service] Backend audit log recording error:', err);
    return false;
  }
}
