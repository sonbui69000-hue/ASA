import { createSeed } from "../../src/data/seed";
import { account } from "../../src/domain/selectors";
import { DocumentIndex } from "./retrieval";
import { verifyCitation } from "./chunks";

// Ground truth is frozen against the synthetic seed, not tuned to an imported workspace.
export const evaluationQuestions = [
  [
    "Thông tin nào phải ghi khi gửi yêu cầu hành chính?",
    "hc",
    "DEMO-TL-001",
    "muc-1",
  ],
  [
    "Ai kiểm tra nhu cầu trước khi Hành chính xử lý?",
    "hc",
    "DEMO-TL-001",
    "muc-2",
  ],
  ["Yêu cầu bị từ chối cần ghi gì?", "hc", "DEMO-TL-001", "muc-2"],
  [
    "Xác nhận đã đọc bản cũ có thay cho bản mới không?",
    "hc",
    "DEMO-TL-001",
    "muc-3",
  ],
  ["Cỡ 2XL được chuẩn hóa thế nào?", "hc", "DEMO-TL-002", "muc-1"],
  [
    "Nhân viên ngừng hoạt động có được đề nghị đồng phục không?",
    "hc",
    "DEMO-TL-002",
    "muc-1",
  ],
  [
    "Mỗi năm một nhân viên được bao nhiêu bộ trang phục?",
    "hc",
    "DEMO-TL-002",
    "muc-2",
  ],
  [
    "Nhân viên cần làm gì khi muốn xin cấp lại đồng phục vượt định mức?",
    "hc",
    "DEMO-TL-002",
    "muc-2",
  ],
  [
    "Đang cam kết có tính vào định mức hằng năm không?",
    "hc",
    "DEMO-TL-002",
    "muc-2",
  ],
  [
    "Thủ kho bàn giao thì tồn vật lý thay đổi lúc nào?",
    "hc",
    "DEMO-TL-002",
    "muc-3",
  ],
  [
    "Hủy trước bàn giao có giải phóng hàng giữ không?",
    "hc",
    "DEMO-TL-002",
    "muc-3",
  ],
  [
    "Đổi giá danh mục có đổi giá cấp phát lịch sử không?",
    "hc",
    "DEMO-TL-002",
    "muc-3",
  ],
  [
    "Mua dự trữ giới hạn theo quân số như thế nào?",
    "hc",
    "DEMO-TL-002",
    "muc-4",
  ],
  [
    "Một đề nghị mua có được dùng hai nhà cung cấp không?",
    "buyer",
    "DEMO-TL-003",
    "muc-1",
  ],
  [
    "Phần thiếu đã cam kết mua có được mua trùng không?",
    "buyer",
    "DEMO-TL-003",
    "muc-1",
  ],
  ["Những bộ phận nào duyệt đề nghị mua?", "buyer", "DEMO-TL-003", "muc-2"],
  [
    "Người gửi có được tự duyệt đề nghị của mình không?",
    "buyer",
    "DEMO-TL-003",
    "muc-2",
  ],
  [
    "Tạo PO đã làm tăng số lượng trong kho chưa?",
    "buyer",
    "DEMO-TL-003",
    "muc-3",
  ],
  [
    "Có thể nhận hàng nhiều lần nhưng vượt lượng đặt không?",
    "buyer",
    "DEMO-TL-003",
    "muc-3",
  ],
  [
    "Mã hàng và chất liệu điều dưỡng cỡ M trong hợp đồng là gì?",
    "buyer",
    "DEMO-TL-004",
    "muc-2",
  ],
  [
    "Hợp đồng cho giao hàng sau bao nhiêu ngày làm việc?",
    "buyer",
    "DEMO-TL-004",
    "muc-2",
  ],
  [
    "Sai cỡ hoặc thiếu hàng phải xác nhận nhận hàng thế nào?",
    "buyer",
    "DEMO-TL-004",
    "muc-3",
  ],
  [
    "Một nhân viên có được dùng hai tủ đồ cùng lúc không?",
    "hc",
    "DEMO-TL-005",
    "muc-1",
  ],
  [
    "Không đủ tủ có được tự phân bổ một phần không?",
    "hc",
    "DEMO-TL-005",
    "muc-2",
  ],
  [
    "Chuyển giao tủ phải ghi những ai và lý do gì?",
    "hc",
    "DEMO-TL-005",
    "muc-2",
  ],
  [
    "Tủ đang bảo trì có coi là tủ trống để cấp không?",
    "hc",
    "DEMO-TL-005",
    "muc-3",
  ],
] as const;
export const paraphraseQuestions = [
  [
    "Muốn xin thêm trang phục sau khi đã nhận đủ suất thì nhờ ai chấp thuận?",
    "hc",
    "DEMO-TL-002",
    "muc-2",
  ],
  [
    "Đặt mua xong nhưng chưa có hàng về thì số dư kho có đổi ngay?",
    "buyer",
    "DEMO-TL-003",
    "muc-3",
  ],
  [
    "Nếu không đủ chỗ giữ tư trang thì hệ thống có tự chia bớt suất còn lại?",
    "hc",
    "DEMO-TL-005",
    "muc-2",
  ],
  ["Cần báo gì lúc đổi người giữ ngăn cá nhân?", "hc", "DEMO-TL-005", "muc-2"],
] as const;
export const negativeQuestions = [
  ["DEMO-TL-004", "employee", "restricted"],
  ["DEMO-TL-006", "docs", "draft"],
  ["DEMO-TL-007", "hc", "withdrawn"],
  ["DEMO-TL-008", "hc", "expired"],
  ["DEMO-TL-999", "buyer", "not-found"],
] as const;
export async function evaluateRetrieval(index: DocumentIndex) {
  const state = createSeed(),
    ref = { workspaceId: "synthetic-rag-evaluation", revision: state.revision };
  const rows = [];
  for (const [question, actorId, documentId, sectionId] of [
    ...evaluationQuestions,
    ...paraphraseQuestions,
  ]) {
    const result = await index.search(
      state,
      account(state, actorId),
      ref,
      question,
      { limit: 3 },
    );
    const rank =
      result.passages.findIndex(
        (e) => e.recordId === documentId && e.sectionId === sectionId,
      ) + 1;
    rows.push({
      question,
      subset: paraphraseQuestions.some((q) => q[0] === question)
        ? "paraphrase"
        : "standard",
      actorId,
      expected: {
        documentId,
        version: documentId === "DEMO-TL-002" ? 2 : 1,
        sectionId,
      },
      retrievalMode: result.retrievalMode,
      semanticStatus: result.semanticStatus,
      rank: rank || null,
      citationChecks: result.passages.map((e) =>
        verifyCitation(state, account(state, actorId), e, ref),
      ),
      actual: result.passages.map((e) => ({
        documentId: e.recordId,
        sectionId: e.sectionId,
        version: e.version,
      })),
    });
  }
  const hits = rows.filter((r) => r.rank !== null).length,
    checks = rows.flatMap((r) => r.citationChecks);
  const negatives = [];
  for (const [question, actorId, reason] of negativeQuestions) {
    const result = await index.search(
      state,
      account(state, actorId),
      ref,
      question,
      { limit: 3 },
    );
    negatives.push({
      question,
      actorId,
      reason,
      expectedSources: [],
      actualCount: result.passages.length,
      passed: result.passages.length === 0,
    });
  }
  return {
    evaluatedAt: new Date().toISOString(),
    dataset: "synthetic-seed-v2",
    questions: rows.length,
    retrieval: {
      mode: rows.every((r) => r.retrievalMode === "hybrid")
        ? "hybrid"
        : "keyword",
      recallAt3: hits / rows.length,
      mrrAt3:
        rows.reduce((sum, r) => sum + (r.rank ? 1 / r.rank : 0), 0) /
        rows.length,
    },
    paraphrases: {
      questions: paraphraseQuestions.length,
      recallAt3:
        rows.filter((r) => r.subset === "paraphrase" && r.rank !== null)
          .length / paraphraseQuestions.length,
    },
    citations: { checked: checks.length, valid: checks.filter(Boolean).length },
    semanticAccuracy: rows.every((r) => r.retrievalMode === "hybrid")
      ? "measured_in_retrieval_metrics"
      : "not_measured_local_encoder_unavailable",
    generationQuality: "not_measured_no_live_llm_calls",
    negativeCases: negatives,
    rows,
  };
}
