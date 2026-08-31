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
  signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from './ToastContext';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isFirebaseActive: boolean;
  isAdmin: boolean;
  isTeamLeader: boolean;
  isAgent: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
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
    // If we already have a saved user session in localStorage, we can start non-blocking
    try {
      return !localStorage.getItem('tp_current_user') && isFirebaseConfigured;
    } catch {
      return true;
    }
  });
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(isFirebaseConfigured);
  const { success, error, info } = useToast();

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            // Fetch user profile directly from Firestore
            const userDocRef = doc(db, 'users', fbUser.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
              const userData = userSnap.data() as User;
              setCurrentUser(userData);
              localStorage.setItem('tp_current_user', JSON.stringify(userData));
            } else {
              // Create user document in Firestore on first login
              const isDefaultAdmin = fbUser.email === 'quidanh.aff001@gmail.com' || fbUser.email?.includes('admin');
              const newUser: User = {
                id: fbUser.uid,
                employeeCode: `TP-${Math.floor(100 + Math.random() * 900)}`,
                fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Chuyên viên TRUONG PHAT REAL',
                email: fbUser.email || '',
                phone: fbUser.phoneNumber || '0919414884',
                avatarUrl: fbUser.photoURL || undefined,
                role: isDefaultAdmin ? 'ADMIN' : 'AGENT',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newUser, { merge: true });
              setCurrentUser(newUser);
              localStorage.setItem('tp_current_user', JSON.stringify(newUser));
            }
          } catch (err) {
            console.error('Error fetching Firestore user profile:', err);
            // Fallback user object
            const fallbackUser: User = {
              id: fbUser.uid,
              employeeCode: `TP-001`,
              fullName: fbUser.displayName || 'Nhân sự TRUONG PHAT REAL',
              email: fbUser.email || '',
              phone: '0919414884',
              role: fbUser.email === 'quidanh.aff001@gmail.com' ? 'ADMIN' : 'AGENT',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            };
            setCurrentUser(fallbackUser);
            localStorage.setItem('tp_current_user', JSON.stringify(fallbackUser));
          }
        } else {
          // If no active Firebase auth session and no saved local session, keep logged out
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
      setIsLoading(false);
    }
  }, []);

  const switchDemoUser = (userId: string) => {
    const target = SAMPLE_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem('tp_current_user', JSON.stringify(target));
      success('Đã đổi tài khoản', `Bạn đang thao tác với vai trò ${getRoleName(target.role)}: ${target.fullName}`);
    }
  };

  const loginWithEmail = async (accountInput: string, pass: string): Promise<boolean> => {
    const cleanAccount = accountInput.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanAccount) {
      error('Thiếu thông tin', 'Vui lòng nhập Email hoặc Mã nhân sự đã cấp');
      return false;
    }
    if (!cleanPass) {
      error('Thiếu thông tin', 'Vui lòng nhập Mật khẩu bảo mật');
      return false;
    }

    try {
      setIsLoading(true);

      // Check if input matches any provisioned account (by email, employeeCode, or 'admin' alias)
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

        // Try Firebase auth if it's an email
        if (isFirebaseConfigured && cleanAccount.includes('@')) {
          try {
            await signInWithEmailAndPassword(auth, cleanAccount, cleanPass);
          } catch (fbErr: any) {
            console.warn('Firebase signIn notice:', fbErr.message);
          }
        }

        setCurrentUser(matched);
        localStorage.setItem('tp_current_user', JSON.stringify(matched));
        success('Đăng nhập thành công', `Chào mừng ${matched.fullName} (${getRoleName(matched.role)})`);
        return true;
      }

      // If Firebase is configured and user typed an email not in sample data
      if (isFirebaseConfigured && cleanAccount.includes('@')) {
        try {
          await signInWithEmailAndPassword(auth, cleanAccount, cleanPass);
          success('Đăng nhập thành công', 'Chào mừng bạn quay trở lại TRUONG PHAT REAL');
          return true;
        } catch (fbAuthErr: any) {
          error('Đăng nhập thất bại', 'Tài khoản hoặc mật khẩu không chính xác.');
          return false;
        }
      }

      error('Tài khoản không tồn tại', 'Không tìm thấy Email hoặc Mã nhân sự trong hệ thống. Vui lòng kiểm tra lại.');
      return false;
    } catch (err: any) {
      error('Đăng nhập thất bại', err.message || 'Email hoặc mật khẩu không chính xác.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (isFirebaseConfigured) {
        await signInWithPopup(auth, googleProvider);
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

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'quidanh.aff001@gmail.com';
  const isTeamLeader = currentUser?.role === 'TEAM_LEADER' || isAdmin;
  const isAgent = currentUser?.role === 'AGENT';

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
        loginWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
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
