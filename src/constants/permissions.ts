import { CustomRole, User } from '../types';

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'USERS',
    name: 'Nhân sự',
    description: 'Quản lý danh sách nhân viên, tài khoản, chức vụ và phân quyền',
    items: [
      { key: 'users.view', label: 'Xem danh sách nhân sự', description: 'Được phép xem danh sách nhân sự trong công ty' },
      { key: 'users.create', label: 'Thêm nhân sự', description: 'Được phép tạo hồ sơ và cấp tài khoản nhân viên mới' },
      { key: 'users.edit', label: 'Chỉnh sửa nhân sự', description: 'Được phép chỉnh sửa thông tin hồ sơ nhân viên' },
      { key: 'users.delete', label: 'Xóa nhân sự', description: 'Được phép xóa tài khoản nhân sự khỏi hệ thống' },
      { key: 'users.lock', label: 'Khóa / Mở tài khoản', description: 'Được phép tạm khóa hoặc kích hoạt lại tài khoản' },
      { key: 'users.changeRole', label: 'Đổi chức vụ', description: 'Được phép luân chuyển chức vụ của nhân viên' },
      { key: 'users.manageRoles', label: 'Quản lý chức vụ', description: 'Được phép tạo mới, sửa đổi và phân quyền chức vụ' },
      { key: 'users.assignPermissions', label: 'Phân quyền', description: 'Được phép cấp hoặc thu hồi quyền riêng cho từng cá nhân' },
    ],
  },
  {
    id: 'CUSTOMERS',
    name: 'Khách hàng',
    description: 'Quản lý khách hàng tiềm năng, khách nét, nhu cầu mua/thuê',
    items: [
      { key: 'customers.viewOwn', label: 'Xem khách hàng của mình', description: 'Chỉ xem khách hàng do bản thân trực tiếp phụ trách' },
      { key: 'customers.viewTeam', label: 'Xem khách hàng của nhóm', description: 'Xem khách hàng thuộc các thành viên trong nhóm' },
      { key: 'customers.viewAll', label: 'Xem toàn bộ khách hàng', description: 'Xem tất cả khách hàng trong toàn bộ công ty' },
      { key: 'customers.create', label: 'Thêm khách hàng', description: 'Được phép nhập khách hàng mới vào hệ thống' },
      { key: 'customers.edit', label: 'Chỉnh sửa khách hàng', description: 'Được phép cập nhật thông tin và nhu cầu khách hàng' },
      { key: 'customers.delete', label: 'Xóa khách hàng', description: 'Được phép chuyển khách hàng vào thùng rác' },
      { key: 'customers.reassign', label: 'Chuyển người phụ trách', description: 'Được phép chuyển giao khách hàng cho nhân sự khác' },
    ],
  },
  {
    id: 'PROPERTIES',
    name: 'Nguồn hàng',
    description: 'Kho bất động sản bán, cho thuê và sang nhượng',
    items: [
      { key: 'properties.view', label: 'Xem nguồn hàng', description: 'Được phép xem danh sách và chi tiết bất động sản' },
      { key: 'properties.create', label: 'Thêm nguồn hàng', description: 'Được phép đăng ký gửi bất động sản mới' },
      { key: 'properties.edit', label: 'Chỉnh sửa nguồn hàng', description: 'Được phép cập nhật thông tin và hình ảnh sản phẩm' },
      { key: 'properties.delete', label: 'Xóa nguồn hàng', description: 'Được phép chuyển bất động sản vào thùng rác' },
      { key: 'properties.approve', label: 'Duyệt nguồn hàng', description: 'Được quyền kiểm duyệt và phê duyệt đăng bán sản phẩm' },
      { key: 'properties.share', label: 'Chia sẻ nguồn hàng', description: 'Được phép xuất file hoặc gửi thông tin ra ngoài' },
    ],
  },
  {
    id: 'DEALS',
    name: 'Giao dịch',
    description: 'Quản lý đặt cọc, công chứng, hợp đồng và thanh toán hoa hồng',
    items: [
      { key: 'deals.view', label: 'Xem giao dịch', description: 'Được phép theo dõi tiến trình giao dịch' },
      { key: 'deals.create', label: 'Tạo giao dịch', description: 'Được phép tạo giao dịch đặt cọc hoặc sang nhượng mới' },
      { key: 'deals.edit', label: 'Chỉnh sửa giao dịch', description: 'Được phép cập nhật tiến độ hợp đồng và phụ lục' },
      { key: 'deals.delete', label: 'Xóa giao dịch', description: 'Được phép hủy hoặc xóa hồ sơ giao dịch' },
      { key: 'deals.approve', label: 'Duyệt giao dịch & Hoa hồng', description: 'Chỉ định quyền phê duyệt giao dịch và chi trả hoa hồng' },
    ],
  },
  {
    id: 'REPORTS',
    name: 'Báo cáo',
    description: 'Thống kê doanh số, KPI nhân sự và chỉ số chuyển đổi',
    items: [
      { key: 'reports.viewOwn', label: 'Xem báo cáo cá nhân', description: 'Xem biểu đồ và số liệu hiệu suất của bản thân' },
      { key: 'reports.viewTeam', label: 'Xem báo cáo nhóm', description: 'Xem tổng hợp doanh thu và số liệu của đội nhóm' },
      { key: 'reports.viewAll', label: 'Xem báo cáo toàn công ty', description: 'Xem toàn cảnh tài chính và số liệu toàn hệ thống' },
      { key: 'reports.export', label: 'Xuất báo cáo', description: 'Được phép xuất dữ liệu Excel/PDF số liệu báo cáo' },
    ],
  },
  {
    id: 'SYSTEM',
    name: 'Hệ thống',
    description: 'Quản lý cấu hình, thương hiệu, phân quyền và nhật ký bảo mật',
    items: [
      { key: 'system.manageUsers', label: 'Quản lý tài khoản', description: 'Được can thiệp bảo mật tài khoản người dùng' },
      { key: 'system.config', label: 'Quản lý cấu hình', description: 'Chỉnh sửa thông tin công ty, logo và cài đặt chung' },
      { key: 'system.auditLogs', label: 'Xem nhật ký hoạt động', description: 'Truy cập nhật ký kiểm toán Audit Log bảo mật' },
      { key: 'system.permissions', label: 'Phân quyền hệ thống', description: 'Cấu hình ma trận quyền hạn cho toàn công ty' },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const DEFAULT_SYSTEM_ROLES: CustomRole[] = [
  {
    id: 'role_admin',
    code: 'ADMIN',
    name: 'Quản trị viên',
    description: 'Toàn quyền tối cao quản trị toàn bộ hệ thống, nhân sự và bảo mật',
    isSystem: true,
    isActive: true,
    permissions: ALL_PERMISSION_KEYS,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'role_giam_doc',
    code: 'DIRECTOR',
    name: 'Giám đốc',
    description: 'Ban điều hành, xem toàn cảnh công ty, duyệt nguồn hàng, giao dịch và báo cáo',
    isSystem: false,
    isActive: true,
    permissions: [
      'users.view',
      'customers.viewAll', 'customers.create', 'customers.edit', 'customers.reassign',
      'properties.view', 'properties.create', 'properties.edit', 'properties.approve', 'properties.share',
      'deals.view', 'deals.create', 'deals.edit', 'deals.approve',
      'reports.viewOwn', 'reports.viewTeam', 'reports.viewAll', 'reports.export',
      'system.auditLogs',
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'role_team_leader',
    code: 'TEAM_LEADER',
    name: 'Trưởng nhóm',
    description: 'Quản lý đội ngũ kinh doanh, phê duyệt và hỗ trợ chốt giao dịch trong nhóm',
    isSystem: true,
    isActive: true,
    permissions: [
      'users.view',
      'customers.viewOwn', 'customers.viewTeam', 'customers.create', 'customers.edit', 'customers.reassign',
      'properties.view', 'properties.create', 'properties.edit', 'properties.share',
      'deals.view', 'deals.create', 'deals.edit',
      'reports.viewOwn', 'reports.viewTeam', 'reports.export',
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'role_agent',
    code: 'AGENT',
    name: 'Môi giới',
    description: 'Chuyên viên tư vấn bất động sản, tìm kiếm nguồn hàng và chăm sóc khách hàng',
    isSystem: true,
    isActive: true,
    permissions: [
      'customers.viewOwn', 'customers.create', 'customers.edit',
      'properties.view', 'properties.create', 'properties.share',
      'deals.view', 'deals.create',
      'reports.viewOwn',
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'role_ke_toan',
    code: 'ACCOUNTANT',
    name: 'Kế toán',
    description: 'Quản lý theo dõi giao dịch, cọc, tiền giải ngân và doanh số hoa hồng',
    isSystem: false,
    isActive: true,
    permissions: [
      'deals.view', 'deals.edit', 'deals.approve',
      'reports.viewOwn', 'reports.viewTeam', 'reports.viewAll', 'reports.export',
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'role_marketing',
    code: 'MARKETING',
    name: 'Marketing',
    description: 'Tiếp thị truyền thông, chia sẻ nguồn hàng và tiếp nhận khách hàng mới',
    isSystem: false,
    isActive: true,
    permissions: [
      'customers.viewAll', 'customers.create',
      'properties.view', 'properties.share',
      'reports.viewOwn', 'reports.viewAll',
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'role_cham_soc_khach_hang',
    code: 'CUSTOMER_SERVICE',
    name: 'Chăm sóc khách hàng',
    description: 'Tiếp nhận phản hồi, phân loại nhu cầu khách hàng và chuyển giao môi giới',
    isSystem: false,
    isActive: true,
    permissions: [
      'customers.viewAll', 'customers.create', 'customers.edit', 'customers.reassign',
      'properties.view',
      'reports.viewOwn',
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

/**
 * Kiểm tra quyền thực tế của người dùng:
 * 1. Nếu là Quản trị viên tối cao (quidanh.aff001@gmail.com) hoặc role === 'ADMIN' -> luôn luôn có tất cả quyền
 * 2. Ưu tiên quyền riêng (customPermissions) của người dùng: nếu có cấu hình true/false thì ghi đè chức vụ
 * 3. Nếu không có quyền riêng -> lấy theo danh sách quyền của chức vụ hiện tại
 */
export function hasUserPermission(
  user: User | null | undefined,
  permissionKey: string,
  rolesList: CustomRole[] = DEFAULT_SYSTEM_ROLES
): boolean {
  if (!user) return false;

  // Root Super Admin hoặc ADMIN role có toàn quyền
  if (user.email === 'quidanh.aff001@gmail.com' || user.role === 'ADMIN') {
    return true;
  }

  // 1. Quyền riêng cá nhân (User Custom Overrides) có độ ưu tiên cao nhất
  if (user.customPermissions && user.customPermissions[permissionKey] !== undefined) {
    return Boolean(user.customPermissions[permissionKey]);
  }

  // 2. Quyền theo chức vụ (Dynamic Role Permissions)
  const userRoleCode = (user.role || '').toUpperCase();
  const matchedRole = rolesList.find(
    (r) =>
      r.code.toUpperCase() === userRoleCode ||
      r.id === user.role ||
      r.name.toLowerCase() === (user.roleName || '').toLowerCase()
  );

  if (matchedRole && Array.isArray(matchedRole.permissions)) {
    return matchedRole.permissions.includes(permissionKey);
  }

  // Fallback an toàn cho 3 role mặc định cũ nếu chưa tải danh sách role
  if (userRoleCode === 'TEAM_LEADER') {
    const leaderDefault = DEFAULT_SYSTEM_ROLES.find((r) => r.code === 'TEAM_LEADER');
    return Boolean(leaderDefault?.permissions.includes(permissionKey));
  }

  if (userRoleCode === 'AGENT') {
    const agentDefault = DEFAULT_SYSTEM_ROLES.find((r) => r.code === 'AGENT');
    return Boolean(agentDefault?.permissions.includes(permissionKey));
  }

  return false;
}

export function getRoleDisplayName(roleCodeOrId?: string, rolesList: CustomRole[] = DEFAULT_SYSTEM_ROLES): string {
  if (!roleCodeOrId) return 'Môi giới';
  const found = rolesList.find(
    (r) => r.code.toUpperCase() === roleCodeOrId.toUpperCase() || r.id === roleCodeOrId
  );
  if (found) return found.name;

  switch (roleCodeOrId.toUpperCase()) {
    case 'ADMIN':
      return 'Quản trị viên';
    case 'DIRECTOR':
      return 'Giám đốc';
    case 'TEAM_LEADER':
      return 'Trưởng nhóm';
    case 'AGENT':
      return 'Môi giới';
    case 'ACCOUNTANT':
      return 'Kế toán';
    case 'MARKETING':
      return 'Marketing';
    case 'CUSTOMER_SERVICE':
      return 'Chăm sóc khách hàng';
    default:
      return roleCodeOrId;
  }
}
