import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { auth, db, isFirebaseConfigured, googleProvider } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from './ToastContext';
import { sendAuditLogToBackend } from '../services/auditLogService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isFirebaseActive: boolean;
  isAdmin: boolean;
  isTeamLeader: boolean;
  isAgent: boolean;
  mustChangePassword: boolean;
  loginWithEmail: (accountInput: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  changeMandatoryPassword: (newPassword: string) => Promise<boolean>;
  reauthenticateAdmin: (password: string) => Promise<boolean>;
  switchDemoUser: (userId: string) => void;
  canEditProperty: (propertyCreatedBy?: string, propertyAssignedTo?: string) => boolean;
  canViewConfidentialOwner: (propertyCreatedBy?: string, propertyAssignedTo?: string) => boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Pure Firebase Authentication state - NEVER load from localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseActive] = useState<boolean>(isFirebaseConfigured);
  const { success, error, info } = useToast();

  /**
   * Helper to fetch and strictly validate the user profile from Firestore users/{uid}.
   * Requirement 8: Sau khi đăng nhập, phải đọc hồ sơ users/{uid} từ Firestore.
   * Requirement 9: Nếu không có users/{uid}, trạng thái không ACTIVE hoặc không có role hợp lệ thì đăng xuất ngay.
   */
  const syncUserProfile = async (fbUser: any): Promise<User | null> => {
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      // Requirement 9: Nếu không có users/{uid} -> tự động thiết lập cho Quản trị viên hệ thống hoặc đăng xuất
      if (!userSnap.exists()) {
        if (fbUser.email === 'quidanh.aff001@gmail.com') {
          const adminDoc: User = {
            id: fbUser.uid,
            uid: fbUser.uid,
            employeeCode: 'ADMIN-001',
            fullName: fbUser.displayName || 'Quản Trị Viên Hệ Thống',
            email: 'quidanh.aff001@gmail.com',
            phone: '0919 414 884',
            role: 'ADMIN',
            status: 'ACTIVE',
            startDate: '2022-01-01',
            notes: 'Quản trị viên toàn hệ thống BDS Trường Phát Real - Chi nhánh An Giang',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, adminDoc, { merge: true });
          setCurrentUser(adminDoc);
          return adminDoc;
        }

        console.warn(`Tài khoản ${fbUser.uid} chưa có hồ sơ users/{uid} trên Firestore`);
        await signOut(auth);
        setCurrentUser(null);
        error(
          'Chưa có hồ sơ nhân sự',
          `Tài khoản (${fbUser.email || fbUser.uid}) chưa có hồ sơ nhân viên trong hệ thống (users/${fbUser.uid}). Vui lòng liên hệ Quản trị viên để được tạo hồ sơ.`
        );
        return null;
      }

      const firestoreData = userSnap.data() as User;

      // Requirement 9: Kiểm tra trạng thái: Nếu không ACTIVE -> đăng xuất ngay
      if (firestoreData.status !== 'ACTIVE') {
        await signOut(auth);
        setCurrentUser(null);
        error('Tài khoản bị khóa', 'Tài khoản nhân sự của bạn đang trong trạng thái bị khóa hoặc ngừng hoạt động.');
        return null;
      }

      const isSystemAdmin =
        fbUser.email === 'quidanh.aff001@gmail.com' ||
        firestoreData.role === 'ADMIN';

      // Requirement 9: Kiểm tra role: Nếu không có role hợp lệ -> đăng xuất ngay
      const validRoles: UserRole[] = ['ADMIN', 'TEAM_LEADER', 'AGENT'];
      const effectiveRole: UserRole = isSystemAdmin ? 'ADMIN' : firestoreData.role;

      if (!effectiveRole || !validRoles.includes(effectiveRole)) {
        await signOut(auth);
        setCurrentUser(null);
        error('Phân quyền không hợp lệ', 'Tài khoản chưa được phân quyền vai trò hợp lệ trong hệ thống.');
        return null;
      }

      const verifiedUser: User = {
        ...firestoreData,
        id: fbUser.uid,
        uid: fbUser.uid,
        role: effectiveRole,
        email: fbUser.email || firestoreData.email,
        lastLoginAt: new Date().toISOString(),
      };

      // Non-blocking update of lastLoginAt in Firestore
      updateDoc(userDocRef, {
        lastLoginAt: new Date().toISOString(),
      }).catch(() => {});

      setCurrentUser(verifiedUser);
      return verifiedUser;
    } catch (err: any) {
      console.error('Lỗi khi đọc hồ sơ users/{uid}:', err);
      await signOut(auth);
      setCurrentUser(null);
      error('Lỗi xác thực hồ sơ', 'Không thể xác thực hồ sơ nhân sự từ Firestore. Hệ thống đã đăng xuất an toàn.');
      return null;
    }
  };

  /**
   * Requirement 5: ProtectedRoute phải kiểm tra Firebase onAuthStateChanged.
   * Requirement 6: Không cho truy cập Dashboard chỉ dựa vào dữ liệu local.
   * Requirement 2: Xóa dữ liệu đăng nhập giả khỏi LocalStorage/SessionStorage.
   */
  useEffect(() => {
    // Xóa sạch toàn bộ dữ liệu session giả trong storage
    try {
      localStorage.removeItem('tp_current_user');
      sessionStorage.removeItem('tp_current_user');
    } catch {}

    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          await syncUserProfile(fbUser);
        } else {
          setCurrentUser(null);
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, []);

  /**
   * Requirement 3: Chỉ chuyển vào Dashboard khi Firebase signInWithEmailAndPassword trả về user hợp lệ.
   * Requirement 4: Nếu Firebase trả lỗi, phải giữ nguyên tại trang đăng nhập và báo lỗi tiếng Việt.
   * Requirement 15: Kiểm tra lại để bảo đảm nhập sai mật khẩu tuyệt đối không thể vào hệ thống.
   * Requirement 1: Xóa toàn bộ tài khoản mẫu, mock session và cơ chế đăng nhập dự phòng.
   */
  const loginWithEmail = async (accountInput: string, pass: string): Promise<boolean> => {
    const cleanAccount = accountInput.trim();
    const cleanPass = pass.trim();

    if (!cleanAccount) {
      error('Thiếu thông tin', 'Vui lòng nhập Email đăng nhập.');
      return false;
    }
    if (!cleanPass) {
      error('Thiếu thông tin', 'Vui lòng nhập Mật khẩu.');
      return false;
    }

    if (!cleanAccount.includes('@')) {
      error('Email không hợp lệ', 'Vui lòng nhập đúng định dạng Email đã được đăng ký trên hệ thống.');
      return false;
    }

    if (!isFirebaseConfigured) {
      error('Chưa kết nối Firebase', 'Hệ thống chưa kết nối được đến máy chủ Firebase Authentication.');
      return false;
    }

    try {
      setIsLoading(true);

      // CHỈ đăng nhập qua Firebase Authentication - TUYỆT ĐỐI KHÔNG FALLBACK
      const userCred = await signInWithEmailAndPassword(auth, cleanAccount, cleanPass);

      // Đọc và kiểm tra hồ sơ users/{uid} từ Firestore
      const verifiedProfile = await syncUserProfile(userCred.user);
      if (!verifiedProfile) {
        return false;
      }

      success('Đăng nhập thành công', `Chào mừng ${verifiedProfile.fullName} (${getRoleName(verifiedProfile.role)})`);
      sendAuditLogToBackend({
        action: 'LOGIN',
        module: 'USERS',
        recordId: verifiedProfile.id,
        recordCode: verifiedProfile.employeeCode,
        recordName: verifiedProfile.fullName,
        description: `Người dùng ${verifiedProfile.fullName} (${verifiedProfile.employeeCode}) đăng nhập thành công`,
        userId: verifiedProfile.id,
        userName: verifiedProfile.fullName,
        userEmail: verifiedProfile.email,
        userRole: verifiedProfile.role,
        level: 'INFO',
      });
      return true;
    } catch (fbAuthErr: any) {
      console.warn('Firebase login attempt failed:', fbAuthErr.code, fbAuthErr.message);

      // Báo lỗi bằng tiếng Việt rõ ràng cho từng mã lỗi Firebase Authentication
      let message = 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      if (
        fbAuthErr.code === 'auth/invalid-credential' ||
        fbAuthErr.code === 'auth/wrong-password' ||
        fbAuthErr.code === 'auth/user-not-found'
      ) {
        message = 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      } else if (fbAuthErr.code === 'auth/invalid-email') {
        message = 'Địa chỉ email không đúng định dạng. Vui lòng kiểm tra lại.';
      } else if (fbAuthErr.code === 'auth/user-disabled') {
        message = 'Tài khoản này đã bị khóa trên hệ thống.';
      } else if (fbAuthErr.code === 'auth/too-many-requests') {
        message = 'Đã thử đăng nhập sai quá nhiều lần. Vui lòng đợi ít phút trước khi thử lại.';
      } else if (fbAuthErr.code === 'auth/network-request-failed') {
        message = 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối Internet.';
      } else if (fbAuthErr.message) {
        message = `Lỗi xác thực: ${fbAuthErr.message}`;
      }

      error('Đăng nhập thất bại', message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!isFirebaseConfigured) {
        error('Lỗi cấu hình', 'Firebase chưa được thiết lập.');
        return false;
      }
      const result = await signInWithPopup(auth, googleProvider);
      const verified = await syncUserProfile(result.user);
      if (!verified) return false;
      success('Đăng nhập Google thành công');
      sendAuditLogToBackend({
        action: 'LOGIN',
        module: 'USERS',
        recordId: verified.id,
        recordCode: verified.employeeCode,
        recordName: verified.fullName,
        description: `Người dùng ${verified.fullName} (${verified.employeeCode}) đăng nhập bằng Google`,
        userId: verified.id,
        userName: verified.fullName,
        userEmail: verified.email,
        userRole: verified.role,
        level: 'INFO',
      });
      return true;
    } catch (err: any) {
      error('Đăng nhập Google thất bại', err.message || 'Lỗi đăng nhập Google');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser) {
      sendAuditLogToBackend({
        action: 'LOGOUT',
        module: 'USERS',
        recordId: currentUser.id,
        recordCode: currentUser.employeeCode,
        recordName: currentUser.fullName,
        description: `Người dùng ${currentUser.fullName} (${currentUser.employeeCode}) đăng xuất khỏi hệ thống`,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        level: 'INFO',
      });
    }
    try {
      localStorage.removeItem('tp_current_user');
      sessionStorage.removeItem('tp_current_user');
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    info('Đã đăng xuất', 'Hẹn gặp lại bạn trong phiên làm việc tiếp theo.');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      if (!isFirebaseConfigured) {
        error('Lỗi cấu hình', 'Firebase chưa được cấu hình.');
        return false;
      }
      await sendPasswordResetEmail(auth, email.trim());
      success('Đã gửi email khôi phục', 'Vui lòng kiểm tra hộp thư đến của bạn để đặt lại mật khẩu.');
      return true;
    } catch (err: any) {
      let msg = 'Không thể gửi email đặt lại mật khẩu.';
      if (err.code === 'auth/user-not-found') {
        msg = 'Email này không tồn tại trong hệ thống.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Định dạng email không hợp lệ.';
      }
      error('Gửi thất bại', msg);
      return false;
    }
  };

  // Mandatory password change on first login
  const changeMandatoryPassword = async (newPassword: string): Promise<boolean> => {
    if (!auth.currentUser) {
      error('Lỗi phiên', 'Vui lòng đăng nhập lại.');
      return false;
    }

    try {
      setIsLoading(true);
      await updatePassword(auth.currentUser, newPassword);

      // Update Firestore document
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        mustChangePassword: false,
        lastPasswordChangeAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (currentUser) {
        const updated = { ...currentUser, mustChangePassword: false };
        setCurrentUser(updated);
      }

      success('Đổi mật khẩu thành công', 'Mật khẩu của bạn đã được cập nhật an toàn.');
      return true;
    } catch (err: any) {
      console.error('changeMandatoryPassword error:', err);
      if (err.code === 'auth/requires-recent-login') {
        error('Phiên hết hạn', 'Vui lòng đăng nhập lại để thực hiện đổi mật khẩu.');
      } else {
        error('Đổi mật khẩu thất bại', err.message || 'Lỗi hệ thống');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Re-authenticate admin for sensitive operations
  const reauthenticateAdmin = async (password: string): Promise<boolean> => {
    if (!auth.currentUser || !auth.currentUser.email) {
      return false;
    }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (err: any) {
      console.error('reauthenticateAdmin error:', err);
      return false;
    }
  };

  // Deprecated dummy method to preserve interface compatibility without mock functionality
  const switchDemoUser = () => {
    error('Tính năng bị khóa', 'Cơ chế tài khoản mẫu đã bị vô hiệu hóa.');
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'quidanh.aff001@gmail.com';
  const isTeamLeader = currentUser?.role === 'TEAM_LEADER' || isAdmin;
  const isAgent = currentUser?.role === 'AGENT';
  const mustChangePassword = Boolean(currentUser?.mustChangePassword);

  const canEditProperty = (propertyCreatedBy?: string, propertyAssignedTo?: string) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    if (isTeamLeader) return true;
    return currentUser.id === propertyCreatedBy || currentUser.id === propertyAssignedTo;
  };

  const canViewConfidentialOwner = (propertyCreatedBy?: string, propertyAssignedTo?: string) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    if (isTeamLeader) return true;
    return currentUser.id === propertyCreatedBy || currentUser.id === propertyAssignedTo;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isFirebaseActive,
        isAdmin,
        isTeamLeader,
        isAgent,
        mustChangePassword,
        loginWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        changeMandatoryPassword,
        reauthenticateAdmin,
        switchDemoUser,
        canEditProperty,
        canViewConfidentialOwner,
        canManageUsers: isAdmin,
        canManageTeams: isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function getRoleName(role?: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Quản trị viên';
    case 'TEAM_LEADER':
      return 'Trưởng nhóm';
    case 'AGENT':
      return 'Môi giới';
    default:
      return 'Nhân viên';
  }
}
