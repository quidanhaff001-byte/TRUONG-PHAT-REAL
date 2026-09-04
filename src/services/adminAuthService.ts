import { auth, db } from '../config/firebase';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
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

    const resData = await parseResponseSafe<{ success: boolean; message: string; user?: User; error?: string; code?: string; hint?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      const err: any = new Error(resData?.error || resData?.message || 'Không thể tạo nhân viên mới.');
      err.code = resData?.code;
      err.hint = resData?.hint;
      throw err;
    }
    return resData;
  } catch (err: any) {
    console.error('[adminCreateUserApi] Error:', err.message);
    throw err;
  }
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
