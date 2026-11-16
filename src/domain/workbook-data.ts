import { z } from "zod";
const text = z.string().max(10000),
  quantity = z.number().int().safe().nonnegative().nullable();
const source = {
  id: z.string().regex(/^XLS-[A-Z0-9]+-\d{2}-\d{5}$/),
  sheet: text,
  sheetIndex: z.number().int().positive(),
  row: z.number().int().positive(),
  issues: z.array(z.string().max(100)).max(30),
};
export const workbookDataSchema = z
  .object({
    version: z.literal(1),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    importedAt: z.string().datetime({ offset: true }),
    localOnly: z.literal(true),
    workbooks: z
      .array(
        z.object({
          fileName: z.string().max(255),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          sheets: z.array(
            z.object({ index: z.number().int().positive(), name: text }),
          ),
        }),
      )
      .length(2),
    uniformRequests: z
      .array(
        z.object({
          ...source,
          employeeCode: text,
          employeeName: text,
          department: text,
          jobTitle: text,
          gender: text,
          uniformType: text,
          sizeRaw: text,
          size: text.nullable(),
          requestedQuantity: quantity,
          requestedQuantityRaw: text,
          issuedQuantity: quantity,
          issuedQuantityRaw: text,
          requestDate: text.nullable(),
          requestDateRaw: text,
          issueDate: text.nullable(),
          issueDateRaw: text,
          prReference: text,
          poReference: text,
          productCode: text,
          productName: text,
          notes: text,
        }),
      )
      .max(20000),
    uniformPurchases: z
      .array(
        z.object({
          ...source,
          productCode: text,
          productName: text,
          unit: text,
          quantity,
          quantityRaw: text,
          unitPrice: quantity,
          unitPriceRaw: text,
          sourceTotalRaw: text,
          budgetName: text,
          budgetCode: text,
          department: text,
          purchaseMonthRaw: text,
          notes: text,
        }),
      )
      .max(20000),
    lockers: z
      .array(
        z.object({
          ...source,
          section: text,
          number: text,
          employeeCode: text,
          employeeName: text,
          jobTitle: text,
          department: text,
          allocationDate: text.nullable(),
          allocationDateRaw: text,
          returnDate: text.nullable(),
          returnDateRaw: text,
          notes: text,
        }),
      )
      .max(20000),
    lockerFaults: z
      .array(
        z.object({
          ...source,
          number: text,
          employeeName: text,
          conditionRaw: text,
          notes: text,
        }),
      )
      .max(20000),
    omittedFields: z.array(z.string().max(100)),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = [
      ...value.uniformRequests,
      ...value.uniformPurchases,
      ...value.lockers,
      ...value.lockerFaults,
    ].map((row) => row.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        message: "Duplicate workbook row identity",
      });
  });
export type WorkbookData = z.infer<typeof workbookDataSchema>;
export const canReadWorkbookData = (role: string) =>
  ["admin", "warehouse", "buyer", "finance", "leader", "sysadmin"].includes(
    role,
  );
export const workbookIssueLabels: Record<string, string> = {
  size_missing_or_composite: "Thiếu cỡ hoặc nhiều cỡ trong một ô",
  employee_identity_incomplete: "Thiếu thông tin định danh",
  request_date_unresolved: "Chưa xác định ngày yêu cầu",
  requested_quantity_unresolved: "Chưa xác định lượng yêu cầu",
  issued_quantity_unresolved: "Chưa xác định lượng đã cấp",
  issue_date_unresolved: "Chưa xác định ngày cấp",
  issued_differs_from_requested: "Lượng cấp khác lượng yêu cầu",
  formula_cached_values_only: "Dùng giá trị công thức được lưu trong file",
  unit_not_a_uniform_set: "Đơn vị chưa quy đổi sang bộ",
  quantity_unresolved: "Chưa xác định số lượng",
  price_unresolved: "Chưa xác định đơn giá",
  employee_code_missing_do_not_join_by_name:
    "Thiếu mã nhân viên; chưa ghép theo tên",
  occupant_missing_not_proof_of_availability:
    "Thiếu người sử dụng; chưa kết luận tủ trống",
  multiple_occupants: "Một ô có nhiều người sử dụng",
  allocation_date_unresolved: "Chưa xác định ngày cấp tủ",
  return_date_unresolved: "Chưa xác định ngày thu hồi",
  return_before_allocation: "Ngày thu hồi trước ngày cấp",
  location_and_current_condition_require_review:
    "Cần xác minh vị trí và tình trạng hiện tại",
};
