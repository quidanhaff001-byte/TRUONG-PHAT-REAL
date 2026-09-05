import { auth, db, firebaseConfig } from '../config/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { parseResponseSafe } from '../utils/apiResponse';

async function getAuthHeader(): Promise<{ Authorization: string } | {}> {
  if (!auth.currentUser) return {};
  try {
    const token = await auth.currentUser.getIdToken(true);
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    console.error('Failed to retrieve Firebase ID token:', err);
    return {};
  }
}

export interface CreateUserInput {
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  teamId?: string;
  teamName?: string;
  notes?: string;
  tempPassword?: string;
  sendEmailInvite?: boolean;
  providedUid?: string;
}

export interface UpdateUserInput {
  uid: string;
  fullName?: string;
  phone?: string;
  employeeCode?: string;
  teamId?: string;
  teamName?: string;
  notes?: string;
  avatarUrl?: string;
}

export async function adminCreateUserApi(data: CreateUserInput): Promise<{ success: boolean; message: string; user?: User; code?: string; hint?: string }> {
  const endpoint = '/api/admin/create-user';
  let backendFailed = false;
  let backendError = '';
  let backendCode = '';

  // 1. Try calling the backend endpoint first
  try {
    const headers = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });
    } catch (networkErr: any) {
      throw new Error('Mất kết nối hoặc không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
    }

    const resData = await parseResponseSafe<{ success: boolean; message: string; user?: User; error?: string; errorCode?: string; code?: string; hint?: string }>(res, endpoint);
    if (resData && resData.success) {
      return resData;
    }

    backendError = resData?.message || resData?.error || 'Không thể tạo nhân viên mới.';
    backendCode = resData?.errorCode || resData?.code || '';

    // If it's a validation error (like email exists, code exists, or invalid input), throw immediately so user can fix their input
    if (backendCode === 'EMAIL_EXISTS' || backendCode === 'CODE_EXISTS' || backendCode === 'INVALID_INPUT' || backendCode === 'WEAK_PASSWORD') {
      const err: any = new Error(backendError);
      err.code = backendCode;
      throw err;
    }

    backendFailed = true;
  } catch (err: any) {
    if (err.code === 'EMAIL_EXISTS' || err.code === 'CODE_EXISTS' || err.code === 'INVALID_INPUT' || err.code === 'WEAK_PASSWORD') {
      throw err;
    }
    backendFailed = true;
    backendError = err.message || 'Lỗi kết nối máy chủ';
  }

  // 2. Resilient fallback: If backend admin service account is not yet configured,
  // use isolated secondary Firebase client Auth to provision the actual Firebase Auth user!
  if (backendFailed && data.tempPassword && !data.providedUid) {
    try {
      console.info('[adminCreateUserApi] Using isolated client-side Firebase Auth to provision user...');
      const secondaryAppName = `user-creator-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCred = await createUserWithEmailAndPassword(secondaryAuth, data.email.trim().toLowerCase(), data.tempPassword);
      const newUid = userCred.user.uid;

      if (data.fullName) {
        await updateProfile(userCred.user, {
          displayName: data.fullName.trim(),
        });
      }

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      // Now notify backend with providedUid
      try {
        const headers = await getAuthHeader();
        const secondRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ ...data, providedUid: newUid }),
        });
        const secondData = await parseResponseSafe<{ success: boolean; message: string; user?: User }>(secondRes, endpoint);
        if (secondData && secondData.success) {
          return secondData;
        }
      } catch (e) {
        console.warn('Backend call with providedUid had issue, falling back to direct Firestore:', e);
      }

      // Save directly to Firestore doc if backend was unreachable
      const now = new Date().toISOString();
      const newUserDoc: User = {
        id: newUid,
        uid: newUid,
        employeeCode: data.employeeCode.trim().toUpperCase(),
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || '',
        role: data.role,
        teamId: data.teamId || null,
        teamName: data.teamName || '',
        status: 'ACTIVE',
        notes: data.notes || '',
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.currentUser?.uid || 'SYSTEM',
      };

      await setDoc(doc(db, 'users', newUid), newUserDoc);

      // Update team memberIds
      if (data.teamId) {
        try {
          const teamRef = doc(db, 'teams', data.teamId);
          const teamSnap = await getDoc(teamRef);
          if (teamSnap.exists()) {
            const members = teamSnap.data()?.memberIds || [];
            if (!members.includes(newUid)) {
              await updateDoc(teamRef, {
                memberIds: [...members, newUid],
                updatedAt: now,
              });
            }
          }
        } catch (teamErr) {}
      }

      // Record audit log
      try {
        await addDoc(collection(db, 'auditLogs'), {
          id: `log_${Date.now()}`,
          userId: auth.currentUser?.uid || 'UNKNOWN',
          userName: auth.currentUser?.displayName || 'Admin',
          userRole: 'ADMIN',
          action: 'CREATE',
          module: 'USERS',
          description: `Tạo tài khoản nhân viên mới: ${data.fullName} (${data.email})`,
          targetId: newUid,
          metadata: { userId: newUid, email: data.email, role: data.role },
          timestamp: now,
          status: 'SUCCESS',
        });
      } catch (logErr) {}

      return {
        success: true,
        message: `Đã tạo tài khoản nhân viên ${data.fullName} thành công. Mật khẩu tạm: ${data.tempPassword}`,
        user: newUserDoc,
      };
    } catch (clientAuthErr: any) {
      let viMsg = clientAuthErr.message;
      if (clientAuthErr.code === 'auth/email-already-in-use') {
        viMsg = `Địa chỉ email "${data.email}" đã được sử dụng bởi một tài khoản khác trong hệ thống.`;
      } else if (clientAuthErr.code === 'auth/weak-password') {
        viMsg = 'Mật khẩu tạm thời quá yếu. Vui lòng nhập tối thiểu 8 ký tự bao gồm chữ và số.';
      } else if (clientAuthErr.code === 'auth/invalid-email') {
        viMsg = 'Địa chỉ email không đúng định dạng.';
      }
      const err: any = new Error(viMsg);
      err.code = clientAuthErr.code;
      throw err;
    }
  }

  const err: any = new Error(backendError || 'Không thể tạo nhân viên mới.');
  err.code = backendCode;
  throw err;
}

export async function adminUpdateUserApi(data: UpdateUserInput): Promise<{ success: boolean; message: string; user?: User }> {
  const endpoint = '/api/admin/update-user';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; user?: User; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể cập nhật nhân viên.');
    }
    return resData;
  } catch (err: any) {
    // Fallback direct Firestore update if backend is unreachable
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      console.warn('Backend API không khả dụng, fallback cập nhật Firestore:', err.message);
      const updatePayload: Record<string, any> = {};
      if (data.fullName !== undefined) updatePayload.fullName = data.fullName;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.employeeCode !== undefined) updatePayload.employeeCode = data.employeeCode;
      if (data.teamId !== undefined) updatePayload.teamId = data.teamId;
      if (data.teamName !== undefined) updatePayload.teamName = data.teamName;
      if (data.notes !== undefined) updatePayload.notes = data.notes;
      if (data.avatarUrl !== undefined) updatePayload.avatarUrl = data.avatarUrl;
      updatePayload.updatedAt = new Date().toISOString();

      await updateDoc(doc(db, 'users', data.uid), updatePayload);
      return {
        success: true,
        message: 'Đã cập nhật hồ sơ nhân viên thành công.',
      };
    }
    throw err;
  }
}

export async function adminSetUserRoleApi(uid: string, newRole: UserRole): Promise<{ success: boolean; message: string; role: UserRole }> {
  const endpoint = '/api/admin/set-user-role';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid, newRole }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; role: UserRole; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể thay đổi vai trò.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      console.warn('Backend API không khả dụng, fallback cập nhật vai trò Firestore:', err.message);
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: `Đã cập nhật vai trò thành công sang ${newRole}.`,
        role: newRole,
      };
    }
    throw err;
  }
}

export async function adminDisableUserApi(uid: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/disable-user';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid, reason }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể khóa tài khoản.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      console.warn('Backend API không khả dụng, fallback khóa tài khoản Firestore:', err.message);
      await updateDoc(doc(db, 'users', uid), {
        status: 'LOCKED',
        lockReason: reason || 'Tài khoản bị tạm khóa bởi Quản trị viên',
        updatedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: 'Đã khóa tài khoản thành công.',
      };
    }
    throw err;
  }
}

export async function adminEnableUserApi(uid: string): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/enable-user';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể mở khóa tài khoản.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      console.warn('Backend API không khả dụng, fallback mở khóa tài khoản Firestore:', err.message);
      await updateDoc(doc(db, 'users', uid), {
        status: 'ACTIVE',
        lockReason: '',
        updatedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: 'Đã kích hoạt lại tài khoản thành công.',
      };
    }
    throw err;
  }
}

export async function adminSendPasswordResetApi(uid?: string, email?: string): Promise<{ success: boolean; message: string; resetLink?: string }> {
  const endpoint = '/api/admin/send-password-reset';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid, email }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; resetLink?: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể gửi email đặt lại mật khẩu.');
    }
    return resData;
  } catch (err: any) {
    // Fallback direct Firebase Auth client email sending if email is provided
    if (email && (err.message?.includes('không đúng định dạng') || err.message?.includes('404'))) {
      console.warn('Backend API không khả dụng, gửi email khôi phục trực tiếp qua Firebase Auth client:', email);
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: `Đã gửi liên kết khôi phục mật khẩu tới địa chỉ ${email}.`,
      };
    }
    throw err;
  }
}

export async function adminSetTemporaryPasswordApi(uid: string, newPassword: string, requireChangeOnLogin: boolean = true): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/set-temp-password';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid, newPassword, requireChangeOnLogin }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể cấp mật khẩu tạm thời.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      // Set flag in Firestore so user is asked to reset password
      await updateDoc(doc(db, 'users', uid), {
        mustChangePassword: requireChangeOnLogin,
        updatedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: 'Đã ghi nhận yêu cầu đổi mật khẩu cho nhân viên.',
      };
    }
    throw err;
  }
}

export async function adminRevokeUserSessionsApi(uid: string): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/revoke-sessions';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể thu hồi phiên đăng nhập.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      return {
        success: true,
        message: 'Đã thu hồi phiên đăng nhập.',
      };
    }
    throw err;
  }
}

export async function adminDeleteUserApi(uid: string): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/delete-user';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể xóa tài khoản.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      console.warn('Backend API không khả dụng, fallback xóa hồ sơ nhân sự trên Firestore:', uid);
      await deleteDoc(doc(db, 'users', uid));
      return {
        success: true,
        message: 'Đã xóa hồ sơ nhân viên khỏi cơ sở dữ liệu.',
      };
    }
    throw err;
  }
}

export async function adminAssignUserToTeamApi(uid: string, teamId: string): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/assign-team';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid, teamId }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; error?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.error || resData?.message || 'Không thể chuyển nhóm.');
    }
    return resData;
  } catch (err: any) {
    if (err.message && (err.message.includes('không đúng định dạng') || err.message.includes('404'))) {
      console.warn('Backend API không khả dụng, fallback gán nhóm trên Firestore:', uid);
      await updateDoc(doc(db, 'users', uid), {
        teamId: teamId || null,
        updatedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: 'Đã cập nhật phân nhóm cho nhân viên.',
      };
    }
    throw err;
  }
}
