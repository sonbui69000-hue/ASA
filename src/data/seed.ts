import type { State, Role, Job, DemoDocument } from "../domain/types";
import { execute, type Command } from "../domain/commands";
import { jobLabels } from "../domain/types";
const all: Role[] = [
  "employee",
  "coordinator",
  "head",
  "admin",
  "warehouse",
  "buyer",
  "finance",
  "leader",
  "documents",
  "sysadmin",
];
export function createSeed(): State {
  const departments = [
    { id: "KKB", name: "Khoa Khám bệnh" },
    { id: "NOI", name: "Khoa Nội" },
    { id: "NGOAI", name: "Khoa Ngoại" },
    { id: "DD", name: "Điều dưỡng" },
    { id: "HC", name: "Hành chính" },
    { id: "TC", name: "Tài chính" },
  ];
  const employees: State["employees"] = departments.flatMap((d, i) =>
    Array.from({ length: [30, 25, 20, 15, 15, 15][i] }, (_, j) => ({
      id: `DEMO-NV-${String([0, 30, 55, 75, 90, 105][i] + j + 1).padStart(3, "0")}`,
      name: `Nhân viên demo ${String([0, 30, 55, 75, 90, 105][i] + j + 1).padStart(3, "0")}`,
      departmentId: d.id,
      job: (i > 3
        ? "office"
        : j % 3 === 0
          ? "doctor"
          : j % 3 === 1
            ? "nurse"
            : "technician") as Job,
      active: true,
      gender: j % 2 === 0 ? "female" : "male",
    })),
  );
  // Các hồ sơ trình diễn dùng người thuộc cùng khoa, chức danh rõ ràng.
  employees[30].job = "nurse";
  employees[31].job = "nurse";
  employees[32].job = "doctor";
  const accounts = [
    ["coord", "Điều phối khoa Nội", "coordinator", "NOI", 30],
    ["head", "Trưởng khoa Nội", "head", "NOI", 34],
    ["hc", "Hành chính tổng hợp", "admin", "HC", 90],
    ["warehouse", "Thủ kho trung tâm", "warehouse", "HC", 91],
    ["buyer", "Chuyên viên mua sắm", "buyer", "HC", 92],
    ["finance", "Kiểm soát tài chính", "finance", "TC", 105],
    ["leader", "Lãnh đạo phê duyệt", "leader", "HC", 93],
    ["docs", "Quản lý tài liệu", "documents", "HC", 94],
    ["employee", "Nhân viên khoa Nội", "employee", "NOI", 33],
    ["system", "Quản trị bản mẫu", "sysadmin", "HC", 95],
  ].map(([id, name, role, departmentId, index]) => ({
    id: String(id),
    name: String(name),
    role: role as Role,
    departmentId: String(departmentId),
    employeeId: employees[Number(index)].id,
  }));
  for (const [dep, index] of [
    ["KKB", 0],
    ["NGOAI", 55],
    ["DD", 75],
    ["HC", 96],
    ["TC", 106],
  ] as const) {
    const label = departments.find((d) => d.id === dep)!.name;
    accounts.push(
      {
        id: "head-" + dep,
        name: "Trưởng " + label.toLowerCase(),
        role: "head",
        departmentId: dep,
        employeeId: employees[index].id,
      },
      {
        id: "coord-" + dep,
        name: "Điều phối " + label.toLowerCase(),
        role: "coordinator",
        departmentId: dep,
        employeeId: employees[index + (dep === "HC" ? 2 : 1)].id,
      },
    );
  }
  accounts.push({
    id: "hc-2",
    name: "Hành chính • người duyệt bổ sung",
    role: "admin",
    departmentId: "HC",
    employeeId: employees[97].id,
  });
  const jobs: Job[] = ["doctor", "nurse", "technician", "office"];
  const skus: State["skus"] = jobs.flatMap((category, i) =>
    ["S", "M", "L", "XL"].map((size, j) => ({
      id: `SKU-${i}-${j}`,
      code: `DP-${["BS", "DD", "KT", "HC"][i]}-${size}`,
      name: `Bộ đồng phục ${jobLabels[category].toLowerCase()}`,
      category,
      size,
      gender: "unisex",
      price: [420000, 300000, 320000, 280000][i],
      minStock: 5,
      active: true,
    })),
  );
  // Fictional variants inspired only by field formats, never by workbook records/prices/codes.
  skus.push(
    {
      id: "SKU-DD-F-XS",
      code: "DP-DD-NU-XS",
      name: "Bộ điều dưỡng nữ cỡ XS demo",
      category: "nurse",
      gender: "female",
      size: "XS",
      price: 318000,
      minStock: 4,
      active: true,
    },
    {
      id: "SKU-DD-F-XXL",
      code: "DP-DD-NU-XXL",
      name: "Bộ điều dưỡng nữ cỡ XXL demo",
      category: "nurse",
      gender: "female",
      size: "XXL",
      price: 328000,
      minStock: 4,
      active: true,
    },
    {
      id: "SKU-DD-M-XXL",
      code: "DP-DD-NAM-XXL",
      name: "Bộ điều dưỡng nam cỡ XXL demo",
      category: "nurse",
      gender: "male",
      size: "XXL",
      price: 332000,
      minStock: 4,
      active: true,
    },
    {
      id: "SKU-BS-M-XXL",
      code: "DP-BS-NAM-XXL",
      name: "Bộ bác sĩ nam cỡ XXL demo",
      category: "doctor",
      gender: "male",
      size: "XXL",
      price: 436000,
      minStock: 4,
      active: true,
    },
    {
      id: "SKU-KT-U-3XL",
      code: "DP-KT-3XL",
      name: "Bộ kỹ thuật cỡ 3XL demo",
      category: "technician",
      gender: "unisex",
      size: "3XL",
      price: 346000,
      minStock: 4,
      active: true,
    },
    {
      id: "SKU-HC-M-40",
      code: "DP-HC-NAM-40",
      name: "Bộ hành chính nam cỡ 40 demo",
      category: "office",
      gender: "male",
      size: "40",
      price: 292000,
      minStock: 4,
      active: true,
    },
  );
  const lots = skus
    .filter((s) => !["SKU-0-3", "SKU-DD-F-XXL"].includes(s.id))
    .map((s, i) => ({
      id: `LOT-${i}`,
      skuId: s.id,
      warehouse: "TT",
      price: s.price,
      date: "2026-09-01",
    }));
  const movements = lots.map((l, i) => ({
    id: `MOV-${i}`,
    lotId: l.id,
    quantity: l.skuId === "SKU-1-1" ? 10 : 12 + (i % 9),
    date: l.date,
    reason: "Nhận hàng tổng hợp đầu kỳ demo",
    source: `DEMO-PNK-${i}`,
  }));
  lots.push({
    id: "LOT-HISTORY",
    skuId: "SKU-1-1",
    warehouse: "TT",
    price: 260000,
    date: "2026-01-01",
  });
  movements.push(
    {
      id: "MOV-HISTORY-IN",
      lotId: "LOT-HISTORY",
      quantity: 2,
      date: "2026-01-01",
      reason: "Nhận lô lịch sử demo",
      source: "DEMO-PNK-HISTORY",
    },
    {
      id: "MOV-HISTORY-OUT",
      lotId: "LOT-HISTORY",
      quantity: -2,
      date: "2026-03-15",
      reason: "Cấp phát lịch sử demo",
      source: "DEMO-CP-001",
    },
  );
  const supplierProducts = skus.flatMap((s, i) => [
    {
      id: `SP-A-${s.id}`,
      supplier: "Đồng Phục An Tâm (demo)",
      code: `SAP-A-${1000 + i}`,
      name: s.name,
      category: s.category,
      size: s.size,
      gender: s.gender,
      price: s.price,
      material: "Cotton 65%",
    },
    {
      id: `SP-B-${s.id}`,
      supplier: "May Minh An (demo)",
      code: `SAP-B-${2000 + i}`,
      name: s.name + " loại tương tự",
      category: s.category,
      size: s.size,
      gender: s.gender,
      price: s.price - 20000,
      material: "Polyester 80%",
    },
  ]);
  const doc = (
    id: string,
    title: string,
    category: string,
    sections: { title: string; text: string }[],
    roles: Role[] = all,
  ): DemoDocument => ({
    id,
    title,
    category,
    departmentId: "HC",
    owner: "Phòng Hành chính • Bệnh viện Minh An demo",
    version: 1,
    date: "2026-01-01",
    expires: "2027-12-31",
    status: "published",
    readRoles: roles,
    signRoles: ["employee", "coordinator", "head"],
    sections: sections.map((s, i) => ({ ...s, id: `muc-${i + 1}` })),
    original: "",
    reviewedBy: "docs",
    history: [
      { version: 1, date: "2026-01-01", action: "Xuất bản tài liệu hư cấu" },
    ],
    signatures: [],
  });
  const documents = [
    doc("DEMO-TL-001", "Quy định hành chính nội bộ", "Quy định", [
      {
        title: "1. Phạm vi và trách nhiệm",
        text: "Tài liệu hư cấu phục vụ trình diễn tại Bệnh viện Minh An. Phòng Hành chính tiếp nhận yêu cầu đồng phục, tủ đồ và nhu cầu mua sắm của các khoa. Mỗi yêu cầu cần ghi rõ nhân viên, khoa đề nghị, số lượng và người chịu trách nhiệm. Không sử dụng thông tin bệnh nhân hoặc hồ sơ thật trong bản mẫu.",
      },
      {
        title: "2. Tiếp nhận và xử lý",
        text: "Điều phối khoa lập yêu cầu trực tuyến, kiểm tra thông tin trước khi gửi. Trưởng khoa xác nhận nhu cầu của đơn vị. Bộ phận Hành chính kiểm tra điều kiện nghiệp vụ và bàn giao công việc cho người phụ trách. Người gửi theo dõi tiến độ tại Việc cần xử lý và lịch sử hồ sơ. Yêu cầu bị từ chối phải ghi rõ lý do để người lập chỉnh sửa.",
      },
      {
        title: "3. Lưu trữ và xác nhận",
        text: "Mọi quyết định duyệt, hủy, bàn giao và thu hồi đều lưu nhật ký. Người được chỉ định xác nhận đã đọc đúng phiên bản tài liệu. Khi có phiên bản mới, xác nhận cũ được giữ trong lịch sử và không thay thế xác nhận của phiên bản hiện hành.",
      },
    ]),
    doc("DEMO-TL-002", "Chính sách cấp phát đồng phục", "Đồng phục", [
      {
        title: "1. Đối tượng áp dụng",
        text: "Bác sĩ, điều dưỡng, kỹ thuật viên và nhân viên hành chính được chọn loại đồng phục phù hợp chức danh. Mỗi mã hàng demo xác định một bộ hoàn chỉnh, biến thể dùng chung/nam/nữ và một cỡ rõ ràng theo danh mục. Cỡ 2XL được chuẩn hóa thành XXL. Biến thể nam/nữ cần phù hợp thông tin nhân viên đã cập nhật; mã dùng chung không yêu cầu giới tính. Nhân viên khoa đề nghị phải đang hoạt động.",
      },
      {
        title: "2. Định mức hằng năm",
        text: "Định mức mặc định là 3 bộ cho mỗi nhân viên trong một năm dương lịch. Khi kiểm tra, hệ thống cộng số đã cấp và số đang cam kết trên những yêu cầu đã gửi. Ngoại lệ vượt định mức phải có lý do và thêm bước phê duyệt của Lãnh đạo; trợ lý không tự cho phép ngoại lệ.",
      },
      {
        title: "3. Duyệt và bàn giao",
        text: "Yêu cầu được Trưởng khoa rồi Hành chính duyệt. Duyệt cuối giữ hàng và giảm tồn khả dụng. Thủ kho xác nhận bàn giao mới trừ tồn vật lý và ghi lịch sử cấp theo giá mua của lô. Hủy trước bàn giao giải phóng phần giữ hàng. Giá cấp phát lịch sử không thay đổi khi giá danh mục thay đổi.",
      },
      {
        title: "4. Thiếu hàng và dự trữ",
        text: "Khi thiếu đồng phục, tổng hợp nhu cầu chưa có cam kết mua để lập đề nghị bổ sung. Mua dự trữ mỗi lần tối đa 40% quân số hoạt động toàn viện, một bộ trên mỗi người và làm tròn xuống. Cấu hình demo có thể được quản trị điều chỉnh; số áp dụng phải đọc từ thiết lập hiện hành.",
      },
    ]),
    doc(
      "DEMO-TL-003",
      "Quy trình đề nghị và nhận hàng",
      "Mua sắm",
      [
        {
          title: "1. Lập đề nghị",
          text: "Người mua lựa chọn mã nội bộ, nhà cung cấp, số lượng và mục đích bổ sung hoặc dự trữ. Một đề nghị dùng một nhà cung cấp. Dòng bổ sung phải tham chiếu yêu cầu đồng phục thiếu hàng; không cam kết mua hai lần cho cùng phần thiếu.",
        },
        {
          title: "2. Phê duyệt nhiều bên",
          text: "Đề nghị đi qua Hành chính, Tài chính và Lãnh đạo. Mỗi bước do tài khoản độc lập xử lý; người gửi không tự duyệt. Mã nhà cung cấp khác mô tả hoặc chất liệu cần được người mua xác nhận kèm lý do trước gửi.",
        },
        {
          title: "3. Đặt và nhận hàng",
          text: "Sau đủ duyệt, người mua xác nhận tạo PO qua adapter SAP mô phỏng. Không có kết nối SAP thật. Tạo PO không tăng tồn kho. Thủ kho kiểm tra và xác nhận lượng nhận thực tế, có thể nhận nhiều lần nhưng không vượt lượng đặt. Mỗi phiếu nhận tăng kho một lần duy nhất.",
        },
      ],
      ["admin", "buyer", "warehouse", "finance", "leader", "documents"],
    ),
    doc(
      "DEMO-TL-004",
      "Hợp đồng cung cấp đồng phục An Tâm",
      "Hợp đồng",
      [
        {
          title: "1. Các bên và phạm vi hư cấu",
          text: "Bên mua: Bệnh viện Minh An demo. Bên bán: Đồng Phục An Tâm demo. Toàn bộ bên ký, mã hàng và điều khoản này được tạo cho mục đích trình diễn, không phải hợp đồng Vinmec hoặc hợp đồng có hiệu lực pháp lý.",
        },
        {
          title: "2. Hàng hóa và giao nhận",
          text: "Bộ điều dưỡng cỡ M dùng mã SAP-A-1005, chất liệu Cotton 65%, đơn giá tham chiếu 300.000 đồng mỗi bộ. Thời hạn giao hàng mẫu là 10 ngày làm việc kể từ xác nhận PO demo. Bộ phận kho đối chiếu mã hàng, cỡ và số lượng trước xác nhận nhận hàng.",
        },
        {
          title: "3. Nghiệm thu và truy cập",
          text: "Hàng sai cỡ hoặc thiếu số lượng phải được ghi chú và chỉ xác nhận phần đã nhận hợp lệ. Nội dung hợp đồng chỉ dành cho người được cấp quyền Mua sắm hoặc Tài chính. Trợ lý không cung cấp đoạn trích khi người hỏi không có quyền đọc.",
        },
      ],
      ["buyer", "finance", "leader", "documents"],
    ),
    doc("DEMO-TL-005", "Quy định phân bổ và hoàn trả tủ đồ", "Tủ đồ", [
      {
        title: "1. Điều kiện cấp tủ",
        text: "Chỉ tủ đang hoạt động, tình trạng tốt và chưa được sử dụng hoặc giữ chỗ mới được phân bổ. Một nhân viên dùng tối đa một tủ. Mã tủ phải phân biệt tòa nhà, tầng, khu và số tủ. Đơn vị sở hữu tủ được quản lý độc lập với người sử dụng.",
      },
      {
        title: "2. Phân bổ và chuyển giao",
        text: "Hành chính nhập số lượng, lựa chọn vị trí ưu tiên và xem danh sách gợi ý trước xác nhận. Danh sách sắp theo khu và số tủ. Không đủ số tủ phải điều chỉnh yêu cầu, không tự cấp một phần. Chuyển giao phải ghi người cũ, người mới và lý do.",
      },
      {
        title: "3. Hoàn trả và bảo trì",
        text: "Khi trả hoặc thu hồi tủ, Hành chính xác nhận và lưu lịch sử. Tủ đang bảo trì không được coi là tủ trống có thể cấp. Thay đổi tình trạng không tự xóa người đang sử dụng; cần xử lý giao nhận trước khi ngừng hoạt động.",
      },
    ]),
    doc("DEMO-TL-006", "Hướng dẫn bàn giao cần rà soát", "Quy định", [
      {
        title: "1. Ví dụ thông tin tổng hợp",
        text: "Tên liên hệ giả: Nhân viên demo 999. Điện thoại tổng hợp: 0900000000. Email tổng hợp: demo@example.invalid. Người rà soát cần che các thông tin liên hệ trước khi lập chỉ mục.",
      },
    ]),
    doc("DEMO-TL-007", "Thông báo cấp tủ phiên bản cũ", "Tủ đồ", [
      {
        title: "1. Nội dung đã thu hồi",
        text: "Văn bản hư cấu này đã thu hồi, không được dùng làm bằng chứng cho tra cứu hiện hành.",
      },
    ]),
  ];
  documents[1].version = 2;
  documents[1].date = "2026-07-01";
  documents[1].history.push({
    version: 2,
    date: "2026-07-01",
    action: "Cập nhật chính sách cấp phát demo",
  });
  documents[5].status = "draft";
  documents[5].original = documents[5].sections[0].text;
  documents[5].reviewedBy = "";
  documents[5].history = [
    {
      version: 1,
      date: "2026-01-01",
      action: "Nhập bản nháp tổng hợp chờ rà soát",
    },
  ];
  documents[6].status = "revoked";
  documents[6].history.push({
    version: 1,
    date: "2026-06-30",
    action: "Thu hồi thông báo cũ",
  });
  const expired = doc(
    "DEMO-TL-008",
    "Hướng dẫn lưu trữ tạm thời đã hết hạn",
    "Quy định",
    [
      {
        title: "1. Nội dung lưu trữ cũ",
        text: "Văn bản hư cấu từng áp dụng trong bộ demo năm 2025. Hồ sơ hết hiệu lực không được dùng để trả lời tra cứu hiện hành; cần sử dụng quy trình đã được xuất bản và còn hiệu lực.",
      },
    ],
  );
  expired.date = "2025-01-01";
  expired.expires = "2025-12-31";
  expired.history[0].date = "2025-01-01";
  documents.push(expired);
  const lockers = Array.from({ length: 60 }, (_, i) => ({
    id: `DEMO-TU-${String(i + 1).padStart(3, "0")}`,
    number: String((i % 20) + 1).padStart(2, "0"),
    building: i < 40 ? "Tòa A" : "Tòa B",
    floor: String(Math.floor(i / 20) + 1),
    area: ["Khu A", "Khu B", "Khu C"][Math.floor(i / 20)],
    departmentId: ["NOI", "NGOAI", "HC"][Math.floor(i / 20)],
    condition: (i >= 20 && i < 23 ? "maintenance" : "good") as
      "maintenance" | "good",
    active: true,
    employeeId: i < 20 ? employees[40 + i].id : "",
    assignedDepartmentId: "",
    reservedFor: "",
  }));
  const state: State = {
    schemaVersion: 2,
    revision: 0,
    sequence: 100,
    departments,
    employees,
    accounts,
    skus,
    lots,
    movements,
    uniforms: [],
    issuances: [
      {
        id: "DEMO-CP-001",
        requestId: "DEMO-YC-HISTORY",
        employeeId: employees[30].id,
        departmentId: "NOI",
        skuId: "SKU-1-1",
        lotId: "LOT-HISTORY",
        quantity: 2,
        price: 260000,
        date: "2026-03-15",
        returned: 0,
      },
    ],
    supplierProducts,
    // One unmapped SKU supports the guided human-confirmation scenario.
    // Existing saved data is never rewritten to remove a mapping.
    mappings: skus
      .filter((s) => s.id !== "SKU-2-2")
      .map((s) => ({
        skuId: s.id,
        productId: `SP-A-${s.id}`,
        confirmedBy: "buyer",
        reason: "Đối chiếu mã, cỡ và Cotton 65% trong danh mục demo",
      })),
    purchases: [],
    orders: [],
    receipts: [],
    documents,
    lockers,
    lockerEvents: lockers
      .filter((l) => l.employeeId)
      .map((l, i) => ({
        id: `LE-SEED-${i}`,
        lockerId: l.id,
        date: "2026-09-01",
        actorId: "hc",
        action: "Phân bổ demo",
        from: "",
        to: l.employeeId,
        reason: "Bàn giao đầu kỳ tổng hợp",
      })),
    audits: [
      {
        id: "AUD-SEED",
        date: "2026-11-10",
        actorId: "system",
        module: "Hệ thống",
        entityId: "DEMO-SEED",
        action: "Khởi tạo bộ dữ liệu demo",
        detail: "120 nhân viên tổng hợp • Không có dữ liệu bệnh viện thật",
      },
    ],
    readNotifications: {},
    operations: [],
    settings: {
      date: "2026-11-10",
      annualLimit: 3,
      reserveRatio: 0.4,
      reserveSets: 1,
      sapFailure: false,
      uniformStages: ["head", "admin"],
      purchaseStages: ["admin", "finance", "leader"],
    },
  };
  state.uniforms.push({
    id: "DEMO-YC-HISTORY",
    departmentId: "NOI",
    warehouse: "TT",
    requesterId: "coord",
    date: "2026-03-15",
    year: 2026,
    limit: 3,
    status: "issued",
    lines: [{ employeeId: employees[30].id, skuId: "SKU-1-1", quantity: 2 }],
    decisions: [
      {
        actorId: "head",
        role: "head",
        approved: true,
        reason: "Nhu cầu đầu năm",
        date: "2026-03-14",
      },
      {
        actorId: "hc",
        role: "admin",
        approved: true,
        reason: "Đã đủ điều kiện",
        date: "2026-03-15",
      },
    ],
    stages: ["head", "admin"],
    reservations: [
      {
        lotId: "LOT-HISTORY",
        skuId: "SKU-1-1",
        quantity: 2,
        price: 260000,
        employeeId: employees[30].id,
      },
    ],
    exceptionReason: "",
    note: "Lịch sử cấp phát đầu năm, dữ liệu tổng hợp",
  });
  state.uniforms.push({
    id: "DEMO-YC-001",
    departmentId: "NOI",
    warehouse: "TT",
    requesterId: "coord",
    date: "2026-11-05",
    year: 2026,
    limit: 3,
    status: "reserved",
    lines: [{ employeeId: employees[31].id, skuId: "SKU-1-1", quantity: 2 }],
    decisions: [
      {
        actorId: "head",
        role: "head",
        approved: true,
        reason: "Đúng nhu cầu khoa",
        date: "2026-11-06",
      },
      {
        actorId: "hc",
        role: "admin",
        approved: true,
        reason: "Đã kiểm tra tồn khả dụng",
        date: "2026-11-06",
      },
    ],
    stages: ["head", "admin"],
    reservations: [
      {
        lotId: lots.find((l) => l.skuId === "SKU-1-1")!.id,
        skuId: "SKU-1-1",
        quantity: 2,
        price: 300000,
        employeeId: employees[31].id,
      },
    ],
    exceptionReason: "",
    note: "Yêu cầu đã giữ để minh họa bàn giao",
  });
  state.uniforms.push({
    id: "DEMO-YC-002",
    departmentId: "NOI",
    warehouse: "TT",
    requesterId: "coord",
    date: "2026-11-08",
    year: 2026,
    limit: 3,
    status: "waiting_stock",
    lines: [{ employeeId: employees[32].id, skuId: "SKU-0-3", quantity: 2 }],
    decisions: [],
    stages: ["head", "admin"],
    reservations: [],
    exceptionReason: "",
    note: "Thiếu bộ bác sĩ XL; có thể lập đề nghị mua bổ sung",
  });
  let enriched = state;
  const apply = (actor: string, command: Command, key: string) => {
    enriched = execute(enriched, actor, command, "seed-" + key);
  };
  enriched.settings.date = "2026-10-15";
  apply(
    "coord-KKB",
    {
      type: "uniform.create",
      departmentId: "KKB",
      lines: [
        { employeeId: "DEMO-NV-004", skuId: "SKU-BS-M-XXL", quantity: 3 },
      ],
      exceptionReason: "",
      note: "Hồ sơ đạt định mức, hoàn toàn tổng hợp",
    },
    "limit-create",
  );
  const limitId = enriched.uniforms.at(-1)!.id;
  apply("coord-KKB", { type: "uniform.submit", id: limitId }, "limit-submit");
  for (const actor of ["head-KKB", "hc"])
    apply(
      actor,
      {
        type: "approve",
        entity: "uniform",
        id: limitId,
        approved: true,
        reason: "Kiểm tra dữ liệu demo",
      },
      "limit-" + actor,
    );
  apply("warehouse", { type: "uniform.issue", id: limitId }, "limit-issue");
  const context = {
    budgetName: "Ngân sách trang phục demo",
    budgetCode: "DEMO-NS-HC-26",
    budgetDepartmentId: "HC",
    purchaseMonth: "2026-10",
  };
  apply(
    "buyer",
    {
      type: "purchase.create",
      lines: [
        {
          skuId: "SKU-HC-M-40",
          quantity: 2,
          purpose: "reserve",
          sourceRequestId: "",
          productId: "SP-A-SKU-HC-M-40",
          price: 292000,
        },
      ],
      note: "Giao dịch mua hoàn tất tổng hợp",
      context,
    },
    "done-create",
  );
  const doneId = enriched.purchases.at(-1)!.id;
  apply("buyer", { type: "purchase.submit", id: doneId }, "done-submit");
  for (const actor of ["hc", "finance", "leader"])
    apply(
      actor,
      {
        type: "approve",
        entity: "purchase",
        id: doneId,
        approved: true,
        reason: "Đã đối chiếu demo",
      },
      "done-" + actor,
    );
  apply("buyer", { type: "purchase.order", id: doneId }, "done-order");
  apply(
    "warehouse",
    {
      type: "receipt",
      id: enriched.orders.at(-1)!.id,
      quantities: { "SKU-HC-M-40": 2 },
    },
    "done-receipt",
  );
  enriched.settings.date = "2026-11-10";
  apply(
    "buyer",
    {
      type: "purchase.create",
      lines: [
        {
          skuId: "SKU-DD-F-XS",
          quantity: 1,
          purpose: "reserve",
          sourceRequestId: "",
          productId: "SP-A-SKU-DD-F-XS",
          price: 318000,
        },
      ],
      note: "Đề nghị chờ duyệt tổng hợp",
      context: { ...context, purchaseMonth: "2026-11" },
    },
    "pending-create",
  );
  apply(
    "buyer",
    { type: "purchase.submit", id: enriched.purchases.at(-1)!.id },
    "pending-submit",
  );
  return enriched;
}
