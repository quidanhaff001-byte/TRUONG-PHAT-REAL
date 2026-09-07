import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { Request, Response, NextFunction } from 'express';
import { sanitizeFirestoreData } from '../../src/utils/firestoreSanitizer';

let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;
let adminConfigured = false;

function normalizePrivateKey(rawKey: string): string {
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n');
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        key = decoded.replace(/\\n/g, '\n');
      }
    } catch {}
  }
  return key;
}

export function initFirebaseAdmin(): { app: App | null; auth: Auth | null; db: Firestore | null; isConfigured: boolean } {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminAuthInstance = getAuth(adminApp);
    adminDbInstance = getFirestore(adminApp);
    return { app: adminApp, auth: adminAuthInstance, db: adminDbInstance, isConfigured: adminConfigured };
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'airy-cogency-503707-p1';

  let credential: any = undefined;

  const rawServiceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_CREDENTIAL ||
    process.env.FIREBASE_CONFIG_JSON;

  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL;

  const rawPrivateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;

  if (rawServiceAccount) {
    try {
      const trimmed = rawServiceAccount.trim();
      const parsed = trimmed.startsWith('{')
        ? JSON.parse(trimmed)
        : JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
      credential = cert(parsed);
      adminConfigured = true;
    } catch (e: any) {
      console.warn('[firebaseAdmin] Warning parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e.message);
    }
  } else if (clientEmail && rawPrivateKey) {
    try {
      const privateKey = normalizePrivateKey(rawPrivateKey);
      credential = cert({
        projectId,
        clientEmail: clientEmail.trim(),
        privateKey,
      });
      adminConfigured = true;
    } catch (e: any) {
      console.warn('[firebaseAdmin] Warning loading cert from clientEmail & privateKey:', e.message);
    }
  }

  try {
    adminApp = initializeApp({
      projectId,
      ...(credential ? { credential } : {}),
    });
    adminAuthInstance = getAuth(adminApp);
    adminDbInstance = getFirestore(adminApp);
    if (!credential) {
      // In cloud without cert, might work with ADC or be unconfigured
      adminConfigured = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE);
    }
    console.log('[firebaseAdmin] Firebase Admin initialized with project:', projectId, 'configured:', adminConfigured);
  } catch (err: any) {
    console.warn('[firebaseAdmin] Firebase Admin init error:', err.message);
  }

  return { app: adminApp, auth: adminAuthInstance, db: adminDbInstance, isConfigured: adminConfigured };
}

export function isAdminConfigured(): boolean {
  if (!adminApp) {
    initFirebaseAdmin();
  }
  return adminConfigured;
}

export function getAdminAuth(): Auth | null {
  if (!adminAuthInstance) {
    const init = initFirebaseAdmin();
    adminAuthInstance = init.auth;
  }
  return adminAuthInstance;
}

export function getAdminDb(): Firestore | null {
  if (!adminDbInstance) {
    const init = initFirebaseAdmin();
    adminDbInstance = init.db;
  }
  return adminDbInstance;
}

export { FieldValue };
export type { DecodedIdToken, UserRecord };

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: {
    uid: string;
    email?: string;
    name?: string;
    role?: string;
  };
}

export async function requireAdmin(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Yêu cầu không có mã xác thực (Token). Vui lòng đăng nhập lại.',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  const authInst = getAdminAuth();
  const dbInst = getAdminDb();

  if (!authInst) {
    // Development or fallback
    req.adminUser = {
      uid: 'admin_dev',
      email: 'quidanh.aff001@gmail.com',
      role: 'ADMIN',
    };
    return next();
  }

  try {
    const decoded: DecodedIdToken = await authInst.verifyIdToken(token);
    let role = (decoded.role as string) || (decoded.admin ? 'ADMIN' : '');

    if (!role && dbInst) {
      const userSnap = await dbInst.collection('users').doc(decoded.uid).get();
      if (userSnap.exists) {
        role = userSnap.data()?.role || '';
      }
    }

    const isRootAdmin = decoded.email === 'quidanh.aff001@gmail.com';
    if (!isRootAdmin && role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'Bạn không có quyền quản trị viên (ADMIN) để thực hiện thao tác này.',
      });
      return;
    }

    req.adminUser = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email,
      role: 'ADMIN',
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      errorCode: 'TOKEN_INVALID',
      message: 'Phiên đăng nhập đã hết hạn hoặc mã xác thực không hợp lệ.',
    });
  }
}
