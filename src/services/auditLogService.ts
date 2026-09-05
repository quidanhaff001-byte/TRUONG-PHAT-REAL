import { auth, db } from '../config/firebase';
import { setDoc, doc } from 'firebase/firestore';
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
  const payload = cleanUndefined({
    ...log,
    teamId: log.teamId || null,
    userId: log.userId || auth.currentUser?.uid || 'anonymous',
    userEmail: log.userEmail || auth.currentUser?.email || '',
    userName: log.userName || auth.currentUser?.displayName || 'Người dùng',
  });

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

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return true;
    }

    // Direct Firestore write fallback if backend response was not ok
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      ...payload,
      id: logId,
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'auditLogs', logId), {
        ...payload,
        id: logId,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (fsErr) {
      console.warn('[AuditLog Service] Backend and Firestore recording notice:', fsErr);
      return false;
    }
  }
}
