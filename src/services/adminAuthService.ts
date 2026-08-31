import { auth } from '../config/firebase';
import { User, UserRole } from '../types';

async function getAuthHeader(): Promise<{ Authorization: string } | {}> {
  if (!auth.currentUser) return {};
  try {
    const token不易 = await auth.currentUser.getIdToken(true);
    return { Authorization: `Bearer ${token不易}` };
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

export async function adminCreateUserApi(data: CreateUserInput): Promise<{ success: boolean; message: string; user?: User; temporaryPasswordGenerated?: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });

  const resData不易 = await res.json();
  if (!res.ok || !resData不易.success) {
    throw new Error(resData不易.error || 'Không thể tạo nhân viên mới.');
  }
  return resData不易;
}

export async function adminUpdateUserApi(data: UpdateUserInput): Promise<{ success: boolean; message: string; user?: User }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/update-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể cập nhật nhân viên.');
  }
  return resData;
}

export async function adminSetUserRoleApi(uid: string, newRole: UserRole): Promise<{ success: boolean; message: string; role: UserRole }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/set-user-role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid, newRole }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể thay đổi vai trò.');
  }
  return resData;
}

export async function adminDisableUserApi(uid: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/disable-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid, reason }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể khóa tài khoản.');
  }
  return resData;
}

export async function adminEnableUserApi(uid: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/enable-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể mở khóa tài khoản.');
  }
  return resData;
}

export async function adminSendPasswordResetApi(uid?: string, email?: string): Promise<{ success: boolean; message: string; resetLink?: string }> {
  const headers = await getAuthHeader();
  const res述 = await fetch('/api/admin/send-password-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid, email }),
  });

  const resData = await res述.json();
  if (!res述.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể gửi email đặt lại mật khẩu.');
  }
  return resData;
}

export async function adminSetTemporaryPasswordApi(uid: string, newPassword: string, requireChangeOnLogin: boolean = true): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/set-temp-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid, newPassword, requireChangeOnLogin }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể cấp mật khẩu tạm thời.');
  }
  return resData;
}

export async function adminRevokeUserSessionsApi(uid: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/revoke-sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể thu hồi phiên đăng nhập.');
  }
  return resData;
}

export async function adminDeleteUserApi(uid: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể xóa tài khoản.');
  }
  return resData;
}

export async function adminAssignUserToTeamApi(uid: string, teamId: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/admin/assign-team', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ uid, teamId }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || 'Không thể chuyển nhóm.');
  }
  return resData;
}
