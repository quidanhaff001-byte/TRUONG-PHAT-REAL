import { auth, db } from '../config/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole, CustomRole, WorkStatus } from '../types';
import { parseResponseSafe } from '../utils/apiResponse';
import { mapErrorMessage } from '../utils/errorMapper';

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
  role: string;
  roleName?: string;
  teamId?: string | null;
  teamName?: string;
  department?: string;
  workStatus?: WorkStatus;
  notes?: string;
  tempPassword?: string;
  sendEmailInvite?: boolean;
  providedUid?: string;
}

export interface UpdateUserInput {
  uid: string;
  employeeCode?: string;
  displayName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  roleName?: string;
  teamId?: string | null;
  teamName?: string;
  department?: string;
  directManagerId?: string | null;
  directManagerName?: string;
  dateOfBirth?: string;
  address?: string;
  status?: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  workStatus?: WorkStatus;
  notes?: string;
  avatarUrl?: string;
  customPermissions?: Record<string, boolean>;
  roleHistory?: any[];
}

/**
 * Tạo người dùng mới thông qua Firebase Admin SDK trên Backend
 * Nghiêm cấm dùng createUserWithEmailAndPassword phía client cho luồng Admin tạo nhân viên.
 */
export async function adminCreateUserApi(data: CreateUserInput): Promise<{ success: boolean; message: string; user?: User; code?: string; hint?: string }> {
  const endpoint = '/api/admin/create-user';

  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        employeeCode: data.employeeCode.trim().toUpperCase(),
        displayName: data.fullName.trim(),
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || '',
        role: data.role,
        teamId: data.teamId || null,
        teamName: data.teamName || '',
        notes: data.notes || '',
        tempPassword: data.tempPassword || 'TruongPhat@2025',
        sendEmailInvite: Boolean(data.sendEmailInvite),
        providedUid: data.providedUid,
      }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; data?: { user?: User }; user?: User }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể tạo nhân viên mới.');
    }

    const createdUser = resData.data?.user || resData.user;
    return {
      success: true,
      message: resData.message || 'Tạo tài khoản nhân viên thành công.',
      user: createdUser,
    };
  } catch (err: any) {
    const viMessage = mapErrorMessage(err);
    const customErr: any = new Error(viMessage);
    customErr.code = err.errorCode || err.code;
    throw customErr;
  }
}

/**
 * Cập nhật thông tin nhân viên qua Firebase Admin SDK trên Backend
 * Sử dụng PATCH /api/admin/update-user (hoặc POST /api/admin/update-user)
 */
export async function adminUpdateUserApi(data: UpdateUserInput): Promise<{ success: boolean; message: string; user?: User }> {
  const endpoint = '/api/admin/update-user';
  try {
    const headers = await getAuthHeader();
    const payload = {
      uid: data.uid,
      employeeCode: data.employeeCode ? data.employeeCode.trim().toUpperCase() : undefined,
      displayName: data.displayName || data.fullName,
      fullName: data.fullName || data.displayName,
      email: data.email ? data.email.trim().toLowerCase() : undefined,
      phone: data.phone ? data.phone.trim() : undefined,
      role: data.role,
      teamId: data.teamId !== undefined ? data.teamId : undefined,
      teamName: data.teamName,
      status: data.status,
      notes: data.notes,
      avatarUrl: data.avatarUrl,
    };

    let res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 405 || res.status === 404) {
      // Fallback method POST if proxy requires POST
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });
    }

    const resData = await parseResponseSafe<{ success: boolean; message: string; data?: { user?: User }; user?: User }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể cập nhật nhân viên.');
    }

    // If updating current user's role/claims, refresh token
    if (auth.currentUser && auth.currentUser.uid === data.uid) {
      try {
        await auth.currentUser.getIdToken(true);
      } catch (e) {
        console.warn('Lỗi làm mới token của người dùng hiện tại:', e);
      }
    }

    return {
      success: true,
      message: resData.message || 'Đã cập nhật hồ sơ nhân viên thành công.',
      user: resData.data?.user || resData.user,
    };
  } catch (err: any) {
    const viMessage = mapErrorMessage(err);
    throw new Error(viMessage);
  }
}

export async function adminSetUserRoleApi(uid: string, newRole: UserRole): Promise<{ success: boolean; message: string; role: UserRole }> {
  return adminUpdateUserApi({ uid, role: newRole }).then((res) => ({
    success: res.success,
    message: res.message,
    role: newRole,
  }));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể khóa tài khoản.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể mở khóa tài khoản.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string; data?: { resetLink?: string }; resetLink?: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể tạo liên kết đặt lại mật khẩu.');
    }
    return {
      success: true,
      message: resData.message || 'Đã tạo liên kết đặt lại mật khẩu.',
      resetLink: resData.data?.resetLink || resData.resetLink,
    };
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể cấp mật khẩu tạm thời.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể thu hồi phiên đăng nhập.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể xóa tài khoản.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
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

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể chuyển nhóm.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Kiểm tra trạng thái Firebase Authentication của người dùng
 * Dùng để phát hiện hồ sơ mồ côi (có users/{uid} nhưng không có Auth User)
 */
export async function adminVerifyUserAuthApi(uid: string): Promise<{ exists: boolean; authEmail?: string; isOrphan: boolean }> {
  const endpoint = `/api/admin/verify-user-auth?uid=${encodeURIComponent(uid)}`;
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        ...headers,
      },
    });

    const resData = await parseResponseSafe<{ success: boolean; data: { exists: boolean; authEmail?: string; isOrphan: boolean } }>(res, endpoint);
    if (resData && resData.data) {
      return resData.data;
    }
    return { exists: true, isOrphan: false };
  } catch (e) {
    console.warn('Lỗi kiểm tra trạng thái xác thực người dùng:', e);
    return { exists: true, isOrphan: false };
  }
}

/**
 * Xử lý hồ sơ nhân viên mồ côi
 */
export async function adminResolveOrphanUserApi(
  uid: string,
  action: 'RECREATE_AUTH' | 'DELETE_ORPHAN',
  tempPassword?: string
): Promise<{ success: boolean; message: string }> {
  const endpoint = '/api/admin/resolve-orphan-user';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ uid, action, tempPassword }),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể xử lý hồ sơ mồ côi.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Luân chuyển chức vụ nhân sự kèm lý do và ghi nhận lịch sử chức vụ
 */
export async function adminChangeRoleApi(data: {
  uid: string;
  newRole: string;
  newRoleName?: string;
  reason?: string;
}): Promise<{ success: boolean; message: string; role?: string; roleName?: string; roleHistory?: any[] }> {
  const endpoint = '/api/admin/change-user-role';
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

    const resData = await parseResponseSafe<{
      success: boolean;
      message: string;
      role?: string;
      roleName?: string;
      roleHistory?: any[];
    }>(res, endpoint);

    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể luân chuyển chức vụ.');
    }

    if (auth.currentUser && auth.currentUser.uid === data.uid) {
      try {
        await auth.currentUser.getIdToken(true);
      } catch (e) {
        console.warn('Lỗi làm mới token của người dùng hiện tại:', e);
      }
    }

    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Điều chỉnh phân quyền riêng cho từng nhân sự (Granular Permissions Override)
 */
export async function adminSetUserPermissionsApi(data: {
  uid: string;
  customPermissions: Record<string, boolean>;
}): Promise<{ success: boolean; message: string; customPermissions?: Record<string, boolean> }> {
  const endpoint = '/api/admin/set-user-permissions';
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

    const resData = await parseResponseSafe<{
      success: boolean;
      message: string;
      customPermissions?: Record<string, boolean>;
    }>(res, endpoint);

    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể cập nhật phân quyền riêng.');
    }

    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Điều chuyển phòng ban, đội nhóm và chuyển giao khách hàng
 */
export async function adminTransferTeamApi(data: {
  uid: string;
  newTeamId: string | null;
  newTeamName?: string;
  newDepartment?: string;
  newLeaderId?: string | null;
  newLeaderName?: string;
  customerTransferMode: 'KEEP' | 'ALL' | 'SELECTED';
  targetUserId?: string;
  targetUserName?: string;
  selectedCustomerIds?: string[];
}): Promise<{ success: boolean; message: string; reassignCount?: number }> {
  const endpoint = '/api/admin/transfer-user-team';
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

    const resData = await parseResponseSafe<{
      success: boolean;
      message: string;
      reassignCount?: number;
    }>(res, endpoint);

    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể điều chuyển nhân sự.');
    }

    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Lấy danh sách các chức vụ động (Dynamic Roles)
 */
export async function adminGetRolesApi(): Promise<{ success: boolean; roles: CustomRole[] }> {
  const endpoint = '/api/admin/roles';
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        ...headers,
      },
    });

    const resData = await parseResponseSafe<{ success: boolean; roles: CustomRole[] }>(res, endpoint);
    if (!resData || !resData.success) {
      return { success: false, roles: [] };
    }
    return resData;
  } catch (err: any) {
    console.warn('Lỗi lấy danh sách chức vụ:', err);
    return { success: false, roles: [] };
  }
}

/**
 * Tạo chức vụ mới
 */
export async function adminCreateRoleApi(data: Partial<CustomRole>): Promise<{ success: boolean; message: string; role?: CustomRole }> {
  const endpoint = '/api/admin/roles';
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

    const resData = await parseResponseSafe<{ success: boolean; message: string; role?: CustomRole }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể tạo chức vụ.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Cập nhật chức vụ
 */
export async function adminUpdateRoleApi(roleId: string, data: Partial<CustomRole>): Promise<{ success: boolean; message: string; role?: CustomRole }> {
  const endpoint = `/api/admin/roles/${encodeURIComponent(roleId)}`;
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string; role?: CustomRole }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể cập nhật chức vụ.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}

/**
 * Xóa chức vụ
 */
export async function adminDeleteRoleApi(roleId: string): Promise<{ success: boolean; message: string }> {
  const endpoint = `/api/admin/roles/${encodeURIComponent(roleId)}`;
  try {
    const headers = await getAuthHeader();
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        ...headers,
      },
    });

    const resData = await parseResponseSafe<{ success: boolean; message: string }>(res, endpoint);
    if (!resData || !resData.success) {
      throw new Error(resData?.message || 'Không thể xóa chức vụ.');
    }
    return resData;
  } catch (err: any) {
    throw new Error(mapErrorMessage(err));
  }
}
