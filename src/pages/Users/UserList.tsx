import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
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
  CheckCircle,
  TrendingUp,
  Camera,
  Upload,
  Loader2,
} from 'lucide-react';
import { User, Team, UserRole } from '../../types';
import { RoleBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { uploadUserAvatar } from '../../utils/fileUpload';

export const UserList: React.FC = () => {
  const { users, teams, addUser, updateUser, updateUserAvatar, toggleUserStatus, addTeam, updateTeam, deleteTeam } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Avatar Upload State
  const [avatarUploadingUserId, setAvatarUploadingUserId] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUserForAvatar, setSelectedUserForAvatar] = useState<User | null>(null);

  // User Modal State
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    employeeCode: string;
    role: UserRole;
    teamId: string;
    notes: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    employeeCode: `NV-${Math.floor(100 + Math.random() * 900)}`,
    role: 'AGENT',
    teamId: '',
    notes: '',
  });

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

  // Check if current user can edit this target user's avatar
  const canEditAvatar = (targetUser: User) => {
    if (!currentUser) return false;
    if (isAdmin) return true; // Admin can edit any avatar
    return currentUser.id === targetUser.id; // Others can only edit their own avatar
  };

  const handleTriggerAvatarUpload = (user: User) => {
    if (!canEditAvatar(user)) {
      error('Không có quyền', 'Bạn chỉ có quyền thay đổi ảnh đại diện của chính mình.');
      return;
    }
    setSelectedUserForAvatar(user);
    avatarFileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserForAvatar) return;

    try {
      setAvatarUploadingUserId(selectedUserForAvatar.id);
      const downloadUrl = await uploadUserAvatar(selectedUserForAvatar.id, file);
      await updateUserAvatar(selectedUserForAvatar.id, downloadUrl);
      success('Cập nhật ảnh thành công', `Đã cập nhật ảnh đại diện cho ${selectedUserForAvatar.fullName}.`);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      error('Lỗi tải ảnh đại diện', err.message || 'Không thể tải ảnh. Vui lòng thử lại.');
    } finally {
      setAvatarUploadingUserId(null);
      setSelectedUserForAvatar(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // Open Create/Edit User
  const handleOpenUserModal = (u?: User) => {
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
      });
    }
    setShowUserModal(true);
  };

  // Submit User
  const handleSaveUser = async () => {
    if (!userFormData.fullName || !userFormData.email) {
      error('Thiếu thông tin', 'Vui lòng nhập tên và email nhân viên.');
      return;
    }

    const team = teams.find((t) => t.id === userFormData.teamId);

    if (editingUser) {
      await updateUser(editingUser.id, {
        ...userFormData,
        teamName: team?.name,
      });
      success('Thành công', 'Đã cập nhật thông tin nhân viên.');
    } else {
      await addUser({
        ...userFormData,
        teamName: team?.name,
        status: 'ACTIVE',
        avatarUrl: '', // Initial empty avatar triggers initials fallback
      });
      success('Thành công', 'Đã tạo nhân viên mới.');
    }
    setShowUserModal(false);
  };

  // Open Create/Edit Team
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
        leaderId: users[0]?.id || '',
      });
    }
    setShowTeamModal(true);
  };

  // Submit Team
  const handleSaveTeam = async () => {
    if (!teamFormData.name) {
      error('Thiếu thông tin', 'Vui lòng nhập tên phòng ban/đội nhóm.');
      return;
    }

    if (editingTeam) {
      await updateTeam(editingTeam.id, teamFormData);
      success('Thành công', 'Đã cập nhật phòng ban.');
    } else {
      await addTeam(teamFormData);
      success('Thành công', 'Đã tạo phòng ban mới.');
    }
    setShowTeamModal(false);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.employeeCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#001f3f] tracking-tight">
              Quản lý nhân sự & Đội nhóm
            </h1>
            <span className="text-xs font-bold text-[#001f3f] bg-[#D4AF37]/20 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
              {users.length} Nhân sự
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý danh sách chuyên viên môi giới An Giang, phân quyền Quản trị viên, Trưởng nhóm và ảnh đại diện đồng bộ.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'users' ? (
              <button
                type="button"
                onClick={() => handleOpenUserModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#D4AF37]" />
                <span>Thêm nhân viên mới</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenTeamModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Tạo phòng ban / nhóm mới</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-[#001f3f] text-[#001f3f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 text-[#D4AF37]" />
          <span>Danh sách nhân sự ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'teams'
              ? 'border-[#001f3f] text-[#001f3f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building className="w-4 h-4 text-[#D4AF37]" />
          <span>Phòng ban & Nhóm ({teams.length})</span>
        </button>
      </div>

      {/* Tab 1: Staff / Users List */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter / Search bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên theo tên, mã số NV, email, số điện thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên (Admin)</option>
                <option value="TEAM_LEADER">Trưởng nhóm (Team Leader)</option>
                <option value="AGENT">Môi giới (Agent)</option>
              </select>
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map((u) => {
              const isLocked = u.status === 'LOCKED';
              const isSelf = currentUser?.id === u.id;
              const hasAvatarPermission = canEditAvatar(u);
              const isUploadingThis = avatarUploadingUserId === u.id;

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isLocked ? 'border-rose-200 bg-rose-50/20 opacity-75' : 'border-gray-200 hover:border-[#D4AF37]/60 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar with click-to-upload trigger if permitted */}
                        <div className="relative group">
                          <Avatar
                            src={u.avatarUrl}
                            name={u.fullName}
                            size="lg"
                            status={u.status}
                            theme="gold"
                          />

                          {/* Upload overlay button */}
                          {hasAvatarPermission && !isUploadingThis && (
                            <button
                              type="button"
                              onClick={() => handleTriggerAvatarUpload(u)}
                              title={isAdmin && !isSelf ? `Đổi ảnh cho ${u.fullName}` : 'Đổi ảnh đại diện của bạn'}
                              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}

                          {isUploadingThis && (
                            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center text-[#D4AF37]">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-black text-gray-900">{u.fullName}</h3>
                            {isSelf && (
                              <span className="text-[10px] bg-[#D4AF37]/20 text-[#001f3f] font-bold px-1.5 py-0.2 rounded border border-[#D4AF37]/40">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#001f3f] font-bold mt-0.5">{u.employeeCode}</div>
                        </div>
                      </div>

                      <RoleBadge role={u.role} />
                    </div>

                    {/* Info details */}
                    <div className="mt-4 space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                      {u.teamName && (
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-bold text-[#001f3f]">{u.teamName}</span>
                        </div>
                      )}
                    </div>

                    {/* Performance numbers */}
                    <div className="mt-3 grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold block">Nguồn BĐS</span>
                        <span className="font-bold text-[#001f3f]">{u.propertiesCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold block">Khách hàng</span>
                        <span className="font-bold text-gray-800">{u.customersCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold block">Thương vụ</span>
                        <span className="font-bold text-emerald-700">{u.dealsCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action row (Admin or Self) */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          disabled={isSelf}
                          className={`text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            isLocked ? 'text-emerald-600 hover:text-emerald-700' : 'text-rose-600 hover:text-rose-700'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Mở khóa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Khóa tài khoản</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTriggerAvatarUpload(u)}
                            className="p-1.5 text-gray-500 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Đổi ảnh đại diện"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#b38e22]" />
                            <span className="hidden sm:inline">Đổi ảnh</span>
                          </button>

                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="p-1.5 text-gray-600 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Sửa</span>
                          </button>
                        </div>
                      </>
                    ) : isSelf ? (
                      <button
                        onClick={() => handleTriggerAvatarUpload(u)}
                        className="text-xs font-bold text-[#001f3f] hover:text-[#b38e22] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#b38e22]" />
                        <span>Đổi ảnh đại diện của bạn</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Chỉ xem thông tin</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Teams List */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3 hover:border-[#D4AF37]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[#001f3f]">{t.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description || 'Không có mô tả'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#001f3f] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D4AF37]/40 shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Trưởng nhóm:</span>
                    <span className="font-bold text-[#001f3f]">{t.leaderName || 'Chưa gán'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Thành viên:</span>
                    <span className="font-bold text-gray-800">{t.memberIds?.length || 1} nhân sự</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenTeamModal(t)}
                    className="px-3 py-1.5 text-xs font-bold text-[#001f3f] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => deleteTeam(t.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Xóa nhóm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create/Edit User */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-black text-[#001f3f]">
                {editingUser ? `Chỉnh sửa nhân viên: ${editingUser.fullName}` : 'Thêm nhân sự mới'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mã nhân viên *</label>
                  <input
                    type="text"
                    value={userFormData.employeeCode}
                    onChange={(e) => setUserFormData({ ...userFormData, employeeCode: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Vai trò phân quyền *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800"
                  >
                    <option value="AGENT">Môi giới (Agent)</option>
                    <option value="TEAM_LEADER">Trưởng nhóm (Team Leader)</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Họ và tên nhân viên *</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn An"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email đăng nhập *</label>
                  <input
                    type="email"
                    placeholder="name@truongphatreal.vn"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    placeholder="0909xxxxxx"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Phòng ban / Nhóm phụ trách</label>
                <select
                  value={userFormData.teamId}
                  onChange={(e) => setUserFormData({ ...userFormData, teamId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="">Chưa gán nhóm</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={userFormData.notes}
                  onChange={(e) => setUserFormData({ ...userFormData, notes: e.target.value })}
                  placeholder="Khu vực chuyên trách Long Xuyên, Châu Đốc..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  className="px-5 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold"
                >
                  {editingUser ? 'Lưu cập nhật' : 'Tạo nhân viên'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Team */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-black text-[#001f3f]">
                {editingTeam ? `Chỉnh sửa: ${editingTeam.name}` : 'Tạo phòng ban / đội nhóm mới'}
              </h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tên phòng ban / nhóm *</label>
                <input
                  type="text"
                  placeholder="VD: KD1 - TP. Long Xuyên"
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Trưởng nhóm phụ trách</label>
                <select
                  value={teamFormData.leaderId}
                  onChange={(e) => setTeamFormData({ ...teamFormData, leaderId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="">Chưa chọn trưởng nhóm</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mô tả nhiệm vụ / Địa bàn</label>
                <textarea
                  rows={3}
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  placeholder="Phụ trách khu vực TP. Long Xuyên và Châu Đốc..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeam}
                  className="px-5 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold"
                >
                  {editingTeam ? 'Lưu cập nhật' : 'Tạo nhóm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
