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
export async function parseResponseSafe<T = any>(response: Response, endpoint?: string): Promise<T | null> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || '';
  const targetUrl = endpoint || response.url || 'API';

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;

    if (raw && contentType.includes('application/json')) {
      try {
        const errorData = JSON.parse(raw);
        message = errorData.message || errorData.error || message;
      } catch {
        // Fallback to default message
      }
    } else if (contentType.includes('text/html')) {
      message = 'Máy chủ trả về dữ liệu không đúng định dạng (HTML)';
    }

    // Ghi endpoint, status và requestId vào log, nhưng KHÔNG ghi mật khẩu/token
    console.error(`[API Error] endpoint: ${targetUrl} | status: ${response.status} | requestId: ${requestId || 'N/A'}`);

    throw new Error(message);
  }

  if (response.status === 204 || !raw.trim()) {
    return null;
  }

  if (!contentType.includes('application/json')) {
    console.error(`[API Format Error] endpoint: ${targetUrl} | status: ${response.status} | contentType: ${contentType}`);
    throw new Error('Máy chủ trả về dữ liệu không đúng định dạng');
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`[API Parse Error] endpoint: ${targetUrl} | status: ${response.status} | requestId: ${requestId || 'N/A'}`);
    throw new Error('Không thể đọc phản hồi từ máy chủ');
  }
}
