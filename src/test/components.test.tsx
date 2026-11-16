import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, DataTable, Field, Modal } from "../components/shared";
describe("Các thành phần dùng chung", () => {
  it("tìm kiếm, sắp xếp và phân trang dữ liệu thật", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        caption="Danh sách thử"
        pageSize={2}
        rows={[
          { id: "1", name: "Bản B" },
          { id: "2", name: "Bản A" },
          { id: "3", name: "Bản C" },
        ]}
        searchText={(r) => r.name}
        columns={[
          {
            key: "name",
            label: "Tên",
            sort: (r) => r.name,
            render: (r) => r.name,
          },
        ]}
      />,
    );
    expect(
      screen.queryByRole("cell", { name: "Bản C" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(screen.getByRole("cell", { name: "Bản C" })).toBeVisible();
    await user.type(screen.getByLabelText("Tìm trong Danh sách thử"), "ban a");
    expect(screen.getByRole("cell", { name: "Bản A" })).toBeVisible();
    expect(
      screen.queryByRole("cell", { name: "Bản C" }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Tìm trong Danh sách thử"));
    await user.click(screen.getByRole("button", { name: "Tên" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Bản A");
  });
  it("form có nhãn, lỗi tiếng Việt theo trường, Escape và lưu đúng một lần", async () => {
    const save = vi.fn(),
      user = userEvent.setup();
    function Form() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Mở biểu mẫu</Button>
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Mẫu xác nhận"
            onSubmit={save}
          >
            <Field label="Tên yêu cầu">
              <input required />
            </Field>
          </Modal>
        </>
      );
    }
    render(<Form />);
    await user.click(screen.getByRole("button", { name: "Mở biểu mẫu" }));
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(save).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Vui lòng nhập hoặc chọn tên yêu cầu."),
    ).toBeVisible();
    expect(screen.getByLabelText("Tên yêu cầu")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await user.type(screen.getByLabelText("Tên yêu cầu"), "Yêu cầu demo");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(save).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Mở biểu mẫu" }));
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
