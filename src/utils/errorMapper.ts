/**
 * Bảng ánh xạ mã lỗi hệ thống sang thông báo Tiếng Việt chuẩn
 * Đáp ứng Section 16 của tài liệu kiểm thử thực tế
 */

export const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'Email này đã được sử dụng cho một tài khoản khác',
  'auth/email-already-exists': 'Email này đã được sử dụng cho một tài khoản khác',
  'EMAIL_ALREADY_EXISTS': 'Email này đã được sử dụng cho một tài khoản khác',
  'EMAIL_EXISTS': 'Email này đã được sử dụng cho một tài khoản khác',
  'auth/invalid-email': 'Địa chỉ email không hợp lệ',
  'INVALID_EMAIL': 'Địa chỉ email không hợp lệ',
  'auth/weak-password': 'Mật khẩu không đủ mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)',
  'WEAK_PASSWORD': 'Mật khẩu không đủ mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)',
  'auth/user-not-found': 'Tài khoản không tồn tại trong hệ thống',
  'USER_NOT_FOUND': 'Tài khoản không tồn tại trong hệ thống',
  'auth/wrong-password': 'Mật khẩu không chính xác',
  'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác',
  'auth/too-many-requests': 'Quá nhiều lần thử thất bại. Vui lòng thử lại sau ít phút',
  'auth/network-request-failed': 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet',
  'permission-denied': 'Bạn không có quyền thực hiện thao tác này',
  'PERMISSION_DENIED': 'Bạn không có quyền thực hiện thao tác này',
  'UNAUTHENTICATED': 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
  'not-found': 'Dữ liệu yêu cầu không tồn tại hoặc đã bị xóa',
  'already-exists': 'Dữ liệu này đã tồn tại trong hệ thống',
  'EMPLOYEE_CODE_EXISTS': 'Mã nhân viên này đã được sử dụng cho nhân sự khác trong hệ thống',
  'failed-precondition': 'Thao tác không hợp lệ với trạng thái hiện tại của dữ liệu',
  'unavailable': 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau',
  'BACKEND_NOT_CONFIGURED': 'Dịch vụ máy chủ chưa được cấu hình. Vui lòng liên hệ Quản trị viên.',
  'SELF_LOCK_DENIED': 'Bạn không thể tự khóa tài khoản của chính mình.',
  'SELF_DELETE_DENIED': 'Bạn không thể tự xóa tài khoản của chính mình.',
  'LAST_ADMIN_PROTECTED': 'Không thể hạ quyền hoặc khóa Quản trị viên cuối cùng của hệ thống.',
};

/**
 * Ánh xạ lỗi bất kỳ thành chuỗi Tiếng Việt rõ ràng, thân thiện với người dùng
 * Tuyệt đối không để lộ mã lỗi kỹ thuật tiếng Anh chưa xử lý
 */
export function mapErrorMessage(error: any): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.';

  const code = error?.code || error?.errorCode || '';
  if (code && ERROR_MAP[code]) {
    return ERROR_MAP[code];
  }

  const rawMessage = typeof error === 'string' ? error : error?.message || '';

  // Handle common technical English phrases
  if (rawMessage.includes('Missing or insufficient permissions') || rawMessage.includes('permission-denied')) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (rawMessage.includes('network') || rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.';
  }
  if (rawMessage.includes('JSON') || rawMessage.includes('SyntaxError')) {
    return 'Không thể đọc phản hồi từ máy chủ.';
  }
  if (rawMessage.includes('timeout') || rawMessage.includes('timed out')) {
    return 'Yêu cầu máy chủ đã quá thời gian chờ. Vui lòng thử lại.';
  }
  if (rawMessage.includes('Unsupported field value: undefined')) {
    return 'Dữ liệu gửi lên chứa trường không hợp lệ (undefined).';
  }

  return rawMessage || 'Đã xảy ra lỗi không xác định.';
}
