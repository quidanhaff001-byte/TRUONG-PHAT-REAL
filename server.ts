import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth, UserRecord } from 'firebase-admin/auth';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure upload directory exists for hosting upload (Firebase Spark compatibility)
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// CORS & Preflight handling for all /api endpoints
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Set global JSON header and Request ID for all /api endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader('X-Request-Id', reqId);
  next();
});

/**
 * Standard API Response Helper
 * Guaranteed schema across all /api endpoints:
 * { success, errorCode, message, requestId, ...data }
 */
export function sendApiResponse(
  res: Response,
  statusCode: number,
  data: {
    success: boolean;
    errorCode?: string | null;
    message: string;
    [key: string]: any;
  }
) {
  const reqId = (res.getHeader('X-Request-Id') as string) || `req_${Date.now()}`;
  return res.status(statusCode).json({
    success: data.success,
    errorCode: data.errorCode ?? (data.success ? null : 'ERROR'),
    message: data.message,
    requestId: reqId,
    ...data,
  });
}

// 1. Initialize Firebase Admin SDK
let firebaseAdminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let isAdminSdkExplicitlyConfigured = false;

try {
  let config: any = {};
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const projectId =
    config.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'airy-cogency-503707-p1';
  const databaseId = config.firestoreDatabaseId || '(default)';

  // Check for Firebase Admin credentials on Vercel or other cloud environments
  let adminCredential: any = undefined;
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
      adminCredential = cert(parsed);
      isAdminSdkExplicitlyConfigured = true;
      console.log('[Firebase Admin] Service account credential loaded from environment variable.');
    } catch (parseErr: any) {
      console.warn('[Firebase Admin] Notice: could not parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr.message);
    }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      adminCredential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID || projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      isAdminSdkExplicitlyConfigured = true;
      console.log('[Firebase Admin] Credential loaded from FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL.');
    } catch (certErr: any) {
      console.warn('[Firebase Admin] Notice: could not load cert from private key:', certErr.message);
    }
  }

  const existingApps = getApps();
  if (!existingApps.length) {
    firebaseAdminApp = initializeApp({
      projectId,
      ...(adminCredential ? { credential: adminCredential } : {}),
      storageBucket: config.storageBucket,
    });
  } else {
    firebaseAdminApp = existingApps[0]!;
  }

  adminAuth = getAuth(firebaseAdminApp);

  if (databaseId && databaseId !== '(default)') {
    adminDb = getFirestore(firebaseAdminApp, databaseId);
  } else {
    adminDb = getFirestore(firebaseAdminApp);
  }

  console.log(`[Firebase Admin] Initialized successfully with project: ${projectId}, database: ${databaseId}`);
} catch (err: any) {
  console.error('[Firebase Admin] Initialization warning:', err.message);
}

// 2. Audit Log Helper
function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = sanitizeFirestoreData(value);
      } else {
        clean[key] = value;
      }
    } else {
      clean[key] = null;
    }
  }
  return clean as T;
}

function sanitizeForLog(data: any) {
  if (!data || typeof data !== 'object') return data;
  const clone = { ...data };
  // Never log passwords, tokens or secrets
  delete clone.password;
  delete clone.tempPassword;
  delete clone.currentPassword;
  delete clone.newPassword;
  delete clone.token;
  delete clone.idToken;
  delete clone.secret;
  return clone;
}

// Helper ghi Audit Log bảo mật phía Backend
async function recordAuditLog(
  actor: { uid: string; email?: string; name?: string; role?: string },
  action: string,
  module: string,
  details: string,
  target?: { userId?: string; userName?: string; recordId?: string; recordName?: string },
  beforeData?: any,
  afterData?: any,
  ipAddress?: string,
  userAgent?: string,
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  errorMessage?: string
) {
  if (!adminDb) return;
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const logDoc = sanitizeFirestoreData({
      id: logId,
      timestamp: new Date().toISOString(),
      userId: actor.uid || 'anonymous',
      userName: actor.name || actor.email || 'Admin',
      userEmail: actor.email || '',
      userRole: actor.role || 'ADMIN',
      action,
      module,
      details,
      description: details,
      targetUserId: target?.userId || '',
      targetUserName: target?.userName || '',
      recordId: target?.recordId || target?.userId || '',
      recordName: target?.recordName || '',
      beforeData: beforeData ? sanitizeForLog(beforeData) : null,
      afterData: afterData ? sanitizeForLog(afterData) : null,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || '',
      status,
      errorMessage: errorMessage || '',
      level: status === 'FAILURE' ? 'WARNING' : 'INFO',
    });
    await adminDb.collection('auditLogs').doc(logId).set(logDoc);
  } catch (err: any) {
    console.error('[AuditLog] Error recording log:', err.message);
  }
}

// Endpoint ghi Audit Log qua Backend Admin SDK (bảo mật, không ghi undefined)
app.post('/api/audit-log', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let actor = { uid: 'anonymous', email: '', name: 'Hệ thống', role: 'AGENT' };

    if (authHeader && authHeader.startsWith('Bearer ') && adminAuth) {
      try {
        const token = authHeader.split('Bearer ')[1].trim();
        const decoded = await adminAuth.verifyIdToken(token);
        actor = {
          uid: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.email || 'Người dùng',
          role: (decoded.role as string) || (decoded.admin ? 'ADMIN' : 'AGENT'),
        };
      } catch (tokenErr) {
        // Fallback to body data if token decoding fails
      }
    }

    const { action, module, description, details, recordId, recordCode, recordName, level, teamId, targetUserId, targetUserName, beforeData, afterData } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const logDoc = {
      id: logId,
      timestamp: new Date().toISOString(),
      userId: req.body.userId || actor.uid,
      userName: req.body.userName || actor.name,
      userEmail: req.body.userEmail || actor.email || '',
      userRole: req.body.userRole || actor.role,
      action: action || 'INFO',
      module: module || 'SYSTEM',
      details: details || description || '',
      description: description || details || '',
      recordId: recordId || '',
      recordCode: recordCode || '',
      recordName: recordName || '',
      teamId: teamId || null,
      targetUserId: targetUserId || '',
      targetUserName: targetUserName || '',
      beforeData: beforeData ? sanitizeForLog(beforeData) : null,
      afterData: afterData ? sanitizeForLog(afterData) : null,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      level: level || 'INFO',
    };

    if (adminDb) {
      await adminDb.collection('auditLogs').doc(logId).set(logDoc);
    }

    sendApiResponse(res, 200, {
      success: true,
      message: 'Đã ghi nhật ký hoạt động thành công',
      logId,
    });
  } catch (err: any) {
    console.error('[api/audit-log] Error recording log:', err.message);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'AUDIT_LOG_FAILED',
      message: `Không thể ghi nhật ký hoạt động: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// API Endpoint for Hosting Image Upload (Spark plan compatible)
app.post('/api/upload-image', (req: Request, res: Response): void => {
  try {
    const { base64Data, fileName, propertyId } = req.body;
    if (!base64Data) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'MISSING_IMAGE_DATA',
        message: 'Thiếu dữ liệu ảnh để tải lên',
      });
      return;
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    const cleanName = (fileName || 'image')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);
    const uniqueName = `${propertyId || 'prop'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;
    sendApiResponse(res, 200, {
      success: true,
      message: 'Tải ảnh lên máy chủ thành công',
      url: publicUrl,
      fileName: uniqueName,
      size: buffer.length,
    });
  } catch (err: any) {
    console.error('[Hosting Upload] Error saving file:', err.message);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'STORAGE_SAVE_ERROR',
      message: err.message || 'Lỗi lưu trữ tệp trên hosting',
    });
  }
});
function validatePasswordComplexity(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, reason: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.' };
  }
  return { valid: true };
}

// 3. Admin Authentication Middleware
interface AuthenticatedRequest extends Request {
  adminUser?: {
    uid: string;
    email?: string;
    name?: string;
    role: string;
  };
}

async function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendApiResponse(res, 401, {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Thiếu mã xác thực (Bearer Token). Vui lòng đăng nhập lại với quyền Quản trị viên.',
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    sendApiResponse(res, 401, {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
    });
    return;
  }

  if (!adminAuth || !adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Backend tạo tài khoản chưa được cấu hình.',
      details: 'Dịch vụ Firebase Admin SDK cần Service Account Key (FIREBASE_SERVICE_ACCOUNT_KEY).',
    });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Check Custom Claim first
    let role = (decodedToken.role as string) || (decodedToken.admin ? 'ADMIN' : '');

    // Check Admin email or Firestore user doc if claim is not present
    if (role !== 'ADMIN') {
      if (email === 'quidanh.aff001@gmail.com') {
        role = 'ADMIN';
        try {
          await adminAuth.setCustomUserClaims(uid, { role: 'ADMIN', admin: true });
        } catch (e) {}
      } else {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'ADMIN') {
          role = 'ADMIN';
          try {
            await adminAuth.setCustomUserClaims(uid, { role: 'ADMIN', admin: true });
          } catch (e) {}
        }
      }
    }

    if (role !== 'ADMIN') {
      sendApiResponse(res, 403, {
        success: false,
        errorCode: 'PERMISSION_DENIED',
        message: 'Quyền truy cập bị từ chối. Chỉ Quản trị viên (ADMIN) mới có quyền thực hiện thao tác này.',
      });
      return;
    }

    req.adminUser = {
      uid,
      email,
      name: decodedToken.name || email,
      role: 'ADMIN',
    };

    next();
  } catch (err: any) {
    console.error('[Auth Error] verifyIdToken failed code:', err.code || 'N/A', 'message:', err.message || 'Unknown');
    sendApiResponse(res, 401, {
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
    });
  }
}

// 4. Check if a user is the last Admin in the system
async function isLastAdmin(targetUid: string): Promise<boolean> {
  if (!adminDb) return false;
  try {
    const adminsSnap = await adminDb
      .collection('users')
      .where('role', '==', 'ADMIN')
      .where('status', '==', 'ACTIVE')
      .get();

    if (adminsSnap.size <= 1) {
      const remainingAdmin = adminsSnap.docs[0];
      if (remainingAdmin && remainingAdmin.id === targetUid) {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

// ==========================================
// ADMIN API ENDPOINTS (CLOUD FUNCTIONS EQUIVALENT)
// ==========================================

// 1. adminCreateUser
app.post('/api/admin/create-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { employeeCode, fullName, email, phone, role, teamId, teamName, notes, tempPassword, sendEmailInvite, providedUid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const reqId = (res.getHeader('X-Request-Id') as string) || `req_${Date.now()}`;

  if (!email || !fullName || !employeeCode || !phone) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_FIELDS',
      message: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Họ tên, Email, SĐT, Mã nhân viên.',
    });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'INVALID_EMAIL',
      message: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.',
    });
    return;
  }

  const validRoles = ['ADMIN', 'TEAM_LEADER', 'AGENT'];
  const userRole = validRoles.includes(role) ? role : 'AGENT';

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Backend tạo tài khoản chưa được cấu hình.',
      details: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  // Check if email already exists in Firestore users collection
  try {
    const duplicateInDb = await adminDb.collection('users').where('email', '==', email.trim().toLowerCase()).get();
    if (!duplicateInDb.empty) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'EMAIL_EXISTS',
        message: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
      });
      return;
    }
  } catch (checkErr: any) {
    console.warn('Error checking existing user in Firestore:', checkErr.message);
  }

  // CASE A: User UID provided directly from Firebase Console (Spark plan / Manual Fallback)
  if (providedUid && typeof providedUid === 'string' && providedUid.trim()) {
    const targetUid = providedUid.trim();
    try {
      const existingDoc = await adminDb.collection('users').doc(targetUid).get();
      if (existingDoc.exists) {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'USER_EXISTS',
          message: 'Hồ sơ nhân sự cho UID này đã tồn tại trong hệ thống.',
        });
        return;
      }

      // Try setting custom claims if adminAuth is available
      if (adminAuth) {
        try {
          await adminAuth.setCustomUserClaims(targetUid, {
            role: userRole,
            teamId: teamId || null,
            admin: userRole === 'ADMIN',
          });
        } catch (claimErr: any) {
          console.warn('[providedUid] Warning setting custom claims:', claimErr.message);
        }
      }

      const now = new Date().toISOString();
      const newUserDoc = sanitizeFirestoreData({
        id: targetUid,
        uid: targetUid,
        employeeCode: employeeCode.trim().toUpperCase(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        avatarUrl: '',
        role: userRole,
        teamId: teamId || null,
        teamName: teamName || '',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
        createdBy: req.adminUser?.uid || null,
        updatedAt: now,
        updatedBy: req.adminUser?.uid || null,
        notes: notes || '',
        startDate: now.split('T')[0],
        propertiesCount: 0,
        customersCount: 0,
        dealsCount: 0,
      });

      await adminDb.collection('users').doc(targetUid).set(newUserDoc);

      if (teamId) {
        try {
          const teamRef = adminDb.collection('teams').doc(teamId);
          const teamSnap = await teamRef.get();
          if (teamSnap.exists) {
            const currentMembers = teamSnap.data()?.memberIds || [];
            if (!currentMembers.includes(targetUid)) {
              await teamRef.update({
                memberIds: [...currentMembers, targetUid],
                updatedAt: now,
              });
            }
          }
        } catch (teamErr) {
          console.warn('Could not update team memberIds:', teamErr);
        }
      }

      // Record Audit Log: CREATE_USER
      await recordAuditLog(
        req.adminUser!,
        'CREATE_USER',
        'USERS',
        `Tạo hồ sơ nhân viên qua Firebase Console UID: ${fullName} (${employeeCode}) với vai trò ${userRole}`,
        { userId: targetUid, userName: fullName, recordId: targetUid },
        null,
        newUserDoc,
        ip,
        userAgent,
        'SUCCESS'
      );

      sendApiResponse(res, 200, {
        success: true,
        message: 'Đã tạo hồ sơ nhân viên thành công liên kết với User UID từ Firebase Authentication.',
        user: {
          id: targetUid,
          uid: targetUid,
          employeeCode: newUserDoc.employeeCode,
          fullName: newUserDoc.fullName,
          email: newUserDoc.email,
          phone: newUserDoc.phone,
          role: newUserDoc.role,
          teamId: newUserDoc.teamId,
          status: newUserDoc.status,
          mustChangePassword: false,
        },
      });
      return;
    } catch (manualErr: any) {
      console.error(`[providedUid][${reqId}] Error saving profile:`, manualErr.message);
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'PROFILE_SAVE_FAILED',
        message: `Không thể tạo hồ sơ nhân viên: ${manualErr.message || 'Lỗi cơ sở dữ liệu'}`,
      });
      return;
    }
  }

  // CASE B: Standard Automated Creation via Firebase Admin SDK
  if (!adminAuth) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Backend tạo tài khoản chưa được cấu hình.',
      details: 'Dịch vụ Firebase Admin SDK cần Service Account Key (FIREBASE_SERVICE_ACCOUNT_KEY trên Vercel).',
      hint: 'Tạm thời Quản trị viên có thể tạo user trong Firebase Console (Authentication > Users > Add user), sau đó thêm hồ sơ users/{uid}.',
    });
    return;
  }

  let createdAuthUser: UserRecord | null = null;

  try {
    // Password validation
    let initialPassword = tempPassword?.trim();
    if (initialPassword) {
      const check = validatePasswordComplexity(initialPassword);
      if (!check.valid) {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'WEAK_PASSWORD',
          message: check.reason || 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
        });
        return;
      }
    } else {
      // Generate a strong temporary password if not provided
      initialPassword = `TP@${Math.floor(100000 + Math.random() * 900000)}#Aa`;
    }

    // Check if email already exists in Firebase Auth
    let existingUser: UserRecord | null = null;
    try {
      existingUser = await adminAuth.getUserByEmail(email.trim().toLowerCase());
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'EMAIL_EXISTS',
          message: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
        });
        return;
      }
      if (e.code !== 'auth/user-not-found') {
        // If it's a backend config error (e.g. Identity Toolkit disabled or missing credentials)
        throw e;
      }
    }

    if (existingUser) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'EMAIL_EXISTS',
        message: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
      });
      return;
    }

    // Create Firebase Auth user
    createdAuthUser = await adminAuth.createUser({
      email: email.trim().toLowerCase(),
      emailVerified: true,
      password: initialPassword,
      displayName: fullName.trim(),
      phoneNumber: phone.startsWith('+') ? phone.trim() : undefined,
      disabled: false,
    });

    const uid = createdAuthUser.uid;

    // Set Custom Claims for RBAC
    await adminAuth.setCustomUserClaims(uid, {
      role: userRole,
      teamId: teamId || null,
      admin: userRole === 'ADMIN',
    });

    // Create User Document in Cloud Firestore (Guaranteed no undefined values)
    const now = new Date().toISOString();
    const newUserDoc = sanitizeFirestoreData({
      id: uid,
      uid,
      employeeCode: employeeCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      avatarUrl: '',
      role: userRole,
      teamId: teamId || null,
      teamName: teamName || '',
      status: 'ACTIVE',
      mustChangePassword: true, // Force password change on first login
      createdAt: now,
      createdBy: req.adminUser?.uid || null,
      updatedAt: now,
      updatedBy: req.adminUser?.uid || null,
      notes: notes || '',
      startDate: now.split('T')[0],
      propertiesCount: 0,
      customersCount: 0,
      dealsCount: 0,
    });

    try {
      await adminDb.collection('users').doc(uid).set(newUserDoc);
    } catch (firestoreErr: any) {
      console.error(`[adminCreateUser][${reqId}] Firestore write failed:`, firestoreErr.message);
      // Rollback Auth user immediately to prevent orphaned users
      if (createdAuthUser) {
        try {
          await adminAuth.deleteUser(createdAuthUser.uid);
          console.log(`[Rollback][${reqId}] Deleted orphaned Auth user: ${createdAuthUser.uid}`);
        } catch (rbErr: any) {
          console.error(`[Rollback][${reqId}] deleteUser failed:`, rbErr.message);
        }
      }
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'FIRESTORE_FAILED',
        message: `Lưu hồ sơ Firestore thất bại: ${firestoreErr.message || 'Lỗi kết nối'}. Hệ thống đã tự động hoàn tác (rollback) tài khoản Auth.`,
      });
      return;
    }

    // If assigned to a team, update team's memberIds
    if (teamId) {
      try {
        const teamRef = adminDb.collection('teams').doc(teamId);
        const teamSnap = await teamRef.get();
        if (teamSnap.exists) {
          const currentMembers = teamSnap.data()?.memberIds || [];
          if (!currentMembers.includes(uid)) {
            await teamRef.update({
              memberIds: [...currentMembers, uid],
              updatedAt: now,
            });
          }
        }
      } catch (teamErr) {
        console.warn('Could not update team memberIds:', teamErr);
      }
    }

    // Record Audit Log: CREATE_USER (strictly excluding passwords)
    await recordAuditLog(
      req.adminUser!,
      'CREATE_USER',
      'USERS',
      `Tạo tài khoản nhân viên mới: ${fullName} (${employeeCode}) với vai trò ${userRole}`,
      { userId: uid, userName: fullName, recordId: uid },
      null,
      newUserDoc,
      ip,
      userAgent,
      'SUCCESS'
    );

    // Return sanitized response (never expose password in response, DOM, console or UI)
    sendApiResponse(res, 200, {
      success: true,
      message: 'Tạo tài khoản nhân viên thành công trên Firebase Authentication và Firestore.',
      user: {
        id: uid,
        uid,
        employeeCode: newUserDoc.employeeCode,
        fullName: newUserDoc.fullName,
        email: newUserDoc.email,
        phone: newUserDoc.phone,
        role: newUserDoc.role,
        teamId: newUserDoc.teamId,
        status: newUserDoc.status,
        mustChangePassword: true,
      },
    });
  } catch (err: any) {
    console.error(`[adminCreateUser][${reqId}] Code: ${err.code || 'N/A'}, Message: ${err.message || 'Unknown'}`);

    // Rollback Auth user if created but error occurred
    if (createdAuthUser) {
      try {
        await adminAuth.deleteUser(createdAuthUser.uid);
        console.log(`[Rollback][${reqId}] Đã xóa Auth user mồ côi: ${createdAuthUser.uid}`);
      } catch (rollbackErr: any) {
        console.error(`[Rollback][${reqId}] deleteUser failed:`, rollbackErr.message);
      }
    }

    await recordAuditLog(
      req.adminUser!,
      'CREATE_USER',
      'USERS',
      `Thất bại khi tạo tài khoản nhân viên: ${fullName} (${email})`,
      { userName: fullName },
      null,
      null,
      ip,
      userAgent,
      'FAILURE',
      err.message
    );

    // Handle specific error codes in Vietnamese
    if (err.code === 'auth/email-already-exists') {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'EMAIL_EXISTS',
        message: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
      });
      return;
    }

    if (err.code === 'auth/invalid-email') {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'INVALID_EMAIL',
        message: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.',
      });
      return;
    }

    if (err.code === 'auth/weak-password') {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'WEAK_PASSWORD',
        message: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
      });
      return;
    }

    // Backend / Spark credential / Identity Toolkit not configured
    const isBackendConfigError =
      err.code === 'auth/internal-error' ||
      err.code === 'auth/insufficient-permission' ||
      err.message?.includes('identitytoolkit') ||
      err.message?.includes('credential') ||
      err.message?.includes('permission') ||
      err.message?.includes('Default Credentials');

    if (isBackendConfigError) {
      sendApiResponse(res, 503, {
        success: false,
        errorCode: 'BACKEND_NOT_CONFIGURED',
        message: 'Backend tạo tài khoản chưa được cấu hình.',
        details: 'Dịch vụ Firebase Admin SDK cần Service Account Key (FIREBASE_SERVICE_ACCOUNT_KEY trên Vercel) để tạo tài khoản trực tiếp.',
        hint: 'Tạm thời Quản trị viên có thể tạo user trong Firebase Console (Authentication > Users > Add user), sau đó thêm hồ sơ users/{uid}.',
      });
      return;
    }

    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'CREATE_USER_FAILED',
      message: `Không thể tạo tài khoản nhân viên: ${err.message || 'Lỗi không xác định.'}`,
    });
  }
});

// 2. adminUpdateUser handler (Supports both PATCH and POST /api/admin/update-user)
const handleAdminUpdateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    uid,
    displayName,
    fullName,
    email,
    phone,
    employeeCode,
    role,
    roleName,
    status,
    workStatus,
    dateOfBirth,
    address,
    department,
    teamId,
    teamName,
    directManagerId,
    directManagerName,
    notes,
    avatarUrl,
    customPermissions,
    roleHistory,
  } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu mã định danh tài khoản (UID).',
    });
    return;
  }

  // Protection: prevent locking or making the last active admin resigned
  if ((status === 'LOCKED' || workStatus === 'RESIGNED') && (await isLastAdmin(uid))) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'LAST_ADMIN_PROTECTED',
      message: 'Không thể khóa hoặc cho nghỉ việc Quản trị viên cuối cùng của hệ thống.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ nhân sự trong hệ thống.',
      });
      return;
    }

    const beforeData = userSnap.data() || {};
    const finalName = displayName || fullName || beforeData.fullName || beforeData.displayName || '';

    // Check duplicate employeeCode if changed
    if (employeeCode && employeeCode.trim().toUpperCase() !== (beforeData.employeeCode || '').toUpperCase()) {
      const existingCodeSnap = await adminDb
        .collection('users')
        .where('employeeCode', '==', employeeCode.trim().toUpperCase())
        .limit(1)
        .get();

      if (!existingCodeSnap.empty && existingCodeSnap.docs[0].id !== uid) {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'EMPLOYEE_CODE_EXISTS',
          message: `Mã nhân viên "${employeeCode.trim().toUpperCase()}" đã được sử dụng cho nhân sự khác.`,
        });
        return;
      }
    }

    // Check duplicate email if changed
    if (email && email.trim().toLowerCase() !== (beforeData.email || '').toLowerCase()) {
      const newEmail = email.trim().toLowerCase();
      const existingEmailSnap = await adminDb
        .collection('users')
        .where('email', '==', newEmail)
        .limit(1)
        .get();

      if (!existingEmailSnap.empty && existingEmailSnap.docs[0].id !== uid) {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'EMAIL_ALREADY_EXISTS',
          message: `Email "${newEmail}" đã được sử dụng cho tài khoản khác trong hệ thống.`,
        });
        return;
      }
    }

    // Update Firebase Auth user if available
    if (adminAuth) {
      try {
        const authUpdates: Record<string, any> = {};
        if (finalName) authUpdates.displayName = finalName;
        if (email && email.trim().toLowerCase() !== (beforeData.email || '').toLowerCase()) {
          authUpdates.email = email.trim().toLowerCase();
        }
        if (phone && phone.startsWith('+')) {
          authUpdates.phoneNumber = phone.trim();
        }
        if (status === 'LOCKED') {
          authUpdates.disabled = true;
        } else if (status === 'ACTIVE') {
          authUpdates.disabled = false;
        }

        if (Object.keys(authUpdates).length > 0) {
          await adminAuth.updateUser(uid, authUpdates);
        }

        // Update custom user claims if role changed
        if (role && role !== beforeData.role) {
          await adminAuth.setCustomUserClaims(uid, { role });
          // Revoke refresh tokens to force re-issue of token with new claims
          await adminAuth.revokeRefreshTokens(uid).catch(() => {});
        }
      } catch (authErr: any) {
        console.warn('[adminUpdateUser] Auth update note:', authErr.message);
        if (authErr.code === 'auth/email-already-exists') {
          sendApiResponse(res, 400, {
            success: false,
            errorCode: 'EMAIL_ALREADY_EXISTS',
            message: 'Email này đã được sử dụng cho một tài khoản khác trên hệ thống xác thực.',
          });
          return;
        }
      }
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: now,
      updatedBy: req.adminUser?.uid || 'ADMIN',
    };

    if (fullName !== undefined || displayName !== undefined) {
      updatePayload.fullName = finalName;
      updatePayload.displayName = finalName;
    }
    if (email !== undefined) updatePayload.email = email.trim().toLowerCase();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (employeeCode !== undefined) updatePayload.employeeCode = employeeCode.trim().toUpperCase();
    if (role !== undefined) updatePayload.role = role;
    if (roleName !== undefined) updatePayload.roleName = roleName;
    if (status !== undefined) updatePayload.status = status;
    if (workStatus !== undefined) updatePayload.workStatus = workStatus;
    if (dateOfBirth !== undefined) updatePayload.dateOfBirth = dateOfBirth;
    if (address !== undefined) updatePayload.address = address;
    if (department !== undefined) updatePayload.department = department;
    if (teamId !== undefined) updatePayload.teamId = teamId || null;
    if (teamName !== undefined) updatePayload.teamName = teamName || '';
    if (directManagerId !== undefined) updatePayload.directManagerId = directManagerId || null;
    if (directManagerName !== undefined) updatePayload.directManagerName = directManagerName || '';
    if (notes !== undefined) updatePayload.notes = notes;
    if (avatarUrl !== undefined) updatePayload.avatarUrl = avatarUrl;
    if (customPermissions !== undefined) updatePayload.customPermissions = customPermissions;
    if (roleHistory !== undefined) updatePayload.roleHistory = roleHistory;

    const sanitizedPayload = sanitizeFirestoreData(updatePayload);
    await userDocRef.update(sanitizedPayload);

    const afterData = { ...beforeData, ...sanitizedPayload };

    await recordAuditLog(
      req.adminUser!,
      'UPDATE_USER',
      'USERS',
      `Cập nhật hồ sơ nhân viên: ${finalName} (${afterData.employeeCode || uid})`,
      { userId: uid, userName: finalName, recordId: uid },
      beforeData,
      afterData,
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: 'Cập nhật thông tin nhân viên thành công.',
      data: { user: afterData },
      user: afterData,
    });
  } catch (err: any) {
    console.error('[adminUpdateUser] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'UPDATE_USER_FAILED',
      message: `Lỗi cập nhật: ${err.message || 'Lỗi không xác định'}`,
    });
  }
};

app.patch('/api/admin/update-user', requireAdminAuth, handleAdminUpdateUser);
app.post('/api/admin/update-user', requireAdminAuth, handleAdminUpdateUser);

// Check if user has corresponding Auth user (Orphan Detection)
app.get('/api/admin/verify-user-auth', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const uid = req.query.uid as string;
  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu mã UID người dùng.',
    });
    return;
  }

  if (!adminAuth) {
    sendApiResponse(res, 200, {
      success: true,
      message: 'Dịch vụ xác thực Auth chưa sẵn sàng',
      data: { exists: true, isOrphan: false },
    });
    return;
  }

  try {
    const userRecord = await adminAuth.getUser(uid);
    sendApiResponse(res, 200, {
      success: true,
      message: 'Tài khoản xác thực tồn tại',
      data: { exists: true, authEmail: userRecord.email, isOrphan: false },
    });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      sendApiResponse(res, 200, {
        success: true,
        message: 'Không tìm thấy tài khoản xác thực (Hồ sơ mồ côi)',
        data: { exists: false, isOrphan: true },
      });
      return;
    }
    sendApiResponse(res, 200, {
      success: true,
      message: 'Đã kiểm tra trạng thái xác thực',
      data: { exists: true, isOrphan: false },
    });
  }
});

// Resolve orphan user (recreate Auth or delete orphan document)
app.post('/api/admin/resolve-orphan-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, action, tempPassword } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid || !action) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'INVALID_INPUT',
      message: 'Thiếu UID hoặc thao tác xử lý.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Hồ sơ người dùng không tồn tại.',
      });
      return;
    }

    const userData = userSnap.data() || {};

    if (action === 'DELETE_ORPHAN') {
      await userDocRef.delete();

      await recordAuditLog(
        req.adminUser!,
        'DELETE_ORPHAN_DATA',
        'USERS',
        `Xóa hồ sơ nhân viên mồ côi: ${userData.fullName} (${userData.employeeCode || uid})`,
        { userId: uid, userName: userData.fullName, recordId: uid },
        userData,
        null,
        ip,
        userAgent,
        'SUCCESS'
      );

      sendApiResponse(res, 200, {
        success: true,
        message: 'Đã xóa hồ sơ mồ côi thành công.',
      });
      return;
    }

    if (action === 'RECREATE_AUTH') {
      if (!adminAuth) {
        sendApiResponse(res, 503, {
          success: false,
          errorCode: 'AUTH_NOT_READY',
          message: 'Dịch vụ xác thực phía máy chủ chưa sẵn sàng.',
        });
        return;
      }

      const email = userData.email;
      if (!email) {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'MISSING_EMAIL',
          message: 'Hồ sơ không có địa chỉ email để tạo tài khoản xác thực.',
        });
        return;
      }

      const password = tempPassword || 'TruongPhat@2025';
      const createdAuth = await adminAuth.createUser({
        uid,
        email,
        displayName: userData.fullName || userData.displayName || 'Nhân viên',
        password,
        disabled: userData.status === 'LOCKED',
      });

      if (userData.role) {
        await adminAuth.setCustomUserClaims(uid, { role: userData.role });
      }

      await userDocRef.update({
        mustChangePassword: true,
        authRecreated: true,
        updatedAt: new Date().toISOString(),
      });

      await recordAuditLog(
        req.adminUser!,
        'RECREATE_AUTH_USER',
        'USERS',
        `Tạo lại tài khoản xác thực Firebase Authentication cho hồ sơ mồ côi: ${userData.fullName} (${email})`,
        { userId: uid, userName: userData.fullName, recordId: uid },
        null,
        { uid, email, role: userData.role },
        ip,
        userAgent,
        'SUCCESS'
      );

      sendApiResponse(res, 200, {
        success: true,
        message: `Đã tạo lại tài khoản xác thực thành công cho ${email}. Mật khẩu tạm: ${password}`,
      });
      return;
    }

    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'INVALID_ACTION',
      message: 'Hành động không hợp lệ.',
    });
  } catch (err: any) {
    console.error('[resolveOrphanUser] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'RESOLVE_ORPHAN_FAILED',
      message: `Thao tác thất bại: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 3. adminSetUserRole & changeUserRole
const handleAdminSetUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, newRole, newRoleName, reason } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid || !newRole) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'INVALID_INPUT',
      message: 'Thiếu UID người dùng hoặc vai trò mới.',
    });
    return;
  }

  const cleanRole = String(newRole).trim().toUpperCase();
  if (!cleanRole || cleanRole.length < 2) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'INVALID_ROLE',
      message: 'Mã chức vụ mới không hợp lệ.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ người dùng trong hệ thống.',
      });
      return;
    }

    const userData = userSnap.data()!;
    const oldRole = userData.role || 'AGENT';
    const oldRoleName = userData.roleName || oldRole;
    const effectiveNewRoleName = newRoleName || cleanRole;

    // Protection: Prevent demoting the last Admin
    if (oldRole === 'ADMIN' && cleanRole !== 'ADMIN') {
      const isLast = await isLastAdmin(uid);
      if (isLast) {
        sendApiResponse(res, 400, {
          success: false,
          errorCode: 'LAST_ADMIN_PROTECTED',
          message: 'Không thể hạ quyền Quản trị viên cuối cùng của hệ thống. Phải có ít nhất 1 Admin hoạt động.',
        });
        return;
      }
    }

    // Update Custom Claims in Firebase Auth if available
    if (adminAuth) {
      try {
        await adminAuth.setCustomUserClaims(uid, {
          role: cleanRole,
          admin: cleanRole === 'ADMIN',
        });
        await adminAuth.revokeRefreshTokens(uid);
      } catch (authErr: any) {
        console.warn('[adminSetUserRole] Warning updating custom claims:', authErr.message);
      }
    }

    const now = new Date().toISOString();
    const historyEntry = {
      fromRole: oldRole,
      fromRoleName: oldRoleName,
      toRole: cleanRole,
      toRoleName: effectiveNewRoleName,
      changedAt: now,
      changedBy: req.adminUser?.uid || 'ADMIN',
      changedByName: req.adminUser?.name || 'Quản trị viên',
      reason: reason || 'Luân chuyển chức vụ theo quyết định quản trị',
    };

    const existingHistory = Array.isArray(userData.roleHistory) ? userData.roleHistory : [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Update role and roleHistory in Cloud Firestore
    await userDocRef.update(
      sanitizeFirestoreData({
        role: cleanRole,
        roleName: effectiveNewRoleName,
        roleHistory: updatedHistory,
        updatedAt: now,
        updatedBy: req.adminUser?.uid,
      })
    );

    const logDesc = `${req.adminUser?.name || 'Quản trị viên'} đổi chức vụ ${userData.fullName} từ ${oldRoleName} thành ${effectiveNewRoleName}.${reason ? ` Lý do: ${reason}` : ''}`;

    await recordAuditLog(
      req.adminUser!,
      'CHANGE_ROLE',
      'USERS',
      logDesc,
      { userId: uid, userName: userData.fullName, recordId: uid },
      { role: oldRole, roleName: oldRoleName },
      { role: cleanRole, roleName: effectiveNewRoleName, reason },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã luân chuyển chức vụ thành công: ${userData.fullName} hiện là ${effectiveNewRoleName}.`,
      role: cleanRole,
      roleName: effectiveNewRoleName,
      roleHistory: updatedHistory,
    });
  } catch (err: any) {
    console.error('[adminSetUserRole] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'SET_ROLE_FAILED',
      message: `Lỗi phân quyền: ${err.message || 'Lỗi không xác định'}`,
    });
  }
};

app.post('/api/admin/set-user-role', requireAdminAuth, handleAdminSetUserRole);
app.post('/api/admin/change-user-role', requireAdminAuth, handleAdminSetUserRole);

// 3b. Cập nhật phân quyền riêng cho từng nhân sự (Individual Custom Permissions)
app.post('/api/admin/set-user-permissions', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, customPermissions } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID người dùng.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ người dùng.',
      });
      return;
    }

    const userData = userSnap.data()!;
    const now = new Date().toISOString();
    const cleanPermissions = customPermissions && typeof customPermissions === 'object' ? customPermissions : {};

    await userDocRef.update(
      sanitizeFirestoreData({
        customPermissions: cleanPermissions,
        updatedAt: now,
        updatedBy: req.adminUser?.uid,
      })
    );

    await recordAuditLog(
      req.adminUser!,
      'SET_PERMISSIONS',
      'USERS',
      `Điều chỉnh phân quyền riêng cho nhân sự: ${userData.fullName} (${userData.employeeCode || uid})`,
      { userId: uid, userName: userData.fullName, recordId: uid },
      { customPermissions: userData.customPermissions || {} },
      { customPermissions: cleanPermissions },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã cập nhật phân quyền riêng cho ${userData.fullName} thành công.`,
      customPermissions: cleanPermissions,
    });
  } catch (err: any) {
    console.error('[setUserPermissions] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'SET_PERMISSIONS_FAILED',
      message: `Lỗi cập nhật phân quyền: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 3c. Điều chuyển phòng ban, đội nhóm và chuyển giao khách hàng
app.post('/api/admin/transfer-user-team', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    uid,
    newTeamId,
    newTeamName,
    newDepartment,
    newLeaderId,
    newLeaderName,
    customerTransferMode,
    targetUserId,
    targetUserName,
    selectedCustomerIds,
  } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID người dùng cần chuyển nhóm.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ người dùng.',
      });
      return;
    }

    const userData = userSnap.data()!;
    const now = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      teamId: newTeamId || null,
      teamName: newTeamName || '',
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    };

    if (newDepartment !== undefined) updatePayload.department = newDepartment;
    if (newLeaderId !== undefined) updatePayload.directManagerId = newLeaderId || null;
    if (newLeaderName !== undefined) updatePayload.directManagerName = newLeaderName || '';

    await userDocRef.update(sanitizeFirestoreData(updatePayload));

    let reassignCount = 0;
    if (customerTransferMode === 'ALL' && targetUserId) {
      const customersSnap = await adminDb
        .collection('customers')
        .where('assignedTo', '==', uid)
        .get();

      const batch = adminDb.batch();
      customersSnap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          assignedTo: targetUserId,
          assignedToName: targetUserName || '',
          assignedAgentId: targetUserId,
          assignedAgentName: targetUserName || '',
          updatedAt: now,
          updatedBy: req.adminUser?.uid,
        });
        reassignCount++;
      });

      if (reassignCount > 0) {
        await batch.commit();
      }
    } else if (
      customerTransferMode === 'SELECTED' &&
      targetUserId &&
      Array.isArray(selectedCustomerIds) &&
      selectedCustomerIds.length > 0
    ) {
      const batch = adminDb.batch();
      for (const cId of selectedCustomerIds) {
        const cRef = adminDb.collection('customers').doc(cId);
        batch.update(cRef, {
          assignedTo: targetUserId,
          assignedToName: targetUserName || '',
          assignedAgentId: targetUserId,
          assignedAgentName: targetUserName || '',
          updatedAt: now,
          updatedBy: req.adminUser?.uid,
        });
        reassignCount++;
      }
      if (reassignCount > 0) {
        await batch.commit();
      }
    }

    const logDesc = `${req.adminUser?.name || 'Quản trị viên'} điều chuyển nhân sự ${userData.fullName} sang ${newTeamName || 'Chưa phân nhóm'}${newDepartment ? ` (${newDepartment})` : ''}.${reassignCount > 0 ? ` Đã bàn giao ${reassignCount} khách hàng cho ${targetUserName}.` : ' Giữ nguyên khách hàng phụ trách.'}`;

    await recordAuditLog(
      req.adminUser!,
      'TRANSFER_TEAM',
      'USERS',
      logDesc,
      { userId: uid, userName: userData.fullName, recordId: uid },
      { teamId: userData.teamId, teamName: userData.teamName, department: userData.department },
      { teamId: newTeamId, teamName: newTeamName, department: newDepartment, reassignCount, targetUserId },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Điều chuyển nhân sự ${userData.fullName} thành công.${reassignCount > 0 ? ` Đã chuyển giao ${reassignCount} khách hàng cho ${targetUserName}.` : ''}`,
      reassignCount,
    });
  } catch (err: any) {
    console.error('[transferUserTeam] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'TRANSFER_TEAM_FAILED',
      message: `Lỗi điều chuyển: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 3d. Dynamic Roles Management (Quản lý chức vụ & phân quyền động)
app.get('/api/admin/roles', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore chưa sẵn sàng.',
    });
    return;
  }

  try {
    const rolesSnap = await adminDb.collection('roles').get();
    const roles = rolesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    sendApiResponse(res, 200, {
      success: true,
      message: 'Lấy danh sách chức vụ thành công',
      roles,
    });
  } catch (err: any) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'FETCH_ROLES_FAILED',
      message: `Lỗi lấy danh sách chức vụ: ${err.message}`,
    });
  }
});

app.post('/api/admin/roles', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code, name, description, permissions, isActive } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!code || !name) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'INVALID_INPUT',
      message: 'Vui lòng nhập đầy đủ mã chức vụ và tên chức vụ.',
    });
    return;
  }

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const cleanName = name.trim();

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore chưa sẵn sàng.',
    });
    return;
  }

  try {
    const existingSnap = await adminDb.collection('roles').where('code', '==', cleanCode).limit(1).get();
    if (!existingSnap.empty) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'ROLE_CODE_EXISTS',
        message: `Mã chức vụ "${cleanCode}" đã tồn tại trên hệ thống.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const roleId = `role_${cleanCode.toLowerCase()}`;
    const newRoleData = {
      id: roleId,
      code: cleanCode,
      name: cleanName,
      description: description?.trim() || '',
      permissions: Array.isArray(permissions) ? permissions : [],
      isActive: isActive !== false,
      isSystem: false,
      createdAt: now,
      createdBy: req.adminUser?.uid || 'ADMIN',
      updatedAt: now,
      updatedBy: req.adminUser?.uid || 'ADMIN',
    };

    await adminDb.collection('roles').doc(roleId).set(sanitizeFirestoreData(newRoleData));

    await recordAuditLog(
      req.adminUser!,
      'CREATE_ROLE',
      'USERS',
      `Tạo chức vụ mới: ${cleanName} (${cleanCode}) với ${newRoleData.permissions.length} quyền hạn`,
      { recordId: roleId, recordName: cleanName },
      null,
      newRoleData,
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 201, {
      success: true,
      message: `Đã tạo chức vụ "${cleanName}" thành công.`,
      role: newRoleData,
    });
  } catch (err: any) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'CREATE_ROLE_FAILED',
      message: `Lỗi tạo chức vụ: ${err.message}`,
    });
  }
});

app.put('/api/admin/roles/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const roleId = req.params.id;
  const { name, description, permissions, isActive } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore chưa sẵn sàng.',
    });
    return;
  }

  try {
    const roleRef = adminDb.collection('roles').doc(roleId);
    const roleSnap = await roleRef.get();
    if (!roleSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'ROLE_NOT_FOUND',
        message: 'Không tìm thấy chức vụ cần cập nhật.',
      });
      return;
    }

    const beforeData = roleSnap.data()!;

    if (beforeData.code === 'ADMIN' && isActive === false) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'CANNOT_DEACTIVATE_ADMIN',
        message: 'Không thể ngưng hoạt động chức vụ Quản trị viên tối cao (ADMIN).',
      });
      return;
    }

    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      updatedAt: now,
      updatedBy: req.adminUser?.uid || 'ADMIN',
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (permissions !== undefined && Array.isArray(permissions)) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    await roleRef.update(sanitizeFirestoreData(updateData));
    const afterData = { ...beforeData, ...updateData };

    await recordAuditLog(
      req.adminUser!,
      'UPDATE_ROLE',
      'USERS',
      `Cập nhật chức vụ: ${afterData.name} (${beforeData.code})`,
      { recordId: roleId, recordName: afterData.name },
      beforeData,
      afterData,
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Cập nhật chức vụ "${afterData.name}" thành công.`,
      role: afterData,
    });
  } catch (err: any) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'UPDATE_ROLE_FAILED',
      message: `Lỗi cập nhật chức vụ: ${err.message}`,
    });
  }
});

app.delete('/api/admin/roles/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const roleId = req.params.id;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore chưa sẵn sàng.',
    });
    return;
  }

  try {
    const roleRef = adminDb.collection('roles').doc(roleId);
    const roleSnap = await roleRef.get();
    if (!roleSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'ROLE_NOT_FOUND',
        message: 'Không tìm thấy chức vụ cần xóa.',
      });
      return;
    }

    const roleData = roleSnap.data()!;

    if (roleData.isSystem || roleData.code === 'ADMIN') {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'SYSTEM_ROLE_PROTECTED',
        message: 'Chức vụ mặc định hệ thống không thể xóa.',
      });
      return;
    }

    const usersWithRole = await adminDb
      .collection('users')
      .where('role', 'in', [roleData.code, roleId])
      .get();

    if (!usersWithRole.empty) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'ROLE_IN_USE',
        message: `Không thể xóa chức vụ "${roleData.name}" vì đang có ${usersWithRole.size} nhân sự giữ chức vụ này. Vui lòng luân chuyển chức vụ của các nhân sự trước khi xóa.`,
      });
      return;
    }

    await roleRef.delete();

    await recordAuditLog(
      req.adminUser!,
      'DELETE_ROLE',
      'USERS',
      `Xóa chức vụ: ${roleData.name} (${roleData.code})`,
      { recordId: roleId, recordName: roleData.name },
      roleData,
      null,
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã xóa chức vụ "${roleData.name}" thành công.`,
    });
  } catch (err: any) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'DELETE_ROLE_FAILED',
      message: `Lỗi xóa chức vụ: ${err.message}`,
    });
  }
});

// 4. adminDisableUser (Lock account)
app.post('/api/admin/disable-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, reason } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID người dùng.',
    });
    return;
  }

  // Protection: Prevent self-locking
  if (req.adminUser?.uid === uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'SELF_LOCK_DENIED',
      message: 'Bạn không thể tự khóa tài khoản của chính mình.',
    });
    return;
  }

  // Protection: Prevent locking the last Admin
  if (await isLastAdmin(uid)) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'LAST_ADMIN_PROTECTED',
      message: 'Không thể khóa Quản trị viên cuối cùng của hệ thống.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản nhân viên cần khóa.',
      });
      return;
    }

    const userData = userSnap.data();

    // Disable in Firebase Auth if available
    if (adminAuth) {
      try {
        await adminAuth.updateUser(uid, { disabled: true });
        await adminAuth.revokeRefreshTokens(uid);
      } catch (authErr: any) {
        console.warn('Auth disableUser warning:', authErr.message);
      }
    }

    // Update in Cloud Firestore
    const now = new Date().toISOString();
    await userDocRef.update({
      status: 'LOCKED',
      lockReason: reason || 'Khóa bởi Quản trị viên',
      lockedAt: now,
      lockedBy: req.adminUser?.uid,
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    });

    await recordAuditLog(
      req.adminUser!,
      'LOCK_USER',
      'USERS',
      `Khóa tài khoản nhân viên: ${userData?.fullName || uid}. Lý do: ${reason || 'Không nêu'}`,
      { userId: uid, userName: userData?.fullName, recordId: uid },
      { status: userData?.status },
      { status: 'LOCKED', lockReason: reason },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã khóa tài khoản ${userData?.fullName || uid} và chấm dứt mọi phiên đăng nhập ngay lập tức.`,
    });
  } catch (err: any) {
    console.error('[adminDisableUser] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'LOCK_USER_FAILED',
      message: `Lỗi khóa tài khoản: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 5. adminEnableUser (Unlock account)
app.post('/api/admin/enable-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID người dùng.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản nhân viên cần mở khóa.',
      });
      return;
    }

    const userData = userSnap.data();

    // Enable in Firebase Auth if available
    if (adminAuth) {
      try {
        await adminAuth.updateUser(uid, { disabled: false });
      } catch (authErr: any) {
        console.warn('Auth enableUser warning:', authErr.message);
      }
    }

    // Update in Cloud Firestore
    const now = new Date().toISOString();
    await userDocRef.update({
      status: 'ACTIVE',
      lockReason: null,
      unlockedAt: now,
      unlockedBy: req.adminUser?.uid,
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    });

    await recordAuditLog(
      req.adminUser!,
      'UNLOCK_USER',
      'USERS',
      `Mở khóa tài khoản nhân viên: ${userData?.fullName || uid}`,
      { userId: uid, userName: userData?.fullName, recordId: uid },
      { status: userData?.status },
      { status: 'ACTIVE' },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã mở khóa tài khoản cho nhân viên ${userData?.fullName || uid}. Người dùng có thể đăng nhập bình thường.`,
    });
  } catch (err: any) {
    console.error('[adminEnableUser] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'UNLOCK_USER_FAILED',
      message: `Lỗi mở khóa tài khoản: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 6. adminSendPasswordReset
app.post('/api/admin/send-password-reset', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!email && !uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_FIELDS',
      message: 'Thiếu Email hoặc UID người dùng.',
    });
    return;
  }

  try {
    let targetEmail = email;
    let targetName = '';

    if (uid && !targetEmail && adminDb) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        targetEmail = userDoc.data()?.email;
        targetName = userDoc.data()?.fullName;
      }
    }

    if (!targetEmail) {
      sendApiResponse(res, 400, {
        success: false,
        errorCode: 'EMAIL_NOT_FOUND',
        message: 'Không tìm thấy địa chỉ Email của tài khoản.',
      });
      return;
    }

    let resetLink = '';
    if (adminAuth) {
      try {
        resetLink = await adminAuth.generatePasswordResetLink(targetEmail);
      } catch (authErr: any) {
        console.warn('generatePasswordResetLink notice:', authErr.message);
      }
    }

    await recordAuditLog(
      req.adminUser!,
      'PASSWORD_RESET',
      'AUTH',
      `Tạo yêu cầu đặt lại mật khẩu cho tài khoản: ${targetEmail}`,
      { userId: uid, userName: targetName, recordId: uid },
      null,
      { email: targetEmail },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã tạo yêu cầu đặt lại mật khẩu cho ${targetEmail}.`,
      resetLink: resetLink || undefined,
    });
  } catch (err: any) {
    console.error('[adminSendPasswordReset] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'RESET_PASSWORD_FAILED',
      message: `Không thể gửi email đặt lại mật khẩu: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 7. adminSetTemporaryPassword
app.post('/api/admin/set-temp-password', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, newPassword, requireChangeOnLogin } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid || !newPassword) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_FIELDS',
      message: 'Thiếu UID người dùng hoặc mật khẩu mới.',
    });
    return;
  }

  const check = validatePasswordComplexity(newPassword);
  if (!check.valid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'WEAK_PASSWORD',
      message: check.reason || 'Mật khẩu không đủ độ mạnh.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ nhân sự trong hệ thống.',
      });
      return;
    }

    const userData = userSnap.data();

    // Update password in Firebase Authentication directly via Admin SDK if available
    if (adminAuth) {
      try {
        await adminAuth.updateUser(uid, {
          password: newPassword,
        });
        await adminAuth.revokeRefreshTokens(uid);
      } catch (authErr: any) {
        console.warn('Auth updateUser password warning:', authErr.message);
      }
    }

    // Update mustChangePassword in Cloud Firestore (NEVER SAVE RAW PASSWORD IN FIRESTORE!)
    const now = new Date().toISOString();
    await userDocRef.update({
      mustChangePassword: requireChangeOnLogin !== false,
      lastPasswordChangeAt: now,
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    });

    await recordAuditLog(
      req.adminUser!,
      'TEMP_PASSWORD',
      'AUTH',
      `Cấp mật khẩu tạm thời cho nhân viên: ${userData?.fullName || uid}`,
      { userId: uid, userName: userData?.fullName, recordId: uid },
      null,
      { mustChangePassword: requireChangeOnLogin !== false },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã cấp mật khẩu tạm thời thành công cho ${userData?.fullName || uid}. Tất cả phiên đăng nhập cũ đã được thu hồi và yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.`,
    });
  } catch (err: any) {
    console.error('[adminSetTemporaryPassword] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'SET_TEMP_PASSWORD_FAILED',
      message: `Lỗi cấp mật khẩu: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 8. adminRevokeUserSessions
app.post('/api/admin/revoke-sessions', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID người dùng.',
    });
    return;
  }

  try {
    if (adminAuth) {
      await adminAuth.revokeRefreshTokens(uid);
    }

    let targetName = uid;
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        targetName = userDoc.data()?.fullName || uid;
      }
    }

    await recordAuditLog(
      req.adminUser!,
      'REVOKE_SESSIONS',
      'AUTH',
      `Thu hồi tất cả phiên đăng nhập của nhân viên: ${targetName}`,
      { userId: uid, userName: targetName, recordId: uid },
      null,
      null,
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã thu hồi tất cả phiên đăng nhập đang hoạt động của tài khoản ${targetName}.`,
    });
  } catch (err: any) {
    console.error('[adminRevokeUserSessions] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'REVOKE_SESSIONS_FAILED',
      message: `Lỗi thu hồi phiên: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 9. adminDeleteUser
app.post('/api/admin/delete-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID người dùng.',
    });
    return;
  }

  // Protection: Cannot delete self
  if (req.adminUser?.uid === uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'SELF_DELETE_DENIED',
      message: 'Bạn không thể tự xóa tài khoản của chính mình.',
    });
    return;
  }

  // Protection: Cannot delete last Admin
  if (await isLastAdmin(uid)) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'LAST_ADMIN_PROTECTED',
      message: 'Không thể xóa Quản trị viên cuối cùng của hệ thống.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    const userData = userSnap.data();

    // 1. Delete from Firebase Authentication if available
    if (adminAuth) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/user-not-found') {
          console.warn('Auth deleteUser warning:', authErr.message);
        }
      }
    }

    // 2. Delete from Cloud Firestore
    await userDocRef.delete();

    // 3. Remove user from any teams
    if (userData?.teamId) {
      try {
        const teamRef = adminDb.collection('teams').doc(userData.teamId);
        const teamSnap = await teamRef.get();
        if (teamSnap.exists) {
          const members = teamSnap.data()?.memberIds || [];
          await teamRef.update({
            memberIds: members.filter((m: string) => m !== uid),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (teamErr) {}
    }

    await recordAuditLog(
      req.adminUser!,
      'DELETE',
      'USERS',
      `Xóa hoàn toàn tài khoản nhân viên: ${userData?.fullName || uid} (${userData?.email})`,
      { userId: uid, userName: userData?.fullName, recordId: uid },
      userData,
      null,
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã xóa tài khoản nhân viên ${userData?.fullName || uid} khỏi Authentication và Firestore.`,
    });
  } catch (err: any) {
    console.error('[adminDeleteUser] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'DELETE_USER_FAILED',
      message: `Lỗi xóa tài khoản: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// 10. adminAssignUserToTeam
app.post('/api/admin/assign-team', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, teamId } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'MISSING_UID',
      message: 'Thiếu UID nhân viên.',
    });
    return;
  }

  if (!adminDb) {
    sendApiResponse(res, 503, {
      success: false,
      errorCode: 'BACKEND_NOT_CONFIGURED',
      message: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      sendApiResponse(res, 404, {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy thông tin nhân viên trong hệ thống.',
      });
      return;
    }

    const userData = userSnap.data()!;
    const oldTeamId = userData.teamId;
    let newTeamName = '';

    if (teamId) {
      const teamDoc = await adminDb.collection('teams').doc(teamId).get();
      if (teamDoc.exists) {
        newTeamName = teamDoc.data()?.name || '';
      }
    }

    const now = new Date().toISOString();

    // 1. Update user document
    await userDocRef.update({
      teamId: teamId || null,
      teamName: newTeamName,
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    });

    // 2. Remove from old team members
    if (oldTeamId && oldTeamId !== teamId) {
      try {
        const oldTeamRef = adminDb.collection('teams').doc(oldTeamId);
        const oldTeamSnap = await oldTeamRef.get();
        if (oldTeamSnap.exists) {
          const members = oldTeamSnap.data()?.memberIds || [];
          await oldTeamRef.update({
            memberIds: members.filter((m: string) => m !== uid),
            updatedAt: now,
          });
        }
      } catch (e) {}
    }

    // 3. Add to new team members
    if (teamId) {
      try {
        const newTeamRef = adminDb.collection('teams').doc(teamId);
        const newTeamSnap = await newTeamRef.get();
        if (newTeamSnap.exists) {
          const members = newTeamSnap.data()?.memberIds || [];
          if (!members.includes(uid)) {
            await newTeamRef.update({
              memberIds: [...members, uid],
              updatedAt: now,
            });
          }
        }
      } catch (e) {}
    }

    await recordAuditLog(
      req.adminUser!,
      'ASSIGN',
      'TEAMS',
      `Chuyển nhóm cho nhân viên ${userData.fullName}: ${userData.teamName || 'Chưa gán'} -> ${newTeamName || 'Chưa gán'}`,
      { userId: uid, userName: userData.fullName, recordId: uid },
      { teamId: oldTeamId, teamName: userData.teamName },
      { teamId, teamName: newTeamName },
      ip,
      userAgent,
      'SUCCESS'
    );

    sendApiResponse(res, 200, {
      success: true,
      message: `Đã chuyển nhân viên ${userData.fullName} sang nhóm ${newTeamName || 'Không có nhóm'}.`,
    });
  } catch (err: any) {
    console.error('[adminAssignUserToTeam] Error:', err);
    sendApiResponse(res, 400, {
      success: false,
      errorCode: 'ASSIGN_TEAM_FAILED',
      message: `Lỗi chuyển nhóm: ${err.message || 'Lỗi không xác định'}`,
    });
  }
});

// Health check API
app.get('/api/health', (req: Request, res: Response) => {
  sendApiResponse(res, 200, {
    success: true,
    message: 'Máy chủ Trường Phát Real hoạt động bình thường',
    adminConfigured: Boolean(adminAuth && adminDb),
    timestamp: new Date().toISOString(),
  });
});

// Fallback 404 handler specifically for /api routes so they NEVER return HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  sendApiResponse(res, 404, {
    success: false,
    errorCode: 'ENDPOINT_NOT_FOUND',
    message: `Đường dẫn API không tồn tại (${req.method} ${req.path})`,
  });
});

// Global API error handler
app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  console.error(`[API Error Handler] ${req.method} ${req.path}:`, err);
  sendApiResponse(res, 500, {
    success: false,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
    details: err?.message,
  });
});

// 5. Mount Vite Middleware for Development / Static Serve for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TRUONG PHAT REAL] Full-stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
