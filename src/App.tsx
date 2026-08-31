import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { PropertyList } from './pages/Properties/PropertyList';
import { PropertyForm } from './pages/Properties/PropertyForm';
import { PropertyDetail } from './pages/Properties/PropertyDetail';
import { UserList } from './pages/Users/UserList';
import { TrashList } from './pages/Trash/TrashList';
import { Settings } from './pages/Settings';
import { PlaceholderModule } from './pages/PlaceholderModule';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/properties" element={<PropertyList />} />
                  <Route path="/properties/new" element={<PropertyForm />} />
                  <Route path="/properties/:id" element={<PropertyDetail />} />
                  <Route path="/properties/:id/edit" element={<PropertyForm />} />
                  <Route path="/users" element={<UserList />} />
                  <Route path="/trash" element={<TrashList />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Operational Modules */}
                  <Route
                    path="/customers"
                    element={
                      <PlaceholderModule
                        title="Quản lý Khách hàng (CRM)"
                        phase="Quản trị Khách hàng (CRM)"
                        description="Hệ thống quản lý thông tin khách mua, khách thuê, nhu cầu chi tiết, phân loại nhóm khách hàng và lịch sử tương tác."
                        features={[
                          'Quản lý danh sách khách mua / khách thuê',
                          'Lưu trữ nhu cầu chi tiết (Khoảng giá, diện tích, khu vực, hướng)',
                          'Ghi nhận mức độ thiện chí và khả năng tài chính',
                          'Nhật ký các lần tư vấn và gửi sản phẩm',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/match"
                    element={
                      <PlaceholderModule
                        title="Thuật toán Ghép nguồn hàng & Khách hàng"
                        phase="Khớp nhu cầu tự động"
                        description="Hệ thống tự động so khớp các tiêu chí giữa nguồn hàng ký gửi và nhu cầu khách hàng theo tỷ lệ phần trăm tương đồng."
                        features={[
                          'Thuật toán so khớp đa chiều (Khu vực, Khoảng giá, Loại hình, Diện tích)',
                          'Gợi ý tức thời danh sách khách hàng tiềm năng cho từng căn BĐS mới',
                          'Gợi ý nguồn hàng phù hợp khi tiếp nhận khách mới',
                          'Thông báo cơ hội chốt deal nhanh',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/appointments"
                    element={
                      <PlaceholderModule
                        title="Lịch hẹn & Dẫn khách xem BĐS"
                        phase="Quản lý Lịch hẹn & Khảo sát"
                        description="Theo dõi và quản lý lịch dẫn khách đi xem nhà thực tế, ghi nhận phản hồi và đánh giá sau buổi khảo sát."
                        features={[
                          'Lên lịch hẹn xem nhà và nhắc nhở thời gian',
                          'Ghi nhận phản hồi và đánh giá của khách hàng sau khi xem',
                          'Theo dõi lộ trình dẫn khách của từng môi giới',
                          'Báo cáo hiệu quả dẫn khách cho chủ nhà',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <PlaceholderModule
                        title="Quy trình Giao dịch Mua bán & Sang nhượng"
                        phase="Giao dịch Mua Bán"
                        description="Theo dõi toàn bộ quy trình từ đặt cọc, chuẩn bị hồ sơ công chứng, thanh toán và bàn giao tài sản."
                        features={[
                          'Quản lý phiếu đặt cọc và điều khoản thanh toán',
                          'Theo dõi tiến độ công chứng mua bán tại văn phòng công chứng',
                          'Hồ sơ đăng bộ sang tên và đóng thuế',
                          'Bàn giao tài sản và thanh lý hợp đồng môi giới',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/rentals"
                    element={
                      <PlaceholderModule
                        title="Nghiệp vụ Cho thuê BĐS"
                        phase="Nghiệp vụ Cho Thuê"
                        description="Quản lý quy trình đặt cọc giữ chỗ thuê, hợp đồng nguyên tắc và bàn giao mặt bằng."
                        features={[
                          'Phiếu cọc giữ chỗ thuê nhà/mặt bằng',
                          'Biên bản bàn giao hiện trạng trang thiết bị',
                          'Xác nhận điều khoản thanh toán tiền cọc và tiền thuê kỳ đầu',
                          'Theo dõi ngày bắt đầu tính tiền thuê',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/contracts"
                    element={
                      <PlaceholderModule
                        title="Quản lý Hợp đồng thuê & Nhắc hạn"
                        phase="Quản trị Hợp đồng"
                        description="Theo dõi hạn hợp đồng thuê, quản lý kỳ thanh toán định kỳ và tự động nhắc nhở trước khi hết hạn."
                        features={[
                          'Theo dõi thời hạn hợp đồng thuê và ngày đến hạn',
                          'Tự động cảnh báo trước 30 - 60 ngày khi hợp đồng sắp hết hạn',
                          'Quản lý kỳ thu tiền thuê và tiền cọc',
                          'Theo dõi gia hạn hoặc tái ký hợp đồng thuê mới',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/commissions"
                    element={
                      <PlaceholderModule
                        title="Quản lý Phí hoa hồng & Doanh thu"
                        phase="Tài chính & Hoa hồng"
                        description="Tính toán và phân chia tỷ lệ hoa hồng cho công ty, trưởng nhóm, người lấy nguồn và người bán hàng."
                        features={[
                          'Ghi nhận tổng phí hoa hồng từ giao dịch thành công',
                          'Bảng phân chia hoa hồng tự động theo cơ chế tỷ lệ',
                          'Theo dõi tình trạng thu tiền hoa hồng từ chủ nhà',
                          'Lịch sử chi trả thưởng và hoa hồng cho từng môi giới',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PlaceholderModule
                        title="Báo cáo & Phân tích Doanh số"
                        phase="Báo cáo & Phân tích"
                        description="Tổng hợp biểu đồ phân tích hiệu suất kinh doanh, doanh thu hoa hồng theo tháng, quý và xếp hạng môi giới xuất sắc."
                        features={[
                          'Biểu đồ doanh số và số lượng giao dịch theo thời gian',
                          'Bảng xếp hạng Top Môi giới và Top Phòng ban',
                          'Thống kê tỷ lệ chuyển đổi từ nguồn hàng sang giao dịch thành công',
                          'Xuất file báo cáo Excel / PDF chuyên nghiệp',
                        ]}
                      />
                    }
                  />
                  <Route
                    path="/audit-logs"
                    element={
                      <PlaceholderModule
                        title="Nhật ký hoạt động hệ thống (Audit Logs)"
                        phase="Bảo mật & Giám sát"
                        description="Ghi lại toàn bộ lịch sử thao tác thêm, sửa, xóa, đổi trạng thái và xem số điện thoại bảo mật của người dùng."
                        features={[
                          'Nhật ký thao tác chi tiết theo thời gian thực',
                          'Ghi lại ai đã xem số điện thoại chủ nhà và thời điểm xem',
                          'Lịch sử thay đổi giá bán/thuê của từng căn nhà',
                          'Phục vụ công tác kiểm tra và bảo mật thông tin nội bộ',
                        ]}
                      />
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
