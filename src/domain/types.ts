export type Role =
  | "employee"
  | "coordinator"
  | "head"
  | "admin"
  | "warehouse"
  | "buyer"
  | "finance"
  | "leader"
  | "documents"
  | "sysadmin";
export const roleLabels: Record<Role, string> = {
  employee: "Nhân viên",
  coordinator: "Điều phối khoa",
  head: "Trưởng khoa",
  admin: "Hành chính",
  warehouse: "Thủ kho",
  buyer: "Mua sắm",
  finance: "Tài chính",
  leader: "Lãnh đạo",
  documents: "Quản lý tài liệu",
  sysadmin: "Quản trị demo",
};
export type Job = "doctor" | "nurse" | "technician" | "office";
export type EmployeeGender = "male" | "female" | "unspecified";
export type ProductGender = "male" | "female" | "unisex";
export const genderLabels = {
  male: "Nam",
  female: "Nữ",
  unspecified: "Chưa cập nhật",
  unisex: "Dùng chung",
};
export interface PurchaseContext {
  budgetName: string;
  budgetCode: string;
  budgetDepartmentId: string;
  purchaseMonth: string;
}
export const jobLabels: Record<Job, string> = {
  doctor: "Bác sĩ",
  nurse: "Điều dưỡng",
  technician: "Kỹ thuật viên",
  office: "Hành chính",
};
export interface Department {
  id: string;
  name: string;
}
export interface Employee {
  id: string;
  name: string;
  departmentId: string;
  job: Job;
  gender: EmployeeGender;
  active: boolean;
}
export interface Account {
  id: string;
  name: string;
  employeeId: string;
  role: Role;
  departmentId: string;
}
export interface Sku {
  id: string;
  code: string;
  name: string;
  category: Job;
  size: string;
  gender: ProductGender;
  price: number;
  minStock: number;
  active: boolean;
}
export interface Lot {
  id: string;
  skuId: string;
  warehouse: string;
  price: number;
  date: string;
}
export interface Movement {
  id: string;
  lotId: string;
  quantity: number;
  date: string;
  reason: string;
  source: string;
}
export interface Line {
  employeeId: string;
  skuId: string;
  quantity: number;
}
export interface Reservation {
  lotId: string;
  skuId: string;
  quantity: number;
  price: number;
  employeeId: string;
}
export interface Decision {
  actorId: string;
  role: Role;
  approved: boolean;
  reason: string;
  date: string;
}
export type UniformStatus =
  | "draft"
  | "waiting_stock"
  | "pending"
  | "reserved"
  | "issued"
  | "rejected"
  | "cancelled";
export interface UniformRequest {
  id: string;
  departmentId: string;
  warehouse: string;
  requesterId: string;
  date: string;
  year: number;
  limit: number;
  status: UniformStatus;
  lines: Line[];
  decisions: Decision[];
  stages: Role[];
  reservations: Reservation[];
  exceptionReason: string;
  note: string;
}
export interface Issuance {
  id: string;
  requestId: string;
  employeeId: string;
  departmentId: string;
  skuId: string;
  lotId: string;
  quantity: number;
  price: number;
  date: string;
  returned: number;
}
export interface SupplierProduct {
  id: string;
  supplier: string;
  code: string;
  name: string;
  category: Job;
  size: string;
  gender: ProductGender;
  price: number;
  material: string;
}
export interface Mapping {
  skuId: string;
  productId: string;
  confirmedBy: string;
  reason: string;
}
export interface PurchaseLine {
  skuId: string;
  quantity: number;
  purpose: "reserve" | "shortage";
  sourceRequestId: string;
  productId: string;
  price: number;
}
export interface Purchase {
  id: string;
  requesterId: string;
  supplier: string;
  date: string;
  status:
    "draft" | "pending" | "approved" | "ordered" | "rejected" | "cancelled";
  lines: PurchaseLine[];
  decisions: Decision[];
  stages: Role[];
  reserveLimit: number;
  headcount: number;
  note: string;
  context: PurchaseContext;
}
export interface Order {
  id: string;
  purchaseId: string;
  supplier: string;
  date: string;
  status: "created" | "partial" | "received";
  lines: { skuId: string; quantity: number; received: number; price: number }[];
  operationId: string;
  context: PurchaseContext;
}
export interface Receipt {
  id: string;
  orderId: string;
  date: string;
  actorId: string;
  lines: { skuId: string; quantity: number; lotId: string }[];
}
export interface DocumentSection {
  id: string;
  title: string;
  text: string;
}
export interface DemoDocument {
  id: string;
  title: string;
  category: string;
  departmentId: string;
  owner: string;
  version: number;
  date: string;
  expires: string;
  status: "draft" | "reviewed" | "published" | "revoked" | "superseded";
  readRoles: Role[];
  signRoles: Role[];
  sections: DocumentSection[];
  original: string;
  reviewedBy: string;
  history: { version: number; date: string; action: string }[];
  signatures: { accountId: string; version: number; date: string }[];
}
export interface Locker {
  id: string;
  number: string;
  building: string;
  floor: string;
  area: string;
  departmentId: string;
  condition: "good" | "maintenance";
  active: boolean;
  employeeId: string;
  assignedDepartmentId: string;
  reservedFor: string;
}
export interface LockerEvent {
  id: string;
  lockerId: string;
  date: string;
  actorId: string;
  action: string;
  from: string;
  to: string;
  reason: string;
}
export interface Audit {
  id: string;
  date: string;
  actorId: string;
  module: string;
  entityId: string;
  action: string;
  detail: string;
  before?: Record<string, string | number | boolean>;
  after?: Record<string, string | number | boolean>;
}
export interface Settings {
  date: string;
  annualLimit: number;
  reserveRatio: number;
  reserveSets: number;
  sapFailure: boolean;
  uniformStages: Role[];
  purchaseStages: Role[];
}
export interface StateData {
  workbookData?: import("./workbook-data").WorkbookData;
  schemaVersion: 2;
  revision: number;
  sequence: number;
  departments: Department[];
  employees: Employee[];
  accounts: Account[];
  skus: Sku[];
  lots: Lot[];
  movements: Movement[];
  uniforms: UniformRequest[];
  issuances: Issuance[];
  supplierProducts: SupplierProduct[];
  mappings: Mapping[];
  purchases: Purchase[];
  orders: Order[];
  receipts: Receipt[];
  documents: DemoDocument[];
  lockers: Locker[];
  lockerEvents: LockerEvent[];
  audits: Audit[];
  readNotifications: Record<string, string[]>;
  operations: string[];
  settings: Settings;
}
/** Canonical state is only committed by the domain engine. */
export interface State extends StateData {
  readModel?: never;
}
/** An authorized read DTO: never a valid input to execute/assertState. */
export interface StateView extends StateData {
  readModel: ReadModel;
}
export type ReadState = State | StateView;
export interface StateRef {
  workspaceId: string;
  revision: number;
}
export interface ReadModel {
  externalAiBlocked?: boolean;
  ref: StateRef;
  principalId: string;
  stocks: Record<string, { physical: number; held: number; available: number }>;
  quota: Record<string, { issued: number; committed: number }>;
  lastIssued: Record<string, string>;
  shortage: {
    requestId: string;
    departmentId: string;
    skuId: string;
    quantity: number;
  }[];
  reserveCap: number;
  headcount: number;
  approvals: Record<string, boolean>;
}
export const statuses: Record<string, string> = {
  draft: "Bản nháp",
  waiting_stock: "Chờ bổ sung",
  pending: "Chờ duyệt",
  reserved: "Đã giữ hàng",
  issued: "Đã cấp phát",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
  approved: "Đã duyệt",
  ordered: "Đã đặt hàng",
  created: "Đã tạo",
  partial: "Nhận một phần",
  received: "Đã nhận đủ",
  reviewed: "Đã rà soát",
  published: "Đang hiệu lực",
  revoked: "Đã thu hồi",
  superseded: "Phiên bản cũ",
  expired: "Hết hiệu lực",
  good: "Tốt",
  available: "Trống",
  occupied: "Đang sử dụng",
  maintenance: "Bảo trì",
  held: "Đã giữ chỗ",
};
export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("vi-VN");
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
