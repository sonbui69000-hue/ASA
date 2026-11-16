import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute, type Command } from "./commands";
import { availableLockers, lockerStatus } from "./selectors";
import type { State } from "./types";
const run = (s: State, c: Command, actor = "hc") =>
  execute(s, actor, c, `${c.type}-${s.revision}`);
describe("Phân bổ và giao nhận tủ", () => {
  it("seed đúng 37 trống, loại bảo trì/đang dùng, thứ tự ổn định", () => {
    const s = createSeed();
    expect(availableLockers(s)).toHaveLength(37);
    expect(availableLockers(s)).toEqual(availableLockers(s));
    expect(
      availableLockers(s).every((l) => l.condition === "good" && !l.employeeId),
    ).toBe(true);
  });
  it("phân bổ nhiều tủ cùng giao dịch, ngăn giao trùng người/tủ", () => {
    let s = createSeed();
    const ids = availableLockers(s)
      .slice(0, 2)
      .map((l) => l.id);
    s = run(s, {
      type: "locker.allocate",
      ids,
      employeeIds: ["DEMO-NV-001", "DEMO-NV-002"],
      departmentId: "",
      reason: "Cấp theo nhu cầu khoa",
      reserve: false,
    });
    expect(availableLockers(s)).toHaveLength(35);
    expect(() =>
      run(s, {
        type: "locker.allocate",
        ids: [ids[0]],
        employeeIds: ["DEMO-NV-003"],
        departmentId: "",
        reason: "Thử giao tủ trùng",
        reserve: false,
      }),
    ).toThrow();
    expect(() =>
      run(s, {
        type: "locker.allocate",
        ids: [availableLockers(s)[0].id],
        employeeIds: ["DEMO-NV-001"],
        departmentId: "",
        reason: "Thử giao người trùng",
        reserve: false,
      }),
    ).toThrow("đã có tủ");
  });
  it("giữ chỗ, nhận giữ chỗ, chuyển và trả giữ ownership/lịch sử", () => {
    let s = createSeed();
    const l = availableLockers(s)[0],
      owner = l.departmentId;
    s = run(s, {
      type: "locker.allocate",
      ids: [l.id],
      employeeIds: ["DEMO-NV-001"],
      departmentId: "",
      reason: "Giữ chỗ theo yêu cầu",
      reserve: true,
    });
    expect(lockerStatus(s.lockers.find((x) => x.id === l.id)!)).toBe("held");
    s = run(s, {
      type: "locker.transfer",
      id: l.id,
      employeeId: "DEMO-NV-001",
      reason: "Nhận tủ đã giữ",
    });
    s = run(s, {
      type: "locker.transfer",
      id: l.id,
      employeeId: "DEMO-NV-002",
      reason: "Chuyển người sử dụng",
    });
    s = run(s, {
      type: "locker.release",
      id: l.id,
      reason: "Thu hồi khi hết nhu cầu",
    });
    expect(lockerStatus(s.lockers.find((x) => x.id === l.id)!)).toBe(
      "available",
    );
    expect(s.lockers.find((x) => x.id === l.id)?.departmentId).toBe(owner);
    expect(s.lockerEvents.filter((e) => e.lockerId === l.id)).toHaveLength(4);
  });
  it("ngăn nghiệp vụ trái quyền và ngừng tủ còn người; kiểm tra lại preview", () => {
    const s = createSeed(),
      l = availableLockers(s)[0];
    expect(() =>
      run(
        s,
        {
          type: "locker.allocate",
          ids: [l.id],
          employeeIds: ["DEMO-NV-001"],
          departmentId: "",
          reason: "Thử cấp trái vai trò",
          reserve: false,
        },
        "employee",
      ),
    ).toThrow("quyền");
    expect(() =>
      run(s, { type: "locker.save", ...s.lockers[0], active: false }),
    ).toThrow("trả/thu hồi");
    const command: Command = {
      type: "locker.allocate",
      ids: [l.id],
      employeeIds: ["DEMO-NV-001"],
      departmentId: "",
      reason: "Giao tủ demo hợp lệ",
      reserve: false,
    };
    const changed = run(s, command);
    expect(() =>
      run(changed, { ...command, employeeIds: ["DEMO-NV-003"] }),
    ).toThrow();
  });
  it("giao đơn vị, mã trùng bị chặn; không tự trả tủ khi đổi bảo trì", () => {
    let s = createSeed();
    const l = availableLockers(s)[0];
    s = run(s, {
      type: "locker.allocate",
      ids: [l.id],
      employeeIds: [],
      departmentId: "NOI",
      reason: "Giao tủ cho khoa Nội",
      reserve: false,
    });
    s = run(s, {
      type: "locker.save",
      ...s.lockers.find((x) => x.id === l.id)!,
      condition: "maintenance",
    });
    expect(s.lockers.find((x) => x.id === l.id)?.assignedDepartmentId).toBe(
      "NOI",
    );
    expect(() => run(s, { type: "locker.save", ...l, id: undefined })).toThrow(
      "đã tồn tại",
    );
  });
});
