import { auth, db } from '../config/firebase';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { sanitizeFirestoreData } from '../utils/firestoreSanitizer';

export interface AuditLogPayload {
  id?: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  requestId?: string | null;
  createdAt?: any;

  // Backward compatibility fields for UI views
  module?: string;
  description?: string;
  details?: string;
  recordId?: string;
  recordCode?: string;
  recordName?: string;
  teamId?: string | null;
  level?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  timestamp?: string;
  newData?: any;
  oldData?: any;
}

export async function sendAuditLogToBackend(input: AuditLogPayload): Promise<boolean> {
  const endpoint = '/api/audit-log';
  const now = new Date().toISOString();
  const currentActorUid = auth.currentUser?.uid || input.actorUid || input.userId || 'anonymous';
  const currentActorEmail = auth.currentUser?.email || input.actorEmail || input.userEmail || '';
  const currentActorRole = input.actorRole || input.userRole || 'AGENT';

  const entityType = input.entityType || input.module || 'SYSTEM';
  const entityId = input.entityId || input.recordId || '';

  const standardized = sanitizeFirestoreData({
    ...input,
    actorUid: currentActorUid,
    actorEmail: currentActorEmail,
    actorRole: currentActorRole,
    entityType,
    entityId,
    before: input.before || input.oldData || null,
    after: input.after || input.newData || null,
    requestId: input.requestId || null,

    // UI compatibility
    userId: currentActorUid,
    userEmail: currentActorEmail,
    userName: input.userName || auth.currentUser?.displayName || 'Người dùng',
    userRole: currentActorRole,
    module: entityType,
    description: input.description || `${input.action} trên ${entityType}`,
    timestamp: now,
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
        console.warn('Không thể lấy auth token cho audit log:', tokenErr);
      }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(standardized),
    });

    if (res.ok) {
      return true;
    }

    // Direct Firestore write fallback
    const logId = input.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      ...standardized,
      id: logId,
      createdAt: serverTimestamp(),
      timestamp: now,
    });
    return true;
  } catch (err) {
    try {
      const logId = input.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'auditLogs', logId), {
        ...standardized,
        id: logId,
        createdAt: serverTimestamp(),
        timestamp: now,
      });
      return true;
    } catch (fsErr) {
      console.warn('[AuditLog Service] Không thể ghi Audit Log trực tiếp:', fsErr);
      return false;
    }
  }
}
