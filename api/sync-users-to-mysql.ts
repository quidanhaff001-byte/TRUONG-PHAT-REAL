import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initFirebaseAdmin } from './_lib/firebaseAdmin';

const MYSQL_API = 'https://api.anminhtown.vn';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const authHeader =
      req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu token đăng nhập'
      });
    }

    const { auth, db } =
      initFirebaseAdmin();

    if (!auth || !db) {
      return res.status(503).json({
        success: false,
        message:
          'Firebase Admin chưa được cấu hình'
      });
    }

    const token = authHeader
      .replace('Bearer ', '')
      .trim();

    const decoded =
      await auth.verifyIdToken(token);

    let role =
      (decoded.role as string) ||
      (decoded.admin
        ? 'ADMIN'
        : '');

    if (role !== 'ADMIN') {
      const adminDoc =
        await db
          .collection('users')
          .doc(decoded.uid)
          .get();

      if (
        adminDoc.exists &&
        adminDoc.data()?.role ===
          'ADMIN'
      ) {
        role = 'ADMIN';
      }
    }

    if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message:
          'Chỉ ADMIN mới được đồng bộ'
      });
    }

    const snapshot =
      await db
        .collection('users')
        .get();

    let successCount = 0;
    let failedCount = 0;

    const errors: any[] = [];

    for (
      const userDoc of snapshot.docs
    ) {
      const data =
        userDoc.data();

      const payload = {
        uid:
          userDoc.id,

        providedUid:
          userDoc.id,

        employeeCode:
          data.employeeCode ||
          `EMP_${userDoc.id
            .substring(0, 8)
            .toUpperCase()}`,

        displayName:
          data.displayName ||
          data.fullName ||
          '',

        fullName:
          data.fullName ||
          data.displayName ||
          '',

        email:
          data.email || '',

        phone:
          data.phone || '',

        role:
          data.role ||
          'AGENT',

        roleName:
          data.roleName ||
          '',

        teamId:
          data.teamId ||
          null,

        teamName:
          data.teamName ||
          '',

        department:
          data.department ||
          '',

        directManagerId:
          data.directManagerId ||
          null,

        directManagerName:
          data.directManagerName ||
          '',

        dateOfBirth:
          data.dateOfBirth ||
          null,

        address:
          data.address ||
          '',

        status:
          data.status ||
          'ACTIVE',

        workStatus:
          data.workStatus ||
          'ACTIVE',

        notes:
          data.notes ||
          '',

        avatarUrl:
          data.avatarUrl ||
          '',

        customPermissions:
          data.customPermissions ||
          {}
      };

      try {
        let response =
          await fetch(
            `${MYSQL_API}/api/admin/create-user`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify(
                  payload
                )
            }
          );

        let result: any =
          await response
            .json()
            .catch(() => ({}));

        /*
         * Nếu đã tồn tại
         * thì chuyển sang update
         */
        if (
          !response.ok ||
          !result?.success
        ) {
          response =
            await fetch(
              `${MYSQL_API}/api/admin/update-user`,
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify(
                    payload
                  )
              }
            );

          result =
            await response
              .json()
              .catch(
                () => ({})
              );
        }

        if (
          response.ok &&
          result?.success
        ) {
          successCount++;
        } else {
          failedCount++;

          errors.push({
            uid:
              userDoc.id,

            email:
              data.email ||
              '',

            message:
              result?.message ||
              `HTTP ${response.status}`
          });
        }
      } catch (
        error: any
      ) {
        failedCount++;

        errors.push({
          uid:
            userDoc.id,

          email:
            data.email ||
            '',

          message:
            error?.message ||
            'Unknown error'
        });
      }
    }

    return res.json({
      success:
        failedCount === 0,

      message:
        failedCount === 0
          ? 'Đồng bộ nhân viên sang MySQL thành công'
          : 'Đã đồng bộ nhưng có bản ghi lỗi',

      total:
        snapshot.size,

      successCount,

      failedCount,

      errors
    });

  } catch (error: any) {

    console.error(
      'sync-users-to-mysql:',
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error?.message ||
          'Không thể đồng bộ nhân viên'
      });
  }
}
