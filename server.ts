import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, App } from 'firebase-admin/app';
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

// 1. Initialize Firebase Admin SDK
let firebaseAdminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

try {
  let config: any = {};
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const projectId = config.projectId || process.env.FIREBASE_PROJECT_ID || 'airy-cogency-503707-p1';
  const databaseId = config.firestoreDatabaseId || '(default)';

  const existingApps = getApps();
  if (!existingApps.length) {
    firebaseAdminApp = initializeApp({
      projectId,
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
  target?: { userId?: string; userName?: string; recordId?: string },
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

    res.json({ success: true, logId });
  } catch (err: any) {
    console.error('[api/audit-log] Error recording log:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Endpoint for Hosting Image Upload (Spark plan compatible)
app.post('/api/upload-image', (req: Request, res: Response): void => {
  try {
    const { base64Data, fileName, propertyId } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, error: 'Thiếu dữ liệu ảnh' });
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
    res.json({
      success: true,
      url: publicUrl,
      fileName: uniqueName,
      size: buffer.length,
    });
  } catch (err: any) {
    console.error('[Hosting Upload] Error saving file:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Lỗi lưu trữ tệp trên hosting' });
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
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Yêu cầu không hợp lệ. Vui lòng đăng nhập lại với quyền Quản trị viên.',
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
    });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(503).json({
      success: false,
      code: 'BACKEND_NOT_CONFIGURED',
      error: 'Chưa cấu hình dịch vụ tạo tài khoản.',
      hint: 'Dịch vụ Firebase Admin SDK phía máy chủ chưa sẵn sàng.',
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
      res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        error: 'Quyền truy cập bị từ chối. Chỉ Quản trị viên (ADMIN) mới có quyền tạo tài khoản nhân viên.',
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
    console.error('[Auth Error] verifyIdToken failed:', err.message);
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
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

  if (!email || !fullName || !employeeCode || !phone) {
    res.status(400).json({
      success: false,
      code: 'MISSING_FIELDS',
      error: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Họ tên, Email, SĐT, Mã nhân viên.',
    });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({
      success: false,
      code: 'INVALID_EMAIL',
      error: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.',
    });
    return;
  }

  const validRoles = ['ADMIN', 'TEAM_LEADER', 'AGENT'];
  const userRole = validRoles.includes(role) ? role : 'AGENT';

  if (!adminDb) {
    res.status(503).json({
      success: false,
      code: 'BACKEND_NOT_CONFIGURED',
      error: 'Chưa cấu hình dịch vụ tạo tài khoản.',
      hint: 'Dịch vụ Firestore phía máy chủ chưa sẵn sàng.',
    });
    return;
  }

  // Check if email already exists in Firestore users collection
  try {
    const duplicateInDb = await adminDb.collection('users').where('email', '==', email.trim().toLowerCase()).get();
    if (!duplicateInDb.empty) {
      res.status(400).json({
        success: false,
        code: 'EMAIL_EXISTS',
        error: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
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
        res.status(400).json({
          success: false,
          error: 'Hồ sơ nhân sự cho UID này đã tồn tại trong hệ thống.',
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

      res.json({
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
      console.error('[providedUid] Error saving profile:', manualErr);
      res.status(500).json({
        success: false,
        error: `Không thể tạo hồ sơ nhân viên: ${manualErr.message || 'Lỗi cơ sở dữ liệu'}`,
      });
      return;
    }
  }

  // CASE B: Standard Automated Creation via Firebase Admin SDK
  if (!adminAuth) {
    res.status(503).json({
      success: false,
      code: 'BACKEND_NOT_CONFIGURED',
      error: 'Chưa cấu hình dịch vụ tạo tài khoản.',
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
        res.status(400).json({
          success: false,
          code: 'WEAK_PASSWORD',
          error: check.reason || 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
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
        res.status(400).json({
          success: false,
          code: 'EMAIL_EXISTS',
          error: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
        });
        return;
      }
      if (e.code !== 'auth/user-not-found') {
        // If it's a backend config error (e.g. Identity Toolkit disabled or missing credentials)
        throw e;
      }
    }

    if (existingUser) {
      res.status(400).json({
        success: false,
        code: 'EMAIL_EXISTS',
        error: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
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

    await adminDb.collection('users').doc(uid).set(newUserDoc);

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
    res.json({
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
    console.error('[adminCreateUser] Error:', err);

    // Rollback Auth user if created but Firestore failed
    if (createdAuthUser) {
      try {
        await adminAuth.deleteUser(createdAuthUser.uid);
        console.log(`[Rollback] Đã xóa Auth user mồ côi: ${createdAuthUser.uid}`);
      } catch (rollbackErr) {
        console.error('Rollback deleteUser failed:', rollbackErr);
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
      res.status(400).json({
        success: false,
        code: 'EMAIL_EXISTS',
        error: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống.',
      });
      return;
    }

    if (err.code === 'auth/invalid-email') {
      res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        error: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.',
      });
      return;
    }

    if (err.code === 'auth/weak-password') {
      res.status(400).json({
        success: false,
        code: 'WEAK_PASSWORD',
        error: 'Mật khẩu không đủ mạnh. Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
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
      res.status(503).json({
        success: false,
        code: 'BACKEND_NOT_CONFIGURED',
        error: 'Chưa cấu hình dịch vụ tạo tài khoản.',
        details: 'Dịch vụ Firebase Admin SDK cần Service Account Key hoặc Identity Toolkit API để tạo tài khoản tự động.',
        hint: 'Tạm thời Quản trị viên có thể tạo user trong Firebase Console (Authentication > Users > Add user), sau đó thêm hồ sơ users/{uid}.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: `Không thể tạo tài khoản: ${err.message || 'Lỗi hệ thống'}`,
    });
  }
});

// 2. adminUpdateUser
app.post('/api/admin/update-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, fullName, phone, employeeCode, teamId, teamName, notes, avatarUrl } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    res.status(400).json({ success: false, error: 'Thiếu mã định danh tài khoản (UID).' });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ nhân sự trong hệ thống.' });
      return;
    }

    const beforeData = userSnap.data();

    // Update Firebase Auth display name / phone if provided
    try {
      await adminAuth.updateUser(uid, {
        displayName: fullName || beforeData?.fullName,
        phoneNumber: phone && phone.startsWith('+') ? phone : undefined,
      });
    } catch (authErr: any) {
      console.warn('Auth updateUser notice:', authErr.message);
    }

    const now = new Date().toISOString();
    const updatePayload: any = {
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    };

    if (fullName !== undefined) updatePayload.fullName = fullName.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (employeeCode !== undefined) updatePayload.employeeCode = employeeCode.trim().toUpperCase();
    if (teamId !== undefined) updatePayload.teamId = teamId || null;
    if (teamName !== undefined) updatePayload.teamName = teamName || '';
    if (notes !== undefined) updatePayload.notes = notes;
    if (avatarUrl !== undefined) updatePayload.avatarUrl = avatarUrl;

    await userDocRef.update(updatePayload);

    const afterData = { ...beforeData, ...updatePayload };

    await recordAuditLog(
      req.adminUser!,
      'UPDATE',
      'USERS',
      `Cập nhật thông tin nhân viên: ${fullName || beforeData?.fullName}`,
      { userId: uid, userName: fullName || beforeData?.fullName, recordId: uid },
      beforeData,
      afterData,
      ip,
      userAgent,
      'SUCCESS'
    );

    res.json({
      success: true,
      message: 'Cập nhật thông tin nhân viên thành công.',
      user: afterData,
    });
  } catch (err: any) {
    console.error('[adminUpdateUser] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi cập nhật: ${err.message}` });
  }
});

// 3. adminSetUserRole
app.post('/api/admin/set-user-role', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, newRole } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid || !newRole) {
    res.status(400).json({ success: false, error: 'Thiếu UID người dùng hoặc vai trò mới.' });
    return;
  }

  const validRoles = ['ADMIN', 'TEAM_LEADER', 'AGENT'];
  if (!validRoles.includes(newRole)) {
    res.status(400).json({ success: false, error: 'Vai trò không hợp lệ.' });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ người dùng.' });
      return;
    }

    const userData = userSnap.data()!;
    const oldRole = userData.role;

    // Protection: Prevent demoting the last Admin
    if (oldRole === 'ADMIN' && newRole !== 'ADMIN') {
      const isLast = await isLastAdmin(uid);
      if (isLast) {
        res.status(400).json({
          success: false,
          error: 'Không thể hạ quyền Quản trị viên cuối cùng của hệ thống. Phải có ít nhất 1 Admin hoạt động.',
        });
        return;
      }
    }

    // Update Custom Claims in Firebase Auth
    await adminAuth.setCustomUserClaims(uid, {
      role: newRole,
      admin: newRole === 'ADMIN',
    });

    // Revoke refresh tokens to force client to fetch updated claims immediately
    await adminAuth.revokeRefreshTokens(uid);

    // Update role in Cloud Firestore
    const now = new Date().toISOString();
    await userDocRef.update({
      role: newRole,
      updatedAt: now,
      updatedBy: req.adminUser?.uid,
    });

    await recordAuditLog(
      req.adminUser!,
      'CHANGE_ROLE',
      'USERS',
      `Thay đổi vai trò cho ${userData.fullName}: ${oldRole} -> ${newRole}`,
      { userId: uid, userName: userData.fullName, recordId: uid },
      { role: oldRole },
      { role: newRole },
      ip,
      userAgent,
      'SUCCESS'
    );

    res.json({
      success: true,
      message: `Đã phân quyền thành công: ${userData.fullName} hiện là ${newRole}. Các phiên làm việc cũ đã được thu hồi để cập nhật quyền ngay.`,
      role: newRole,
    });
  } catch (err: any) {
    console.error('[adminSetUserRole] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi phân quyền: ${err.message}` });
  }
});

// 4. adminDisableUser (Lock account)
app.post('/api/admin/disable-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, reason } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    res.status(400).json({ success: false, error: 'Thiếu UID người dùng.' });
    return;
  }

  // Protection: Prevent self-locking
  if (req.adminUser?.uid === uid) {
    res.status(400).json({
      success: false,
      error: 'Bạn không thể tự khóa tài khoản của chính mình.',
    });
    return;
  }

  // Protection: Prevent locking the last Admin
  if (await isLastAdmin(uid)) {
    res.status(400).json({
      success: false,
      error: 'Không thể khóa Quản trị viên cuối cùng của hệ thống.',
    });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    const userData = userSnap.data();

    // Disable in Firebase Auth
    await adminAuth.updateUser(uid, { disabled: true });
    // Revoke all active session tokens immediately
    await adminAuth.revokeRefreshTokens(uid);

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

    res.json({
      success: true,
      message: `Đã khóa tài khoản ${userData?.fullName || uid} và chấm dứt mọi phiên đăng nhập ngay lập tức.`,
    });
  } catch (err: any) {
    console.error('[adminDisableUser] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi khóa tài khoản: ${err.message}` });
  }
});

// 5. adminEnableUser (Unlock account)
app.post('/api/admin/enable-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    res.status(400).json({ success: false, error: 'Thiếu UID người dùng.' });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    const userData = userSnap.data();

    // Enable in Firebase Auth
    await adminAuth.updateUser(uid, { disabled: false });

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

    res.json({
      success: true,
      message: `Đã mở khóa tài khoản cho nhân viên ${userData?.fullName || uid}. Người dùng có thể đăng nhập bình thường.`,
    });
  } catch (err: any) {
    console.error('[adminEnableUser] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi mở khóa: ${err.message}` });
  }
});

// 6. adminSendPasswordReset
app.post('/api/admin/send-password-reset', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!email && !uid) {
    res.status(400).json({ success: false, error: 'Thiếu Email hoặc UID người dùng.' });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    let targetEmail = email;
    let targetName = '';

    if (uid && !targetEmail) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        targetEmail = userDoc.data()?.email;
        targetName = userDoc.data()?.fullName;
      }
    }

    if (!targetEmail) {
      res.status(400).json({ success: false, error: 'Không tìm thấy địa chỉ Email tài khoản.' });
      return;
    }

    // Generate password reset link via Firebase Admin SDK
    const resetLink = await adminAuth.generatePasswordResetLink(targetEmail);

    await recordAuditLog(
      req.adminUser!,
      'PASSWORD_RESET',
      'AUTH',
      `Tạo liên kết đặt lại mật khẩu cho tài khoản: ${targetEmail}`,
      { userId: uid, userName: targetName, recordId: uid },
      null,
      { email: targetEmail },
      ip,
      userAgent,
      'SUCCESS'
    );

    res.json({
      success: true,
      message: `Đã tạo liên kết đặt lại mật khẩu cho ${targetEmail}.`,
      resetLink,
    });
  } catch (err: any) {
    console.error('[adminSendPasswordReset] Error:', err);
    res.status(500).json({ success: false, error: `Không thể gửi reset email: ${err.message}` });
  }
});

// 7. adminSetTemporaryPassword
app.post('/api/admin/set-temp-password', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, newPassword, requireChangeOnLogin } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid || !newPassword) {
    res.status(400).json({ success: false, error: 'Thiếu UID người dùng hoặc mật khẩu mới.' });
    return;
  }

  const check = validatePasswordComplexity(newPassword);
  if (!check.valid) {
    res.status(400).json({ success: false, error: check.reason });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    const userData = userSnap.data();

    // Update password in Firebase Authentication directly via Admin SDK
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // Revoke all existing sessions
    await adminAuth.revokeRefreshTokens(uid);

    // Update mustChangePassword in Cloud Firestore (NEVER SAVE PASSWORD IN FIRESTORE!)
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

    res.json({
      success: true,
      message: `Đã cấp mật khẩu tạm thời thành công cho ${userData?.fullName || uid}. Tất cả phiên đăng nhập cũ đã được thu hồi và yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.`,
    });
  } catch (err: any) {
    console.error('[adminSetTemporaryPassword] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi cấp mật khẩu: ${err.message}` });
  }
});

// 8. adminRevokeUserSessions
app.post('/api/admin/revoke-sessions', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    res.status(400).json({ success: false, error: 'Thiếu UID người dùng.' });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    await adminAuth.revokeRefreshTokens(uid);

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    await recordAuditLog(
      req.adminUser!,
      'REVOKE_SESSIONS',
      'AUTH',
      `Thu hồi tất cả phiên đăng nhập của nhân viên: ${userData?.fullName || uid}`,
      { userId: uid, userName: userData?.fullName, recordId: uid },
      null,
      null,
      ip,
      userAgent,
      'SUCCESS'
    );

    res.json({
      success: true,
      message: `Đã thu hồi tất cả phiên đăng nhập đang hoạt động của tài khoản ${userData?.fullName || uid}.`,
    });
  } catch (err: any) {
    console.error('[adminRevokeUserSessions] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi thu hồi phiên: ${err.message}` });
  }
});

// 9. adminDeleteUser
app.post('/api/admin/delete-user', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    res.status(400).json({ success: false, error: 'Thiếu UID người dùng.' });
    return;
  }

  // Protection: Cannot delete self
  if (req.adminUser?.uid === uid) {
    res.status(400).json({
      success: false,
      error: 'Bạn không thể tự xóa tài khoản của chính mình.',
    });
    return;
  }

  // Protection: Cannot delete last Admin
  if (await isLastAdmin(uid)) {
    res.status(400).json({
      success: false,
      error: 'Không thể xóa Quản trị viên cuối cùng của hệ thống.',
    });
    return;
  }

  if (!adminAuth || !adminDb) {
    res.status(500).json({ success: false, error: 'Firebase Admin SDK chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    const userData = userSnap.data();

    // 1. Delete from Firebase Authentication
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr: any) {
      if (authErr.code !== 'auth/user-not-found') throw authErr;
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

    res.json({
      success: true,
      message: `Đã xóa tài khoản nhân viên ${userData?.fullName || uid} khỏi Authentication và Firestore.`,
    });
  } catch (err: any) {
    console.error('[adminDeleteUser] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi xóa tài khoản: ${err.message}` });
  }
});

// 10. adminAssignUserToTeam
app.post('/api/admin/assign-team', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid, teamId } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!uid) {
    res.status(400).json({ success: false, error: 'Thiếu UID nhân viên.' });
    return;
  }

  if (!adminDb) {
    res.status(500).json({ success: false, error: 'Firestore chưa sẵn sàng.' });
    return;
  }

  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thông tin nhân viên.' });
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

    res.json({
      success: true,
      message: `Đã chuyển nhân viên ${userData.fullName} sang nhóm ${newTeamName || 'Không có nhóm'}.`,
    });
  } catch (err: any) {
    console.error('[adminAssignUserToTeam] Error:', err);
    res.status(500).json({ success: false, error: `Lỗi chuyển nhóm: ${err.message}` });
  }
});

// Health check API
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    adminConfigured: Boolean(adminAuth && adminDb),
    timestamp: new Date().toISOString(),
  });
});

// Fallback 404 handler specifically for /api routes so they NEVER return HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: `Đường dẫn API không tồn tại (${req.method} ${req.path})`,
  });
});

// Global API error handler
app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  console.error(`[API Error Handler] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    success: false,
    error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
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
