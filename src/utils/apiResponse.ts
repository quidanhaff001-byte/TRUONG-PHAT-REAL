/**
 * Tiện ích xử lý phản hồi HTTP an toàn theo chuẩn Section 6
 * - Không gọi response.json() trực tiếp khi response có thể rỗng
 * - Kiểm tra response.ok
 * - Đọc response.text() trước
 * - Chỉ JSON.parse khi nội dung không rỗng và Content-Type là application/json
 * - Xử lý riêng HTTP 204 No Content
 * - Nếu backend lỗi hoặc trả HTML/rỗng, hiển thị thông báo tiếng Việt rõ ràng
 * - Không hiển thị trực tiếp lỗi kỹ thuật tiếng Anh cho người dùng
 * - Ghi endpoint, status và requestId vào log (tuyệt đối không ghi mật khẩu hoặc token)
 */

import { mapErrorMessage } from './errorMapper';

export interface ApiCustomError extends Error {
  status?: number;
  errorCode?: string;
  code?: string;
  requestId?: string | null;
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

  const headerRequestId = response.headers.get('x-request-id') || response.headers.get('request-id');
  const targetUrl = endpoint || response.url || 'API';

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    let errorCode = 'HTTP_ERROR';
    let requestId: string | null = headerRequestId || null;
    let parsedData: any = null;

    if (raw && contentType.includes('application/json')) {
      try {
        parsedData = JSON.parse(raw);
        message = parsedData.message || message;
        errorCode = parsedData.errorCode || parsedData.code || errorCode;
        requestId = parsedData.requestId || requestId;
      } catch {
        // Fallback
      }
    } else if (response.status >= 500) {
      message = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    } else if (response.status === 405) {
      message = 'Phương thức gửi yêu cầu không được hỗ trợ (405).';
    } else if (response.status === 403) {
      message = 'Quyền truy cập bị từ chối. Chỉ Quản trị viên mới có quyền thao tác.';
    }

    // Ghi log an toàn (tuyệt đối không ghi mật khẩu hoặc token)
    console.error(`[API Error] endpoint: ${targetUrl} | status: ${response.status} | errorCode: ${errorCode} | requestId: ${requestId || 'N/A'}`);

    const mappedMessage = mapErrorMessage({ code: errorCode, message });
    const error = new Error(mappedMessage) as ApiCustomError;
    error.status = response.status;
    error.errorCode = errorCode;
    error.code = errorCode;
    error.requestId = requestId;
    error.data = parsedData;
    throw error;
  }

  if (response.status === 204 || !raw.trim()) {
    return null;
  }

  if (!contentType.includes('application/json')) {
    console.error(`[API Format Error] endpoint: ${targetUrl} | status: ${response.status} | contentType: ${contentType}`);
    throw new Error('Máy chủ trả về dữ liệu không đúng định dạng.');
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`[API Parse Error] endpoint: ${targetUrl} | status: ${response.status} | requestId: ${headerRequestId || 'N/A'}`);
    throw new Error('Không thể đọc phản hồi từ máy chủ.');
  }
}
