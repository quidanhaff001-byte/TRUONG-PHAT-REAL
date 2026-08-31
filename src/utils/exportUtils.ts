import { Property } from '../types';
import { formatVND, formatArea, formatDimensions, formatDate } from './formatters';

/**
 * Export properties to standard CSV format with UTF-8 BOM for Microsoft Excel compatibility
 */
export const exportPropertiesToCSV = (properties: Property[], filename = 'Danh_sach_BDS.csv') => {
  if (!properties || properties.length === 0) return;

  const headers = [
    'Mã BĐS',
    'Tiêu đề',
    'Loại giao dịch',
    'Loại BĐS',
    'Giá bán / Giá thuê',
    'Diện tích đất (m2)',
    'Diện tích SD (m2)',
    'Kích thước (N x D)',
    'Địa chỉ',
    'Quận / Huyện',
    'Tỉnh / TP',
    'Hướng nhà',
    'Pháp lý',
    'Chủ nhà',
    'Số điện thoại chủ',
    'Môi giới phụ trách',
    'Trạng thái',
    'Hoa hồng (%)',
    'Ngày tiếp nhận',
  ];

  const rows = properties.map((p) => [
    p.code || '',
    `"${(p.title || '').replace(/"/g, '""')}"`,
    p.transactionType === 'SALE'
      ? 'Bán'
      : p.transactionType === 'RENT'
      ? 'Cho thuê'
      : p.transactionType === 'TRANSFER'
      ? 'Sang nhượng'
      : 'Bán & Cho thuê',
    `"${p.propertyType || ''}"`,
    p.salePrice
      ? p.salePrice
      : p.rentPriceMonthly
      ? `${p.rentPriceMonthly}/tháng`
      : p.transferPrice
      ? `Sang ${p.transferPrice}`
      : 'Thỏa thuận',
    p.landArea || '',
    p.usableArea || '',
    formatDimensions(p.width, p.length),
    `"${(p.address || '').replace(/"/g, '""')}"`,
    `"${p.district || ''}"`,
    `"${p.city || ''}"`,
    p.direction || '',
    `"${p.legalType || ''}"`,
    `"${(p.ownerName || '').replace(/"/g, '""')}"`,
    `"${p.ownerPhone || ''}"`,
    `"${p.assignedAgentName || ''}"`,
    `"${p.status || ''}"`,
    p.commissionRate ? `${p.commissionRate}%` : '',
    p.createdAt ? formatDate(p.createdAt) : '',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate a quick text summary formatted for sending via Zalo / Messenger / SMS
 */
export const generateZaloBrief = (property: Property): string => {
  const priceStr = property.salePrice
    ? formatVND(property.salePrice)
    : property.rentPriceMonthly
    ? `${formatVND(property.rentPriceMonthly)}/tháng`
    : property.transferPrice
    ? `Sang nhượng ${formatVND(property.transferPrice)}`
    : 'Thương lượng';

  const specs = [
    `🏡 [${property.code}] ${property.title}`,
    `📍 Vị trí: ${property.address}`,
    `📐 Diện tích: ${formatArea(property.landArea)} ${property.width && property.length ? `(${property.width}m x ${property.length}m)` : ''}`,
    property.usableArea ? `🏢 DT sử dụng: ${formatArea(property.usableArea)}` : null,
    property.floors ? `🏗️ Kết cấu: ${property.floors} tầng ${property.bedrooms ? `(${property.bedrooms}PN, ${property.bathrooms || 0}WC)` : ''}` : null,
    property.direction ? `🧭 Hướng: ${property.direction}` : null,
    property.legalType ? `📑 Pháp lý: ${property.legalType}` : null,
    `💰 GIÁ: ${priceStr}`,
    property.assignedAgentName ? `📞 Liên hệ xem nhà: ${property.assignedAgentName} (${property.assignedAgentPhone || 'Zalo'})` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return specs;
};

/**
 * Print a professional property list report
 */
export const printPropertyListReport = (properties: Property[], title = 'BÁO CÁO DANH MỤC NGUỒN HÀNG BẤT ĐỘNG SẢN') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRows = properties
    .map(
      (p, i) => `
    <tr>
      <td style="text-align:center; padding: 6px; border: 1px solid #ddd;">${i + 1}</td>
      <td style="font-weight: bold; padding: 6px; border: 1px solid #ddd; font-family: monospace;">${p.code}</td>
      <td style="padding: 6px; border: 1px solid #ddd;">
        <strong>${p.title}</strong><br/>
        <small style="color: #666;">${p.address}</small>
      </td>
      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${p.propertyType}</td>
      <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #b45309; text-align: right;">
        ${
          p.salePrice
            ? formatVND(p.salePrice)
            : p.rentPriceMonthly
            ? `${formatVND(p.rentPriceMonthly)}/th`
            : p.transferPrice
            ? `Sang ${formatVND(p.transferPrice)}`
            : 'Thỏa thuận'
        }
      </td>
      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${formatArea(p.landArea)}</td>
      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${p.legalType || '-'}</td>
      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${p.status}</td>
      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${p.assignedAgentName || '-'}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #1e293b; }
          h1 { font-size: 18px; text-transform: uppercase; margin-bottom: 4px; color: #001f3f; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #001f3f; padding-bottom: 12px; margin-bottom: 16px; }
          .meta { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background-color: #001f3f; color: #fff; padding: 8px 6px; border: 1px solid #001f3f; text-align: center; }
          @media print {
            button { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #D4AF37; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: #00172e; font-family: sans-serif; border: 1px solid #b38e22;">TP</div>
            <div>
              <h1 style="margin: 0; font-size: 16px; color: #001f3f; font-weight: 900;">${title}</h1>
              <div class="meta" style="margin-top: 3px;">TRUONG PHAT REAL • Hệ thống Quản trị Bất Động Sản An Giang • Hotline: 0919 414 884</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; color: #001f3f;">Tổng số: ${properties.length} sản phẩm</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Ngày in: ${new Date().toLocaleString('vi-VN')}</div>
            <button onclick="window.print()" style="margin-top: 6px; padding: 6px 14px; background: #001f3f; color: #D4AF37; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">In Báo Cáo</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">STT</th>
              <th style="width: 70px;">Mã BĐS</th>
              <th>Tiêu đề & Địa chỉ</th>
              <th style="width: 90px;">Loại BĐS</th>
              <th style="width: 100px;">Mức Giá</th>
              <th style="width: 70px;">Diện tích</th>
              <th style="width: 80px;">Pháp lý</th>
              <th style="width: 90px;">Trạng thái</th>
              <th style="width: 90px;">Môi giới</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
