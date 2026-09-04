import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth, getRoleName } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserPlus,
  Shield,
  Phone,
  Mail,
  Lock,
  Unlock,
  Edit,
  Building,
  UserCheck,
  Search,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Send,
  LogOut,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Camera,
  ExternalLink,
  AlertCircle,
  Terminal,
} from 'lucide-react';
import { User, Team, UserRole } from '../../types';
import { RoleBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { uploadUserAvatar } from '../../utils/fileUpload';
import { AdminReauthModal } from '../../components/auth/AdminReauthModal';
import {
  adminCreateUserApi,
  adminUpdateUserApi,
  adminSetUserRoleApi,
  adminDisableUserApi,
  adminEnableUserApi,
  adminSendPasswordResetApi,
  adminSetTemporaryPasswordApi,
  adminRevokeUserSessionsApi,
  adminDeleteUserApi,
  adminAssignUserToTeamApi,
} from '../../services/adminAuthService';

export const UserList: React.FC = () => {
  const { users, teams, addTeam, updateTeam, deleteTeam } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Loading indicator for async Admin actions
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMsg, setProcessingMsg] = useState<string>('');

  // Avatar Upload State
  const [avatarUploadingUserId, setAvatarUploadingUserId] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUserForAvatar, setSelectedUserForAvatar] = useState<User | null>(null);

  // User Create / Edit Modal State
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creationMode, setCreationMode] = useState<'AUTO' | 'FIREBASE_CONSOLE_UID'>('AUTO');
  const [providedUid, setProvidedUid] = useState<string>('');
  const [backendNotice, setBackendNotice] = useState<{ code?: string; message: string; hint?: string } | null>(null);
  const [userFormData, setUserFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    employeeCode: string;
    role: UserRole;
    teamId: string;
    notes: string;
    tempPassword: string;
    sendResetEmailAfterCreation: boolean;
  }>({
    fullName: '',
    email: '',
    phone: '',
    employeeCode: `NV-${Math.floor(100 + Math.random() * 900)}`,
    role: 'AGENT',
    teamId: '',
    notes: '',
    tempPassword: '',
    sendResetEmailAfterCreation: false,
  });

  // Created Account Result Modal (confirms account creation securely)
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{
    user: any;
  } | null>(null);

  // Role Change Modal State
  const [roleChangeTarget, setRoleChangeTarget] = useState<User | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('AGENT');

  // Team Assignment Modal State
  const [teamChangeTarget, setTeamChangeTarget] = useState<User | null>(null);
  const [selectedNewTeamId, setSelectedNewTeamId] = useState<string>('');

  // Lock / Unlock Confirmation State
  const [lockTarget, setLockTarget] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState<string>('');

  // Temp Password Modal State
  const [tempPassTarget, setTempPassTarget] = useState<User | null>(null);
  const [newTempPassword, setNewTempPassword] = useState<string>('');
  const [showTempPass, setShowTempPass] = useState<boolean>(false);
  const [requireChangeOnFirstLogin, setRequireChangeOnFirstLogin] = useState<boolean>(true);

  // Re-authentication Modal State
  const [reauthConfig, setReauthConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: async () => {},
  });

  // Action Menu state for row
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Team Modal State
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState<{
    name: string;
    description: string;
    leaderId: string;
  }>({
    name: '',
    description: '',
    leaderId: '',
  });

  // Handle Avatar trigger
  const canEditAvatar = (targetUser: User) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return currentUser.id === targetUser.id;
  };

  const handleTriggerAvatarUpload罕 = (u: User) => {
    if (!canEditAvatar(u)) {
      error('Không có quyền', 'Bạn chỉ có quyền thay đổi ảnh đại diện của chính mình.');
      return;
    }
    setSelectedUserForAvatar(u);
    avatarFileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file不可 = e.target.files?.[0];
    if (!file不可 || !selectedUserForAvatar) return;

    try {
      setAvatarUploadingUserId(selectedUserForAvatar.id);
      const downloadUrl = await uploadUserAvatar(selectedUserForAvatar.id, file不可);
      await adminUpdateUserApi({ uid: selectedUserForAvatar.id, avatarUrl: downloadUrl });
      success('Cập nhật ảnh thành công', `Đã đổi ảnh đại diện cho ${selectedUserForAvatar.fullName}.`);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      error('Lỗi tải ảnh', err.message || 'Không thể tải ảnh.');
    } finally {
      setAvatarUploadingUserId(null);
      setSelectedUserForAvatar(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // 1. Create or Update User Handler
  const handleOpenUserModal = (u?: User) => {
    setBackendNotice(null);
    setCreationMode('AUTO');
    setProvidedUid('');
    if (u) {
      setEditingUser(u);
      setUserFormData({
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        employeeCode: u.employeeCode,
        role: u.role,
        teamId: u.teamId || '',
        notes: u.notes || '',
        tempPassword: '',
        sendResetEmailAfterCreation: false,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        fullName: '',
        email: '',
        phone: '',
        employeeCode: `NV-${Math.floor(100 + Math.random() * 900)}`,
        role: 'AGENT',
        teamId: teams[0]?.id || '',
        notes: '',
        tempPassword: '',
        sendResetEmailAfterCreation: false,
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userFormData.fullName.trim() || !userFormData.email.trim() || !userFormData.phone.trim() || !userFormData.employeeCode.trim()) {
      error('Thiếu thông tin', 'Vui lòng điền đầy đủ Họ tên, Mã nhân viên, Email và Số điện thoại.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormData.email.trim())) {
      error('Email không hợp lệ', 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.');
      return;
    }

    // If manual Firebase Console UID mode
    if (!editingUser && creationMode === 'FIREBASE_CONSOLE_UID') {
      if (!providedUid.trim()) {
        error('Thiếu User UID', 'Vui lòng nhập User UID lấy từ Firebase Authentication Console.');
        return;
      }
    }

    // If auto mode and password is typed, check complexity on client
    if (!editingUser && creationMode === 'AUTO' && userFormData.tempPassword.trim()) {
      const pwd = userFormData.tempPassword.trim();
      if (
        pwd.length < 8 ||
        !/[A-Z]/.test(pwd) ||
        !/[a-z]/.test(pwd) ||
        !/[0-9]/.test(pwd) ||
        !/[!@#$%^&*(),.?":{}|<>]/.test(pwd)
      ) {
        error(
          'Mật khẩu không đủ mạnh',
          'Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
        );
        return;
      }
    }

    try {
      setIsProcessing(true);

      if (editingUser) {
        // Update user via Admin SDK API
        setProcessingMsg('Đang cập nhật hồ sơ nhân sự...');
        const selectedTeam = teams.find((t) => t.id === userFormData.teamId);
        await adminUpdateUserApi({
          uid: editingUser.id,
          fullName: userFormData.fullName.trim(),
          phone: userFormData.phone.trim(),
          employeeCode: userFormData.employeeCode.trim().toUpperCase(),
          teamId: userFormData.teamId || undefined,
          teamName: selectedTeam ? selectedTeam.name : '',
          notes: userFormData.notes,
        });

        success('Cập nhật thành công', `Hồ sơ nhân sự ${userFormData.fullName} đã được lưu.`);
        setShowUserModal(false);
      } else {
        // Create user via Admin API
        setProcessingMsg(
          creationMode === 'FIREBASE_CONSOLE_UID'
            ? 'Đang tạo hồ sơ nhân sự liên kết Firebase UID...'
            : 'Đang khởi tạo tài khoản Firebase Authentication và phân quyền...'
        );
        const selectedTeam = teams.find((t) => t.id === userFormData.teamId);

        const result = await adminCreateUserApi({
          employeeCode: userFormData.employeeCode.trim().toUpperCase(),
          fullName: userFormData.fullName.trim(),
          email: userFormData.email.trim().toLowerCase(),
          phone: userFormData.phone.trim(),
          role: userFormData.role,
          teamId: userFormData.teamId || undefined,
          teamName: selectedTeam ? selectedTeam.name : '',
          notes: userFormData.notes,
          tempPassword: userFormData.tempPassword.trim() || undefined,
          sendEmailInvite: userFormData.sendResetEmailAfterCreation,
          providedUid: creationMode === 'FIREBASE_CONSOLE_UID' ? providedUid.trim() : undefined,
        });

        // If requested to send password reset email immediately and option was checked
        if (userFormData.sendResetEmailAfterCreation && result.user) {
          try {
            await adminSendPasswordResetApi(result.user.id, result.user.email);
          } catch (mailErr) {
            console.warn('Could not send reset email:', mailErr);
          }
        }

        success('Tạo tài khoản thành công', `Tài khoản cho ${userFormData.fullName} đã được tạo trên hệ thống.`);
        setShowUserModal(false);

        // Show credentials confirmation modal
        setCreatedAccountInfo({
          user: result.user || {
            fullName: userFormData.fullName,
            email: userFormData.email,
            employeeCode: userFormData.employeeCode,
            role: userFormData.role,
          },
        });
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      const isNotConfigured =
        err.code === 'BACKEND_NOT_CONFIGURED' ||
        err.message?.includes('Chưa cấu hình') ||
        err.status === 503;

      if (isNotConfigured) {
        setBackendNotice({
          code: 'BACKEND_NOT_CONFIGURED',
          message: 'Chưa cấu hình dịch vụ tạo tài khoản.',
          hint:
            err.hint ||
            'Dịch vụ Firebase Admin SDK phía máy chủ cần Service Account Key để gọi API trực tiếp. Tạm thời Quản trị viên hãy tạo user trong Firebase Console, sau đó dán User UID vào đây để hoàn tất tạo hồ sơ.',
        });
        setCreationMode('FIREBASE_CONSOLE_UID');
        error('Chưa cấu hình dịch vụ tạo tài khoản', 'Dịch vụ tạo tự động chưa sẵn sàng. Vui lòng xem hướng dẫn tạo qua Firebase Console bên dưới.');
      } else {
        error('Thao tác thất bại', err.message || 'Không thể lưu thông tin nhân viên.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  // 2. Role Change Handler (with Re-auth if promoting to Admin)
  const handleOpenRoleChange = (u: User) => {
    setRoleChangeTarget(u);
    setSelectedNewRole(u.role);
    setOpenActionMenuId(null);
  };

  const handleExecuteRoleChange = async () => {
    if (!roleChangeTarget) return;

    const doChange = async () => {
      try {
        setIsProcessing(true);
        setProcessingMsg('Đang cập nhật Firebase Custom Claims & thu hồi phiên cũ...');
        await adminSetUserRoleApi(roleChangeTarget.id, selectedNewRole);
        success('Phân quyền thành công', `${roleChangeTarget.fullName} hiện có vai trò ${getRoleName(selectedNewRole)}.`);
        setRoleChangeTarget(null);
      } catch (err: any) {
        error('Lỗi phân quyền', err.message);
      } finally {
        setIsProcessing(false);
        setProcessingMsg('');
      }
    };

    // If promoting to ADMIN or modifying an existing ADMIN, require Admin Re-authentication
    if (selectedNewRole === 'ADMIN' || roleChangeTarget.role === 'ADMIN') {
      setReauthConfig({
        isOpen: true,
        title: 'Xác nhận thay đổi quyền Quản trị (ADMIN)',
        description: `Bạn đang thay đổi phân quyền cấp cao cho tài khoản ${roleChangeTarget.fullName}. Vui lòng nhập mật khẩu Quản trị viên của bạn để tiếp tục.`,
        action: doChange,
      });
    } else {
      await doChange();
    }
  };

  // 3. Team Change Handler
  const handleOpenTeamChange = (u: User) => {
    setTeamChangeTarget(u);
    setSelectedNewTeamId(u.teamId || '');
    setOpenActionMenuId(null);
  };

  const handleExecuteTeamChange = async () => {
    if (!teamChangeTarget) return;
    try {
      setIsProcessing(true);
      setProcessingMsg('Đang chuyển nhóm nhân sự...');
      await adminAssignUserToTeamApi(teamChangeTarget.id, selectedNewTeamId);
      const team = teams.find((t) => t.id === selectedNewTeamId);
      success('Chuyển nhóm thành công', `Đã chuyển ${teamChangeTarget.fullName} sang nhóm ${team ? team.name : 'Không có nhóm'}.`);
      setTeamChangeTarget(null);
    } catch (err: any) {
      error('Lỗi chuyển nhóm', err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  // 4. Lock / Unlock Account Handler
  const handleOpenLockModal = (u: User) => {
    setLockTarget(u);
    setLockReason('');
    setOpenActionMenuId(null);
  };

  const handleExecuteLockToggle = async () => {
    if (!lockTarget) return;
    try {
      setIsProcessing(true);
      if (lockTarget.status === 'ACTIVE') {
        setProcessingMsg('Đang khóa tài khoản & thu hồi phiên đăng nhập...');
        await adminDisableUserApi(lockTarget.id, lockReason);
        success('Đã khóa tài khoản', `Tài khoản ${lockTarget.fullName} đã bị tạm dừng.`);
      } else {
        setProcessingMsg('Đang mở khóa tài khoản...');
        await adminEnableUserApi(lockTarget.id);
        success('Đã mở khóa', `Tài khoản ${lockTarget.fullName} đã hoạt động trở lại.`);
      }
      setLockTarget(null);
    } catch (err: any) {
      error('Lỗi thao tác', err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  // 5. Send Password Reset Email Handler
  const handleSendResetEmail = async (u: User) => {
    setOpenActionMenuId(null);
    try {
      setIsProcessing(true);
      setProcessingMsg('Đang gửi email đặt lại mật khẩu...');
      const res = await adminSendPasswordResetApi(u.id, u.email);
      success('Đã gửi email khôi phục', `Đã gửi liên kết đặt lại mật khẩu tới ${u.email}.`);
    } catch (err: any) {
      error('Gửi email thất bại', err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  // 6. Set Temporary Password Handler
  const handleOpenTempPassModal = (u: User) => {
    setTempPassTarget(u);
    setNewTempPassword(`TP@${Math.floor(100000 + Math.random() * 900000)}#Aa`);
    setShowTempPass(true);
    setRequireChangeOnFirstLogin(true);
    setOpenActionMenuId(null);
  };

  const handleExecuteSetTempPassword = async () => {
    if (!tempPassTarget || !newTempPassword.trim()) return;

    const doSet = async () => {
      try {
        setIsProcessing(true);
        setProcessingMsg('Đang cập nhật mật khẩu tạm thời trên Firebase Auth...');
        await adminSetTemporaryPasswordApi(tempPassTarget.id, newTempPassword.trim(), requireChangeOnFirstLogin);
        success('Cấp mật khẩu thành công', `Đã cập nhật mật khẩu mới cho ${tempPassTarget.fullName}.`);
        
        // Show credentials popup
        setCreatedAccountInfo({
          user: tempPassTarget,
        });
        setTempPassTarget(null);
      } catch (err: any) {
        error('Cấp mật khẩu thất bại', err.message);
      } finally {
        setIsProcessing(false);
        setProcessingMsg('');
      }
    };

    setReauthConfig({
      isOpen: true,
      title: 'Xác nhận cấp mật khẩu tạm thời',
      description: `Bạn đang cấp lại mật khẩu trực tiếp cho tài khoản ${tempPassTarget.fullName} (${tempPassTarget.email}). Mọi phiên đăng nhập hiện tại sẽ bị thu hồi.`,
      action: doSet,
    });
  };

  // 7. Revoke Active Sessions Handler
  const handleRevokeSessions = async (u: User) => {
    setOpenActionMenuId(null);
    try {
      setIsProcessing(true);
      setProcessingMsg('Đang thu hồi tất cả phiên đăng nhập...');
      await adminRevokeUserSessionsApi(u.id);
      success('Đã thu hồi phiên', `Mọi thiết bị đang đăng nhập tài khoản ${u.fullName} sẽ bị đăng xuất.`);
    } catch (err: any) {
      error('Lỗi thu hồi', err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  // 8. Delete User Handler (requires Re-auth)
  const handleDeleteUser = (u: User) => {
    setOpenActionMenuId(null);
    if (u.id === currentUser?.id) {
      error('Không thể xóa', 'Bạn không thể tự xóa tài khoản của chính mình.');
      return;
    }

    setReauthConfig({
      isOpen: true,
      title: `Xác nhận xóa tài khoản ${u.fullName}`,
      description: `Hành động này sẽ XÓA VĨNH VIỄN tài khoản ${u.fullName} (${u.email}) khỏi Firebase Authentication và Cloud Firestore. Thao tác không thể khôi phục.`,
      action: async () => {
        try {
          setIsProcessing(true);
          setProcessingMsg('Đang xóa tài khoản khỏi Authentication và Firestore...');
          await adminDeleteUserApi(u.id);
          success('Đã xóa tài khoản', `Đã xóa tài khoản ${u.fullName} thành công.`);
        } catch (err: any) {
          error('Lỗi xóa tài khoản', err.message);
        } finally {
          setIsProcessing(false);
          setProcessingMsg('');
        }
      },
    });
  };

  // 9. Team CRUD
  const handleOpenTeamModal = (t?: Team) => {
    if (t) {
      setEditingTeam(t);
      setTeamFormData({
        name: t.name,
        description: t.description || '',
        leaderId: t.leaderId || '',
      });
    } else {
      setEditingTeam(null);
      setTeamFormData({
        name: '',
        description: '',
        leaderId: '',
      });
    }
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormData.name.trim()) {
      error('Thiếu thông tin', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      const leader = users.find((u) => u.id === teamFormData.leaderId);
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: teamFormData.name.trim(),
          description: teamFormData.description.trim(),
          leaderId: teamFormData.leaderId || undefined,
          leaderName: leader ? leader.fullName : undefined,
        });
        success('Cập nhật thành công', `Đã cập nhật thông tin nhóm ${teamFormData.name}`);
      } else {
        await addTeam({
          name: teamFormData.name.trim(),
          description: teamFormData.description.trim(),
          leaderId: teamFormData.leaderId || undefined,
          leaderName: leader ? leader.fullName : undefined,
        });
        success('Tạo nhóm thành công', `Đã tạo nhóm kinh doanh ${teamFormData.name}`);
      }
      setShowTeamModal(false);
    } catch (err: any) {
      error('Thất bại', err.message || 'Không thể lưu nhóm');
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${teamName}"? Các thành viên sẽ được chuyển sang trạng thái chưa phân nhóm.`)) {
      try {
        await deleteTeam(teamId);
        success('Đã xóa nhóm', `Đã xóa nhóm ${teamName}`);
      } catch (err: any) {
        error('Xóa thất bại', err.message);
      }
    }
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery紧 =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.employeeCode.toLowerCase().includes(q);

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchTeam = teamFilter === 'ALL' || u.teamId === teamFilter;
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchQuery紧 && matchRole && matchTeam && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Hidden file input for avatar upload */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#001f3f] tracking-tight">NHÂN SỰ & NHÓM KINH DOANH</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#001f3f] text-[#D4AF37] border border-[#D4AF37]/30">
              Firebase Auth RBAC
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Hệ thống quản lý tài khoản định danh thực, phân quyền 3 cấp (Admin, Team Leader, Agent) và bảo mật phiên đăng nhập
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenTeamModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
            >
              <Building className="w-4 h-4 text-slate-500" />
              <span>Thêm nhóm</span>
            </button>
            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-[#D4AF37] text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tạo tài khoản nhân viên</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-[#001f3f] text-[#001f3f]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh sách nhân sự ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'border-[#001f3f] text-[#001f3f]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Nhóm kinh doanh ({teams.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, SĐT hoặc mã nhân viên (NV-001)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37] focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="TEAM_LEADER">Trưởng nhóm (TEAM_LEADER)</option>
                <option value="AGENT">Môi giới (AGENT)</option>
              </select>

              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">Tất cả nhóm</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const isMe = currentUser?.id === u.id;
              const isAvatarUploading = avatarUploadingUserId === u.id;
              const isMenuOpen = openActionMenuId === u.id;

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-2xl border transition-all p-5 shadow-xs relative flex flex-col justify-between ${
                    u.status === 'LOCKED'
                      ? 'border-rose-200 bg-rose-50/20'
                      : isMe
                      ? 'border-[#001f3f]/30 ring-2 ring-[#001f3f]/10'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header Top: Avatar + Info + Role Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <Avatar
                            src={u.avatarUrl}
                            name={u.fullName}
                            size="lg"
                            status={u.status}
                            theme="navy"
                          />
                          {canEditAvatar(u) && (
                            <button
                              type="button"
                              onClick={() => handleTriggerAvatarUpload罕(u)}
                              disabled={isAvatarUploading}
                              title="Thay đổi ảnh đại diện"
                              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#001f3f] text-[#D4AF37] shadow-md border-2 border-white opacity-90 group-hover:opacity-100 hover:scale-110 transition-all cursor-pointer"
                            >
                              {isAvatarUploading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Camera className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#001f3f]">{u.fullName}</span>
                            {isMe && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-500">{u.employeeCode}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <RoleBadge role={u.role} />
                            {u.status === 'LOCKED' && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Đã khóa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Menu Trigger (Only for Admin or self) */}
                      {isAdmin && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenActionMenuId(isMenuOpen ? null : u.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95">
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Quản lý tài khoản
                              </div>

                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenUserModal(u);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                                <span>Sửa thông tin</span>
                              </button>

                              <button
                                onClick={() => handleOpenRoleChange(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5 text-[#b38e22]" />
                                <span>Phân quyền (Role)</span>
                              </button>

                              <button
                                onClick={() => handleOpenTeamChange(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer"
                              >
                                <Building className="w-3.5 h-3.5 text-slate-500" />
                                <span>Chuyển nhóm kinh doanh</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Bảo mật & Phiên
                              </div>

                              <button
                                onClick={() => handleSendResetEmail(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Gửi email đặt lại MK</span>
                              </button>

                              <button
                                onClick={() => handleOpenTempPassModal(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                <span>Cấp mật khẩu tạm thời</span>
                              </button>

                              <button
                                onClick={() => handleRevokeSessions(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer"
                              >
                                <LogOut className="w-3.5 h-3.5 text-orange-500" />
                                <span>Thu hồi mọi phiên đăng nhập</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />

                              {!isMe && (
                                <>
                                  <button
                                    onClick={() => handleOpenLockModal(u)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left font-medium cursor-pointer ${
                                      u.status === 'ACTIVE'
                                        ? 'text-amber-700 hover:bg-amber-50'
                                        : 'text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {u.status === 'ACTIVE' ? (
                                      <>
                                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Khóa tài khoản</span>
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Mở khóa tài khoản</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 text-left font-medium cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Xóa tài khoản vĩnh viễn</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Contact & Team Details */}
                    <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">
                          {u.teamName || (u.teamId ? teams.find((t) => t.id === u.teamId)?.name : 'Chưa phân nhóm')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Metrics & Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-500 font-medium">
                      <span>{u.propertiesCount || 0} BĐS</span>
                      <span>•</span>
                      <span>{u.customersCount || 0} Khách</span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenUserModal(u)}
                          className="p-1.5 text-slate-500 hover:text-[#001f3f] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRoleChange(u)}
                          className="p-1.5 text-slate-500 hover:text-[#b38e22] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Phân quyền"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTempPassModal(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Cấp mật khẩu tạm"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              Không tìm thấy nhân viên nào phù hợp với bộ lọc.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEAMS */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t) => {
            const teamMembers = users.filter((u) => u.teamId === t.id);
            const leader = users.find((u) => u.id === t.leaderId);

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-[#001f3f]">{t.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {t.description || 'Chưa có mô tả nhóm'}
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenTeamModal(t)}
                          className="p-1.5 text-slate-400 hover:text-[#001f3f] hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id, t.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Leader Info */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="text-xs">
                      <div className="text-slate-400 font-medium">Trưởng nhóm:</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {leader ? leader.fullName : t.leaderName || 'Chưa chỉ định'}
                      </div>
                    </div>
                    {leader && (
                      <Avatar src={leader.avatarUrl} name={leader.fullName} size="sm" theme="navy" />
                    )}
                  </div>

                  {/* Member count & list preview */}
                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>Thành viên ({teamMembers.length})</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {teamMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-medium text-slate-700"
                        >
                          <span>{m.fullName}</span>
                          <span className="text-[9px] text-slate-400 uppercase">({m.role})</span>
                        </div>
                      ))}
                      {teamMembers.length === 0 && (
                        <div className="text-xs text-slate-400 italic">Chưa có thành viên nào trong nhóm</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Mã nhóm: {t.id.slice(0, 8)}</span>
                  <span className="font-bold text-[#001f3f]">{teamMembers.length} môi giới</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* MODALS */}
      {/* ========================================== */}

      {/* 1. User Create / Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#001f3f] text-[#D4AF37]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#001f3f]">
                    {editingUser ? 'CẬP NHẬT HỒ SƠ NHÂN VIÊN' : 'TẠO TÀI KHOẢN NHÂN VIÊN MỚI'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser
                      ? 'Chỉnh sửa thông tin hành chính & nhóm'
                      : 'Đăng ký tài khoản Firebase Authentication & phân quyền'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Backend notice if service is unconfigured */}
            {!editingUser && backendNotice && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{backendNotice.message || 'Chưa cấu hình dịch vụ tạo tài khoản.'}</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  {backendNotice.hint ||
                    'Tạm thời Quản trị viên có thể tạo user trong Firebase Console (Authentication > Users > Add user), sau đó dán User UID vào tab bên dưới để thêm hồ sơ users/{uid}.'}
                </p>
                <div className="pt-1">
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#001f3f] hover:underline"
                  >
                    <span>Mở Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Mode Selector for New Users */}
            {!editingUser && (
              <div className="mb-4 flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCreationMode('AUTO')}
                  className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    creationMode === 'AUTO'
                      ? 'bg-white text-[#001f3f] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tự động qua Backend</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('FIREBASE_CONSOLE_UID')}
                  className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    creationMode === 'FIREBASE_CONSOLE_UID'
                      ? 'bg-white text-[#001f3f] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Terminal className="w-4 h-4 text-amber-600" />
                  <span>Nhập UID Firebase Console</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* If manual UID input mode */}
              {!editingUser && creationMode === 'FIREBASE_CONSOLE_UID' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="block font-bold text-slate-800 text-xs">
                    User UID từ Firebase Authentication *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dán User UID từ Firebase Console (VD: 4nC7vK2x9ZpL0...)"
                    value={providedUid}
                    onChange={(e) => setProvidedUid(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <p className="text-[10px] text-slate-500">
                    Tạo user tại <strong>Firebase Console &gt; Authentication &gt; Users &gt; Add user</strong>, sao chép User UID và dán vào đây để hệ thống liên kết hồ sơ Firestore và phân quyền.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn An"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Employee Code */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã nhân viên *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NV-101"
                    value={userFormData.employeeCode}
                    onChange={(e) => setUserFormData({ ...userFormData, employeeCode: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingUser)}
                    placeholder="VD: an.nguyen@truongphat.vn"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0919414884"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vai trò hệ thống (RBAC) *</label>
                  <select
                    disabled={Boolean(editingUser)}
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
                  >
                    <option value="AGENT">Môi giới (AGENT)</option>
                    <option value="TEAM_LEADER">Trưởng nhóm (TEAM_LEADER)</option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>

                {/* Team */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thuộc nhóm kinh doanh</label>
                  <select
                    value={userFormData.teamId}
                    onChange={(e) => setUserFormData({ ...userFormData, teamId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Chưa phân nhóm</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password configuration for new users in AUTO mode */}
              {!editingUser && creationMode === 'AUTO' && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#001f3f]">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Thiết lập mật khẩu khởi tạo</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mật khẩu khởi tạo:
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={userFormData.tempPassword}
                      onChange={(e) => setUserFormData({ ...userFormData, tempPassword: e.target.value })}
                      placeholder="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Mật khẩu được mã hóa trực tiếp qua Firebase Admin SDK, không lưu trữ dưới dạng thô trên Firestore hay log.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.sendResetEmailAfterCreation}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          sendResetEmailAfterCreation: e.target.checked,
                        })
                      }
                      className="rounded text-[#001f3f] focus:ring-[#D4AF37]"
                    />
                    <span className="text-[11px] text-slate-700 font-medium">
                      Gửi email thông báo kích hoạt tới nhân viên (yêu cầu dịch vụ SMTP/Email)
                    </span>
                  </label>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú nhân sự</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về kinh nghiệm, khu vực phụ trách..."
                  value={userFormData.notes}
                  onChange={(e) => setUserFormData({ ...userFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{processingMsg || 'Đang xử lý...'}</span>
                    </>
                  ) : (
                    <span>
                      {editingUser
                        ? 'Lưu thay đổi'
                        : creationMode === 'FIREBASE_CONSOLE_UID'
                        ? 'Thêm hồ sơ nhân sự'
                        : 'Tạo tài khoản ngay'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Created Credentials Display Modal */}
      {createdAccountInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#001f3f]">TÀI KHOẢN ĐÃ ĐƯỢC TẠO THÀNH CÔNG</h3>
            <p className="text-xs text-slate-500 mt-1">
              Thông tin đăng nhập đã được ghi nhận trên Firebase Authentication & Cloud Firestore.
            </p>

            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Họ tên:</span>{' '}
                <span className="font-bold text-slate-900">{createdAccountInfo.user.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Email:</span>{' '}
                <span className="font-bold text-slate-900">{createdAccountInfo.user.email}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Mã nhân viên:</span>{' '}
                <span className="font-bold text-slate-900">{createdAccountInfo.user.employeeCode}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Vai trò:</span>{' '}
                <RoleBadge role={createdAccountInfo.user.role} />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Mật khẩu đã được thiết lập bảo mật trực tiếp trên Firebase Authentication. Nhân viên có thể sử dụng thông tin tài khoản được cấp để đăng nhập ngay.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setCreatedAccountInfo(null)}
                className="w-full py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-[#D4AF37] font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Role Change Modal */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#001f3f]">PHÂN QUYỀN HỆ THỐNG</h3>
                  <p className="text-xs text-slate-500">{roleChangeTarget.fullName}</p>
                </div>
              </div>
              <button onClick={() => setRoleChangeTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Lựa chọn vai trò mới. Hệ thống sẽ cập nhật Custom Claims trong Firebase Authentication và thu hồi các phiên đăng nhập cũ để áp dụng ngay:
              </p>

              <div className="space-y-2">
                {[
                  { role: 'AGENT' as UserRole, name: 'Môi giới (AGENT)', desc: 'Khai thác nguồn hàng, chăm sóc khách hàng cá nhân, tạo giao dịch' },
                  { role: 'TEAM_LEADER' as UserRole, name: 'Trưởng nhóm (TEAM_LEADER)', desc: 'Quản lý thành viên nhóm, duyệt nguồn hàng, giám sát hợp đồng & hoa hồng nhóm' },
                  { role: 'ADMIN' as UserRole, name: 'Quản trị viên (ADMIN)', desc: 'Toàn quyền sàn: Tạo tài khoản, cấu hình hệ thống, xóa BĐS, phân quyền' },
                ].map((item) => (
                  <label
                    key={item.role}
                    className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedNewRole === item.role
                        ? 'border-[#001f3f] bg-slate-50 ring-2 ring-[#001f3f]/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <input
                        type="radio"
                        name="newRoleRadio"
                        value={item.role}
                        checked={selectedNewRole === item.role}
                        onChange={() => setSelectedNewRole(item.role)}
                        className="text-[#001f3f] focus:ring-[#D4AF37]"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{item.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteRoleChange}
                className="px-5 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Lưu phân quyền</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Team Change Modal */}
      {teamChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-[#001f3f]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#001f3f]">CHUYỂN NHÓM KINH DOANH</h3>
                  <p className="text-xs text-slate-500">{teamChangeTarget.fullName}</p>
                </div>
              </div>
              <button onClick={() => setTeamChangeTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn nhóm kinh doanh mới:</label>
                <select
                  value={selectedNewTeamId}
                  onChange={(e) => setSelectedNewTeamId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">-- Chưa gán nhóm --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTeamChangeTarget(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteTeamChange}
                className="px-5 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Xác nhận chuyển</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Lock / Unlock Modal */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${lockTarget.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {lockTarget.status === 'ACTIVE' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#001f3f]">
                    {lockTarget.status === 'ACTIVE' ? 'KHÓA TÀI KHOẢN NHÂN VIÊN' : 'MỞ KHÓA TÀI KHOẢN'}
                  </h3>
                  <p className="text-xs text-slate-500">{lockTarget.fullName}</p>
                </div>
              </div>
              <button onClick={() => setLockTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                {lockTarget.status === 'ACTIVE'
                  ? `Khi bị khóa, tài khoản của ${lockTarget.fullName} sẽ bị vô hiệu hóa trong Firebase Authentication và bị ngắt phiên đăng nhập ngay lập tức.`
                  : `Mở khóa cho tài khoản của ${lockTarget.fullName} để cho phép đăng nhập lại bình thường.`}
              </p>

              {lockTarget.status === 'ACTIVE' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lý do khóa tài khoản:</label>
                  <input
                    type="text"
                    placeholder="VD: Nghỉ việc, chuyển công tác, vi phạm quy chế..."
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLockTarget(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteLockToggle}
                className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 text-white shadow-md cursor-pointer disabled:opacity-50 ${
                  lockTarget.status === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{lockTarget.status === 'ACTIVE' ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Temporary Password Modal */}
      {showTempPass && tempPassTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#001f3f]">CẤP MẬT KHẨU TẠM THỜI</h3>
                  <p className="text-xs text-slate-500">{tempPassTarget.fullName}</p>
                </div>
              </div>
              <button onClick={() => setShowTempPass(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu tạm thời mới (Input type="password") *</label>
                <div className="relative">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newTempPassword}
                    onChange={(e) => setNewTempPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự, hoa, thường, số, ký tự đặc biệt)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Yêu cầu: Tối thiểu 8 ký tự, gồm chữ in hoa, thường, chữ số và ký tự đặc biệt.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireChangeOnFirstLogin}
                  onChange={(e) => setRequireChangeOnFirstLogin(e.target.checked)}
                  className="rounded text-[#001f3f] focus:ring-[#D4AF37]"
                />
                <span className="text-[11px] text-slate-700 font-medium">
                  Bắt buộc nhân viên đổi mật khẩu ngay khi đăng nhập
                </span>
              </label>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTempPass(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessing || !newTempPassword.trim()}
                onClick={handleExecuteSetTempPassword}
                className="px-5 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Cấp mật khẩu</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-[#001f3f]">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-[#001f3f]">
                  {editingTeam ? 'SỬA THÔNG TIN NHÓM' : 'TẠO NHÓM KINH DOANH MỚI'}
                </h3>
              </div>
              <button onClick={() => setShowTeamModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên nhóm *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Phòng Kinh Doanh 1 (TP. Long Xuyên)"
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trưởng nhóm (Team Leader)</label>
                <select
                  value={teamFormData.leaderId}
                  onChange={(e) => setTeamFormData({ ...teamFormData, leaderId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({getRoleName(u.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả / Khu vực phụ trách</label>
                <textarea
                  rows={2}
                  placeholder="VD: Phụ trách dự án và đất nền khu vực Long Xuyên, Châu Đốc..."
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>{editingTeam ? 'Lưu thay đổi' : 'Tạo nhóm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Admin Re-authentication Verification Modal */}
      <AdminReauthModal
        isOpen={reauthConfig.isOpen}
        actionTitle={reauthConfig.title}
        actionDescription={reauthConfig.description}
        onConfirm={reauthConfig.action}
        onClose={() => setReauthConfig({ ...reauthConfig, isOpen: false })}
      />
    </div>
  );
};
