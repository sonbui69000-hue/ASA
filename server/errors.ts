export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 400,
    message = "Không thể thực hiện yêu cầu.",
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export const unavailable = () =>
  new ApiError("UNAVAILABLE", 404, "Không có bản ghi trong phạm vi được phép.");
export function safeError(error: unknown) {
  return error instanceof ApiError
    ? error
    : new ApiError("INTERNAL", 500, "Dịch vụ chưa khả dụng. Vui lòng thử lại.");
}
