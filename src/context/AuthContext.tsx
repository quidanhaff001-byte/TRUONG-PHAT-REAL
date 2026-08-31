import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { SAMPLE_USERS } from '../data/sampleData';
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('tp_current_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('tp_current_user') && isFirebaseConfigured;
    } catch {
      return true;
    }
  });

  const [isFirebaseActive] = useState<boolean>(isFirebaseConfigured);
  const { success, error, info } = useToast();

  // Helper to load or sync user profile
  const syncUserProfile = async (fbUser: any) => {
    try {
      // 1. Get Custom Claims
      const tokenResult = await fbUser.getIdTokenResult(true);
      const claimRole = (tokenResult.claims.role as UserRole) || (tokenResult.claims.admin ? 'ADMIN' : undefined);

      // 2. Get Firestore Document
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      const isDefaultAdmin =
        fbUser.email === 'quidanh.aff001@gmail.com' ||
        fbUser.email?.toLowerCase().includes('admin') ||
        claimRole === 'ADMIN';

      if (userSnap.exists()) {
        const firestoreData = userSnap.data() as User;

        // Check if account is locked
        if (firestoreData.status === 'LOCKED') {
          await signOut(auth);
          setCurrentUser(null);
          localStorage.removeItem('tp_current_user');
          error('Tài khoản bị khóa', 'Tài khoản của bạn đang bị khóa bởi Quản trị viên sàn.');
          return;
        }

        const effectiveRole: UserRole = claimRole || firestoreData.role || (isDefaultAdmin ? 'ADMIN' : 'AGENT');
        const updatedUser: User = {
          ...firestoreData,
          id: fbUser.uid,
          uid: fbUser.uid,
          role: effectiveRole,
          email: fbUser.email || firestoreData.email,
          lastLoginAt: new Date().toISOString(),
        };

        // Update last login in Firestore non-blockingly
        updateDoc(userDocRef, {
          lastLoginAt: new Date().toISOString(),
          ...(claimRole ? { role: claimRole } : {}),
        }).catch(() => {});

        setCurrentUser(updatedUser);
        localStorage.setItem('tp_current_user', JSON.stringify(updatedUser));
      } else {
        // Create initial Firestore user document
        const newUser: User = {
          id: fbUser.uid,
          uid: fbUser.uid,
          employeeCode: `TP-${Math.floor(100 + Math.random() * 900)}`,
          fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Chuyên viên TRUONG PHAT',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '0919414884',
          avatarUrl: fbUser.photoURL || undefined,
          role: isDefaultAdmin ? 'ADMIN' : 'AGENT',
          status: 'ACTIVE',
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          propertiesCount: 0,
          customersCount: 0,
          dealsCount: 0,
        };

        await setDoc(userDocRef, newUser, { merge: true });
        setCurrentUser(newUser);
        localStorage.setItem('tp_current_user', JSON.stringify(newUser));
      }
    } catch (err: any) {
      console.error('Error fetching Firestore user profile:', err);
      // Fallback
      const fallbackUser: User = {
        id: fbUser.uid,
        uid: fbUser.uid,
        employeeCode: 'TP-001',
        fullName: fbUser.displayName || 'Nhân sự TRUONG PHAT',
        email: fbUser.email || '',
        phone: '0919414884',
        role: fbUser.email === 'quidanh.aff001@gmail.com' ? 'ADMIN' : 'AGENT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(fallbackUser);
      localStorage.setItem('tp_current_user', JSON.stringify(fallbackUser));
    }
  };

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          await syncUserProfile(fbUser);
        } else {
          const savedUser = localStorage.getItem('tp_current_user');
          if (savedUser) {
            try {
              setCurrentUser(JSON.parse(savedUser));
            } catch (e) {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const switchDemoUser = (userId: string) => {
    const target = SAMPLE_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem('tp_current_user', JSON.stringify(target));
      success('Đã chuyển tài khoản', `Bạn đang thao tác với vai trò ${getRoleName(target.role)}: ${target.fullName}`);
    }
  };

  const loginWithEmail = async (accountInput: string, pass: string): Promise<boolean> => {
    const cleanAccount = accountInput.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanAccount) {
      error('Thiếu thông tin', 'Vui lòng nhập Email hoặc Mã nhân sự');
      return false;
    }
    if (!cleanPass) {
      error('Thiếu thông tin', 'Vui lòng nhập Mật khẩu');
      return false;
    }

    try {
      setIsLoading(true);

      // If Firebase Auth is configured
      if (isFirebaseConfigured) {
        let emailToLogin = cleanAccount;

        // If user entered employeeCode instead of email, check sample or firestore lookup
        if (!cleanAccount.includes('@')) {
          const matchedSample = SAMPLE_USERS.find(
            (u) => u.employeeCode.toLowerCase() === cleanAccount || (cleanAccount === 'admin' && u.role === 'ADMIN')
          );
          if (matchedSample) {
            emailToLogin = matchedSample.email;
          }
        }

        try {
          const userCred = await signInWithEmailAndPassword(auth, emailToLogin, cleanPass);
          await syncUserProfile(userCred.user);
          success('Đăng nhập thành công', `Chào mừng ${userCred.user.displayName || emailToLogin}`);
          return true;
        } catch (fbAuthErr: any) {
          console.warn('Firebase login attempt failed:', fbAuthErr.code, fbAuthErr.message);

          // Fallback to sample user if offline / local demo test accounts match
          const matched = SAMPLE_USERS.find(
            (u) =>
              u.email.toLowerCase() === cleanAccount ||
              u.employeeCode.toLowerCase() === cleanAccount ||
              (cleanAccount === 'admin' && u.role === 'ADMIN')
          );

          if (matched) {
            if (matched.status === 'LOCKED') {
              error('Tài khoản bị khóa', 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Quản trị viên sàn.');
              return false;
            }
            setCurrentUser(matched);
            localStorage.setItem('tp_current_user', JSON.stringify(matched));
            success('Đăng nhập thành công', `Chào mừng ${matched.fullName} (${getRoleName(matched.role)})`);
            return true;
          }

          if (fbAuthErr.code === 'auth/user-not-found' || fbAuthErr.code === 'auth/invalid-credential' || fbAuthErr.code === 'auth/wrong-password') {
            error('Đăng nhập thất bại', 'Tài khoản hoặc mật khẩu không chính xác.');
          } else if (fbAuthErr.code === 'auth/user-disabled') {
            error('Tài khoản bị khóa', 'Tài khoản này đã bị vô hiệu hóa trong hệ thống.');
          } else {
            error('Đăng nhập thất bại', fbAuthErr.message || 'Lỗi xác thực.');
          }
          return false;
        }
      }

      // Offline mode fallback
      const matched = SAMPLE_USERS.find(
        (u) =>
          u.email.toLowerCase() === cleanAccount ||
          u.employeeCode.toLowerCase() === cleanAccount ||
          (cleanAccount === 'admin' && u.role === 'ADMIN')
      );

      if (matched) {
        if (matched.status === 'LOCKED') {
          error('Tài khoản bị khóa', 'Tài khoản của bạn đang bị tạm khóa.');
          return false;
        }
        setCurrentUser(matched);
        localStorage.setItem('tp_current_user', JSON.stringify(matched));
        success('Đăng nhập thành công', `Chào mừng ${matched.fullName}`);
        return true;
      }

      error('Tài khoản không tồn tại', 'Không tìm thấy Email hoặc Mã nhân sự trong hệ thống.');
      return false;
    } catch (err: any) {
      error('Đăng nhập thất bại', err.message || 'Lỗi không xác định.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (isFirebaseConfigured) {
        const result = await signInWithPopup(auth, googleProvider);
        await syncUserProfile(result.user);
        success('Đăng nhập Google thành công');
        return true;
      } else {
        const adminUser = SAMPLE_USERS[0];
        setCurrentUser(adminUser);
        localStorage.setItem('tp_current_user', JSON.stringify(adminUser));
        success('Đăng nhập Google thành công', `Đăng nhập với email Quản trị: ${adminUser.email}`);
        return true;
      }
    } catch (err: any) {
      error('Đăng nhập Google thất bại', err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('tp_current_user');
    if (isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error(err);
      }
    }
    setCurrentUser(null);
    info('Đã đăng xuất', 'Hẹn gặp lại bạn trong phiên làm việc tiếp theo');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      if (isFirebaseConfigured) {
        await sendPasswordResetEmail(auth, email);
        success('Đã gửi email khôi phục', 'Vui lòng kiểm tra hộp thư đến của bạn.');
        return true;
      } else {
        success('Yêu cầu đã tiếp nhận', `Đã gửi hướng dẫn khôi phục mật khẩu tới địa chỉ ${email}`);
        return true;
      }
    } catch (err: any) {
      error('Gửi thất bại', err.message);
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
        localStorage.setItem('tp_current_user', JSON.stringify(updated));
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

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'quidanh.aff001@gmail.com';
  const isTeamLeader = currentUser?.role === 'TEAM_LEADER' || isAdmin;
  const isAgent = currentUser?.role === 'AGENT';
  const mustChangePassword = Boolean(currentUser?.mustChangePassword);

  const canEditProperty = (propertyCreatedBy?: string, propertyAssignedTo?: string) => {
    if (isAdmin) return true;
    if (isTeamLeader) return true;
    if (!currentUser) return false;
    return currentUser.id === propertyCreatedBy || currentUser.id === propertyAssignedTo;
  };

  const canViewConfidentialOwner = (propertyCreatedBy?: string, propertyAssignedTo?: string) => {
    if (isAdmin) return true;
    if (isTeamLeader) return true;
    if (!currentUser) return false;
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
