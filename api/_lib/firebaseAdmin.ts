import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { Request, Response, NextFunction } from 'express';
import { sanitizeFirestoreData } from '../../src/utils/firestoreSanitizer';

let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;

export function initFirebaseAdmin(): { app: App | null; auth: Auth | null; db: Firestore | null } {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminAuthInstance = getAuth(adminApp);
    adminDbInstance = getFirestore(adminApp);
    return { app: adminApp, auth: adminAuthInstance, db: adminDbInstance };
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

  if (rawServiceAccount) {
    try {
      const trimmed = rawServiceAccount.trim();
      const parsed = trimmed.startsWith('{')
        ? JSON.parse(trimmed)
        : JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
      credential = cert(parsed);
    } catch (e: any) {
      console.warn('[firebaseAdmin] Lỗi đọc FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    }
  } else if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    try {
      credential = cert({
        projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } catch (e: any) {
      console.warn('[firebaseAdmin] Lỗi nạp cert từ FIREBASE_ADMIN_PRIVATE_KEY:', e.message);
    }
  }

  try {
    adminApp = initializeApp({
      projectId,
      ...(credential ? { credential } : {}),
    });
    adminAuthInstance = getAuth(adminApp);
    adminDbInstance = getFirestore(adminApp);
    console.log('[firebaseAdmin] Khởi tạo Firebase Admin thành công với project:', projectId);
  } catch (err: any) {
    console.warn('[firebaseAdmin] Khởi tạo Firebase Admin cảnh báo:', err.message);
  }

  return { app: adminApp, auth: adminAuthInstance, db: adminDbInstance };
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
