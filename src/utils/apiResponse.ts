/**
 * Tiện ích xử lý phản hồi HTTP an toàn:
 * - Không gọi response.json() trực tiếp khi response có thể rỗng
 * - Kiểm tra response.ok
 * - Đọc response.text() trước
 * - Chỉ JSON.parse khi nội dung không rỗng và Content-Type là application/json
 * - Xử lý riêng HTTP 204 No Content
 * - Nếu backend lỗi hoặc trả HTML/rỗng, hiển thị thông báo tiếng Việt rõ ràng
 * - Không hiển thị trực tiếp lỗi kỹ thuật tiếng Anh cho người dùng
 * - Ghi endpoint, status và requestId vào log (tuyệt đối không ghi mật khẩu hoặc token)
 */
export interface ApiCustomError extends Error {
  status?: number;
  code?: string;
  hint?: string;
  data?: any;
}

export async function parseResponseSafe<T = any>(response: Response, endpoint?: string): Promise<T | null> {
  const contentType = response.headers.get('content-type') || '';
  let raw = '';
  try {
    raw = await response.text();
  } catch {
    throw new Error('Mất kết nối hoặc không thể đọc phản hồi từ máy chủ.');
  }

  const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || '';
  const targetUrl = endpoint || response.url || 'API';

  // Xử lý khi phản hồi rỗng
  if (!raw.trim()) {
    if (response.status === 204) {
      return null;
    }
    const emptyErr: ApiCustomError = new Error('Mất kết nối hoặc máy chủ trả phản hồi rỗng.');
    emptyErr.status = response.status;
    throw emptyErr;
  }

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    let code: string | undefined;
    let hint: string | undefined;
    let parsedData: any = null;

    if (contentType.includes('application/json')) {
      try {
        parsedData = JSON.parse(raw);
        message = parsedData.message || parsedData.error || message;
        code = parsedData.errorCode || parsedData.code;
        hint = parsedData.hint || parsedData.details;
      } catch {
        // Fallback
      }
    } else if (contentType.includes('text/html')) {
      message = 'Máy chủ trả về dữ liệu không đúng định dạng (HTML)';
    }

    if (response.status === 405) {
      message = 'Máy chủ phản hồi lỗi 405 (Method Not Allowed). Backend API chưa hỗ trợ phương thức này.';
    } else if (response.status === 403 && !code) {
      message = 'Quyền truy cập bị từ chối. Chỉ Quản trị viên (ADMIN) mới có quyền tạo tài khoản nhân viên.';
    } else if (response.status === 503 && !message.includes('Chưa cấu hình')) {
      message = 'Chưa cấu hình dịch vụ tạo tài khoản.';
    }

    // Ghi endpoint, status và requestId vào log (tuyệt đối không ghi mật khẩu hoặc token)
    console.error(`[API Error] endpoint: ${targetUrl} | status: ${response.status} | requestId: ${requestId || 'N/A'}`);

    const error: ApiCustomError = new Error(message);
    error.status = response.status;
    error.code = code;
    error.hint = hint;
    error.data = parsedData;
    throw error;
  }

  if (!contentType.includes('application/json')) {
    console.error(`[API Format Error] endpoint: ${targetUrl} | status: ${response.status} | contentType: ${contentType}`);
    throw new Error('Máy chủ trả về dữ liệu không đúng định dạng (không phải JSON)');
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`[API Parse Error] endpoint: ${targetUrl} | status: ${response.status} | requestId: ${requestId || 'N/A'}`);
    throw new Error('Không thể đọc phản hồi từ máy chủ (lỗi cú pháp JSON)');
  }
}
