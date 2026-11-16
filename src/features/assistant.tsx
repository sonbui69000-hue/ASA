import { RemoteStore, ClientError } from "../online/client";
import type { AssistantReply } from "../online/protocol";
import { useState, useRef, useEffect, useMemo, useId } from "react";
import { Link, useLocation } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Bot,
  Send,
  ArrowUpRight,
  Trash2,
  Database,
  X,
  Maximize2,
  Minimize2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useDemo } from "../app/context";
import { Button, Badge } from "../components/shared";
import {
  answerQuery,
  type Answer,
  type ConversationContext,
  type AnswerStatus,
} from "../domain/assistant";
import {
  contextLabel,
  moduleFor,
  topicLabels,
} from "../domain/assistant-presentation";

interface Turn {
  id?: string;
  question: string;
  recordId?: string;
  replyTo?: string;
  newTopic?: boolean;
  interrupted?: "cancelled" | "stale";
}
const suggestions = [
  "Định mức đồng phục mỗi năm?",
  "Tồn kho DP-DD-M",
  "Có bao nhiêu tủ trống ở tầng 3?",
  "DEMO-YC-002 đang chờ ai?",
];
const moduleSuggestions = {
  uniforms: [
    "Áo blouse nữ cỡ L còn bao nhiêu?",
    "Tồn kho DP-DD-M",
    "Định mức đồng phục mỗi năm?",
    "Tôi còn được cấp đồng phục không?",
  ],
  purchases: [
    "Có đơn mua nào đang chờ phê duyệt?",
    "Đơn nào liên quan đến đồng phục?",
    "Tìm quy trình nhận hàng.",
    "Tồn kho DP-DD-M",
  ],
  lockers: [
    "Còn tủ nào trống ở tầng 3?",
    "Tủ đồ của tôi ở đâu?",
    "Quy định hoàn trả tủ đồ là gì?",
    "Tìm tủ trống ở tầng 2",
  ],
  documents: [
    "Quy định cấp phát bổ sung đồng phục là gì?",
    "Tìm quy định phân bổ tủ đồ.",
    "Quy trình đề nghị và nhận hàng là gì?",
    "Tìm quy định hành chính nội bộ.",
  ],
};
const stateLabels: Record<AnswerStatus, string> = {
  answered: "Đã đối chiếu",
  missing: "Cần bổ sung",
  ambiguous: "Cần chọn mã",
  empty: "Chưa đủ dữ liệu",
  unavailable: "Không khả dụng",
  unsupported: "Chưa hỗ trợ",
  error: "Lỗi tra cứu",
  confirmation: "Cần kiểm tra và xác nhận",
};
function sessionValue(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function loadHistory(key: string): Turn[] {
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (t): t is Turn =>
              t &&
              typeof t.question === "string" &&
              t.question.length <= 500 &&
              (t.recordId === undefined || typeof t.recordId === "string"),
          )
          .map((t) => ({
            id:
              typeof t.id === "string" && t.id.length <= 128
                ? t.id
                : crypto.randomUUID(),
            question: t.question,
            recordId: t.recordId?.slice(0, 128),
            replyTo:
              typeof t.replyTo === "string" && t.replyTo.length <= 128
                ? t.replyTo
                : undefined,
            newTopic: t.newTopic === true,
            interrupted:
              t.interrupted === "cancelled"
                ? ("cancelled" as const)
                : undefined,
          }))
          .slice(-30)
      : [];
  } catch {
    return [];
  }
}
export function Assistant() {
  const { state: s, actor, store, notify } = useDemo(),
    location = useLocation();
  const online = store instanceof RemoteStore;
  const controller = useRef<AbortController | null>(null);
  const workspace = useRef(s.readModel?.ref.workspaceId);
  const pendingTurn = useRef<Turn | null>(null);
  const [remoteReplies, setRemoteReplies] = useState<
    Record<string, AssistantReply>
  >({});
  const [nextTopic, setNextTopic] = useState(
      () => sessionValue(`asa-demo-chat:v1:${actor.id}:newTopic`) === "true",
    ),
    [clearing, setClearing] = useState(false),
    [clearError, setClearError] = useState("");
  const [welcomeTopic, setWelcomeTopic] = useState<
    keyof typeof moduleSuggestions | undefined
  >(() =>
    location.pathname.startsWith("/dong-phuc")
      ? "uniforms"
      : location.pathname.startsWith("/mua-sam")
        ? "purchases"
        : location.pathname.startsWith("/tu-do")
          ? "lockers"
          : location.pathname.startsWith("/tai-lieu")
            ? "documents"
            : undefined,
  );
  const stickToBottom = useRef(true),
    [newMessages, setNewMessages] = useState(false);
  const historyKey = `asa-demo-chat:v1:${actor.id}`;
  const [open, setOpen] = useState(false),
    [expanded, setExpanded] = useState(false),
    [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() =>
    online &&
    sessionValue(historyKey + ":workspace") !== s.readModel?.ref.workspaceId
      ? []
      : loadHistory(historyKey),
  );
  const [pending, setPending] = useState<Turn | null>(null),
    [retry, setRetry] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    log = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null);
  const dialogId = useId();
  useEffect(() => {
    try {
      sessionStorage.setItem(historyKey, JSON.stringify(turns));
      sessionStorage.setItem(historyKey + ":newTopic", String(nextTopic));
      if (online)
        sessionStorage.setItem(
          historyKey + ":workspace",
          s.readModel!.ref.workspaceId,
        );
    } catch {
      /* In-memory history remains usable. */
    }
  }, [turns, historyKey, nextTopic]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (online && workspace.current !== s.readModel?.ref.workspaceId) {
      workspace.current = s.readModel?.ref.workspaceId;
      controller.current?.abort();
      controller.current = null;
      pendingTurn.current = null;
      setPending(null);
      setRemoteReplies({});
      setTurns([]);
      setNextTopic(true);
    }
  }, [online, s.readModel?.ref.workspaceId]);
  // Re-run against current data and permissions; never cache private answer excerpts.
  const answers = useMemo(() => {
    if (online)
      return turns.map((turn): Answer => {
        const reply = remoteReplies[turn.id || ""];
        if (
          reply &&
          reply.stateRef.workspaceId === s.readModel?.ref.workspaceId &&
          reply.stateRef.revision === s.revision
        )
          return reply.answer;
        return {
          intent: "UNSUPPORTED",
          parameters: {},
          status: "error",
          text:
            turn.interrupted === "cancelled"
              ? "Đã hủy tra cứu. Câu hỏi được giữ lại; bạn có thể thử lại khi sẵn sàng."
              : "Dữ liệu hoặc phiên đã thay đổi. Chọn tra cứu lại để đối chiếu nguồn hiện tại.",
          evidence: [],
          suggestions: [],
        };
      });
    let context: ConversationContext | undefined;
    return turns.map((turn): Answer => {
      if (turn.newTopic) context = undefined;
      if (turn.interrupted === "cancelled")
        return {
          intent: "UNSUPPORTED",
          parameters: {},
          status: "error",
          text: "Đã hủy tra cứu. Bạn có thể thử lại khi sẵn sàng.",
          evidence: [],
          suggestions: [],
        };
      try {
        const answer = answerQuery(
          s,
          actor,
          turn.question,
          context,
          turn.recordId,
        );
        context = answer.status === "unsupported" ? undefined : answer;
        return answer;
      } catch {
        context = undefined;
        return {
          intent: "UNSUPPORTED",
          parameters: {},
          status: "error",
          text: "Không thể đối chiếu dữ liệu lúc này. Hãy thử lại; chưa có thao tác nghiệp vụ nào được thực hiện.",
          evidence: [],
          suggestions: [],
        };
      }
    });
  }, [s, actor, turns, retry, online, remoteReplies]);
  useEffect(() => {
    if (online && controller.current) {
      controller.current.abort();
      controller.current = null;
      const interrupted = pendingTurn.current;
      pendingTurn.current = null;
      if (interrupted)
        setTurns((old) =>
          [
            ...old.filter((t) => t.id !== interrupted.id),
            { ...interrupted, interrupted: "stale" as const },
          ].slice(-30),
        );
      setPending(null);
    }
  }, [s.revision, s.readModel?.ref.workspaceId, actor.id, online]);
  useEffect(() => {
    if (log.current && stickToBottom.current)
      log.current.scrollTop = log.current.scrollHeight;
    else if (open) setNewMessages(true);
  }, [turns, pending, open, answers]);
  function send(text = query, retryTurn?: Turn) {
    const question = text.trim();
    if (
      !question ||
      pending ||
      pendingTurn.current ||
      clearing ||
      question.length > 500
    )
      return;
    const last = turns.at(-1),
      parent = retryTurn
        ? retryTurn.replyTo
        : nextTopic
          ? undefined
          : remoteReplies[last?.id || ""]?.contextId ||
            (last?.interrupted ||
            remoteReplies[last?.id || ""]?.reason === "NETWORK"
              ? last?.replyTo
              : last?.id);
    const turn = {
      id: retryTurn?.id || crypto.randomUUID(),
      question,
      replyTo: parent,
      newTopic: retryTurn?.newTopic || nextTopic,
      recordId:
        retryTurn?.recordId ||
        location.pathname
          .match(/DEMO-(?:SAP-PO|YC|PR|PO|TL|TU)-[\w-]+/i)?.[0]
          .toUpperCase(),
    };
    setPending(turn);
    pendingTurn.current = turn;
    stickToBottom.current = true;
    setNewMessages(false);
    setNextTopic(false);
    setQuery("");
    if (store instanceof RemoteStore) {
      const current = new AbortController();
      controller.current = current;
      pendingTurn.current = turn;
      void store
        .query(question, turn.recordId, current.signal, {
          requestId: turn.id,
          replyTo: turn.newTopic ? undefined : turn.replyTo,
          resetContext: turn.newTopic,
        })
        .then((reply) => {
          if (current.signal.aborted) return;
          setClearError("");
          setRemoteReplies((old) => ({ ...old, [turn.id]: reply }));
          setTurns((old) =>
            old.some((t) => t.id === turn.id)
              ? old.map((t) => (t.id === turn.id ? turn : t))
              : [...old, turn].slice(-30),
          );
        })
        .catch((error) => {
          if (current.signal.aborted) return;
          setRemoteReplies((old) => ({
            ...old,
            [turn.id]: {
              answer: {
                intent: "UNSUPPORTED",
                parameters: {},
                status: "error",
                text:
                  error instanceof Error
                    ? error.message
                    : "Không kết nối được máy chủ để đối chiếu.",
                evidence: [],
                suggestions: [],
              },
              mode: "deterministic",
              reason: "NETWORK",
              retrievalMode: "keyword",
              stateRef: s.readModel!.ref,
              usage: {
                promptTokens: 0,
                completionTokens: 0,
                cost: null,
                calls: 0,
              },
            },
          }));
          setTurns((old) =>
            old.some((t) => t.id === turn.id)
              ? old.map((t) => (t.id === turn.id ? turn : t))
              : [...old, turn].slice(-30),
          );
          if (error instanceof ClientError && error.code === "STALE")
            void store.refresh().catch(() => {});
        })
        .finally(() => {
          if (controller.current === current) {
            setPending(null);
            pendingTurn.current = null;
            controller.current = null;
            input.current?.focus();
          }
        });
      return;
    }
    // Yield the main thread for loading feedback before reading the local services.
    timer.current = setTimeout(() => {
      setTurns((old) =>
        old.some((t) => t.id === turn.id)
          ? old.map((t) => (t.id === turn.id ? turn : t))
          : [...old, turn].slice(-30),
      );
      setPending(null);
      pendingTurn.current = null;
      input.current?.focus();
    }, 120);
  }
  function cancel() {
    controller.current?.abort();
    controller.current = null;
    if (timer.current) clearTimeout(timer.current);
    const turn = pendingTurn.current;
    pendingTurn.current = null;
    if (turn?.newTopic) setNextTopic(true);
    if (turn)
      setTurns((old) =>
        old.some((t) => t.id === turn.id)
          ? old.map((t) =>
              t.id === turn.id
                ? { ...turn, interrupted: "cancelled" as const }
                : t,
            )
          : [...old, { ...turn, interrupted: "cancelled" as const }].slice(-30),
      );
    setPending(null);
    input.current?.focus();
  }
  async function clear(keepHistory = false) {
    setClearing(true);
    setClearError("");
    setNextTopic(true);
    controller.current?.abort();
    controller.current = null;
    pendingTurn.current = null;
    if (!keepHistory) setRemoteReplies({});
    if (timer.current) clearTimeout(timer.current);
    setPending(null);
    if (!keepHistory) setTurns([]);
    setQuery("");
    input.current?.focus();
    if (store instanceof RemoteStore) {
      try {
        await store.clearConversation();
      } catch {
        setClearError(
          "Chưa xóa được bộ nhớ trên máy chủ. Lượt hỏi tiếp theo sẽ bắt đầu chủ đề mới.",
        );
        notify(
          "Chưa xóa được bộ nhớ hội thoại trên máy chủ. Thử lại khi kết nối sẵn sàng.",
          true,
        );
      }
    }
    setClearing(false);
  }
  const latest = answers.at(-1),
    activeContext =
      !nextTopic && latest && moduleFor(latest.intent) ? latest : undefined;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          className="assistant-trigger"
          aria-controls={dialogId}
          aria-expanded={open}
        >
          <Bot size={21} aria-hidden="true" />
          <span>Trợ lý demo</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          id={dialogId}
          className={`assistant-panel ${expanded ? "assistant-expanded" : ""}`}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
        >
          <div className="assistant-heading">
            <div>
              <Dialog.Title>Trợ lý tra cứu demo</Dialog.Title>
              <Dialog.Description>
                {s.readModel?.externalAiBlocked || s.workbookData
                  ? "Tra cứu cục bộ • OpenRouter bị chặn cho workspace này"
                  : online
                    ? "OpenRouter • Công cụ chỉ đọc • Dữ liệu tổng hợp"
                    : "AI mô phỏng • Tra cứu dữ liệu theo quyền hiện tại"}
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="assistant-resize"
              aria-label={
                expanded ? "Thu gọn bảng trò chuyện" : "Mở rộng bảng trò chuyện"
              }
              aria-pressed={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </Button>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Đóng trợ lý">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="assistant-topline">
            <Badge>
              <Database size={13} aria-hidden="true" />{" "}
              {s.workbookData || s.readModel?.externalAiBlocked
                ? "Dữ liệu cục bộ"
                : "Dữ liệu mô phỏng"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              disabled={clearing || (!turns.length && !pending && !clearError)}
              onClick={() => void clear()}
            >
              <Trash2 size={14} aria-hidden="true" />
              Xóa hội thoại
            </Button>
          </div>
          <div className="assistant-context" aria-label="Ngữ cảnh hội thoại">
            <span>
              {activeContext
                ? contextLabel(activeContext)
                : "Chủ đề mới • Hãy nêu thông tin cần tra cứu"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={
                clearing || !!pending || (!activeContext && !turns.length)
              }
              onClick={() => void clear(true)}
            >
              Chủ đề mới
            </Button>
          </div>
          {clearError && (
            <p role="alert" className="assistant-notice">
              {clearError}{" "}
              <button type="button" onClick={() => void clear()}>
                Thử xóa lại
              </button>
            </p>
          )}
          <div
            className="assistant-conversation"
            role="log"
            aria-label="Hội thoại với trợ lý"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={!!pending}
            ref={log}
            onScroll={() => {
              const el = log.current;
              if (el) {
                stickToBottom.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                if (stickToBottom.current) setNewMessages(false);
              }
            }}
          >
            {!turns.length && !pending && (
              <div className="assistant-welcome">
                <span>
                  <Bot size={31} aria-hidden="true" />
                </span>
                <h3>Tôi có thể hỗ trợ tra cứu gì?</h3>
                <p>
                  Hỏi bằng tiếng Việt hoặc chọn gợi ý. Kết quả có nguồn để đối
                  chiếu. Khi cần thay đổi dữ liệu, mở biểu mẫu và xác nhận. Hội
                  thoại được giữ trong phiên trình duyệt theo từng tài khoản.
                </p>
                <nav className="assistant-topics" aria-label="Chủ đề gợi ý">
                  {Object.entries(topicLabels).map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      aria-pressed={welcomeTopic === key}
                      onClick={() =>
                        setWelcomeTopic(key as keyof typeof moduleSuggestions)
                      }
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                <div>
                  {(welcomeTopic
                    ? moduleSuggestions[welcomeTopic]
                    : suggestions
                  ).map((q) => (
                    <button type="button" key={q} onClick={() => send(q)}>
                      {q}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((turn, index) => {
              const answer = answers[index];
              const reply = remoteReplies[turn.id || ""];
              const currentReply =
                reply &&
                reply.stateRef.workspaceId === s.readModel?.ref.workspaceId &&
                reply.stateRef.revision === s.revision &&
                !turn.interrupted
                  ? reply
                  : undefined;
              return (
                <article
                  className="chat-turn"
                  key={turn.id || index}
                  aria-label={`Lượt hỏi ${index + 1}`}
                >
                  {turn.newTopic && (
                    <small className="chat-topic-break">
                      Bắt đầu chủ đề mới
                    </small>
                  )}
                  <div className="chat-question">
                    <span className="chat-message-label">Bạn</span>
                    <span data-testid="chat-user-message">{turn.question}</span>
                  </div>
                  <div className="chat-answer">
                    <span className="chat-bot-icon">
                      <Bot size={17} aria-hidden="true" />
                    </span>
                    <div>
                      <span
                        className={`chat-state chat-state-${answer.status}`}
                      >
                        {turn.interrupted === "cancelled"
                          ? "Đã hủy"
                          : stateLabels[answer.status]}
                        {online && currentReply && (
                          <span>
                            {" "}
                            •{" "}
                            {remoteReplies[turn.id || ""].mode === "llm"
                              ? remoteReplies[turn.id || ""].generationMode ===
                                "grounded"
                                ? "Trả lời AI có nguồn"
                                : "AI chọn công cụ"
                              : currentReply.reason === "AI_LOCAL_ONLY"
                                ? "Tra cứu cục bộ"
                                : currentReply.reason &&
                                    currentReply.reason !== "CONTEXT_EXPIRED"
                                  ? "Tra cứu xác định (dự phòng)"
                                  : "Tra cứu theo quy tắc"}{" "}
                            •{" "}
                            {currentReply.generationMode === "tools"
                              ? "Dữ liệu nghiệp vụ"
                              : remoteReplies[turn.id || ""].retrievalMode ===
                                  "hybrid"
                                ? "Truy xuất kết hợp"
                                : "Tìm từ khóa"}
                            {remoteReplies[turn.id || ""].semanticStatus ===
                            "semantic_unavailable"
                              ? " • Ngữ nghĩa chưa khả dụng"
                              : ""}
                            {remoteReplies[turn.id || ""].reason &&
                            currentReply.reason !== "CONTEXT_EXPIRED"
                              ? currentReply.reason === "AI_LOCAL_ONLY"
                                ? " • API AI bị chặn"
                                : " • AI tạm không khả dụng"
                              : ""}
                          </span>
                        )}
                      </span>
                      <p className="chat-answer-text">{answer.text}</p>
                      {currentReply?.reason && (
                        <p className="chat-fallback-note">
                          {currentReply.reason === "AI_LOCAL_ONLY"
                            ? "Workspace có dữ liệu nguồn cục bộ. Không gửi câu hỏi hoặc dữ liệu tới OpenRouter."
                            : currentReply.reason === "CONTEXT_EXPIRED"
                              ? "Ngữ cảnh trước không còn trong phiên này. Hãy nêu lại mã hoặc chọn chủ đề mới."
                              : currentReply.reason === "NETWORK"
                                ? "Chưa kết nối được máy chủ. Thử lại khi kết nối sẵn sàng."
                                : "Dịch vụ AI chưa sẵn sàng hoặc câu trả lời chưa đủ căn cứ. Các nguồn bên dưới được đối chiếu bằng quy tắc."}
                        </p>
                      )}
                      {answer.clarification && index === turns.length - 1 && (
                        <div
                          className="chat-clarification"
                          role="group"
                          aria-label="Chọn thông tin cần làm rõ"
                        >
                          <p>{answer.clarification.prompt}</p>
                          {answer.clarification.choices.map((choice) => (
                            <Button
                              key={choice.question}
                              variant="outline"
                              disabled={!!pending || clearing}
                              onClick={() => send(choice.question)}
                            >
                              {choice.label}
                            </Button>
                          ))}
                        </div>
                      )}
                      {answer.evidence.map((ev, j) => (
                        <Link
                          className="evidence"
                          key={`${ev.recordId}-${j}`}
                          to={ev.href}
                          onClick={() => setOpen(false)}
                        >
                          <small className="source-kind">
                            {ev.href.startsWith("/tai-lieu/")
                              ? "Trích đoạn tài liệu"
                              : answer.status === "confirmation"
                                ? "Mở quy trình để xác nhận"
                                : "Dữ liệu ứng dụng"}
                          </small>
                          <strong>
                            {j + 1}. {ev.title}
                            <ArrowUpRight size={13} aria-hidden="true" />
                          </strong>
                          <span>{ev.passage}</span>
                          {ev.chunkId && (
                            <small>
                              {ev.recordId} • v{ev.version} • {ev.sectionTitle}{" "}
                              • Đoạn đã đối chiếu
                            </small>
                          )}
                        </Link>
                      ))}
                      {answer.candidates && (
                        <p className="helper">
                          Mở nguồn đối sánh ở trên để kiểm tra thông số và xác
                          nhận bằng tài khoản Mua sắm.
                        </p>
                      )}
                      {answer.status === "error" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => send(turn.question, turn)}
                          disabled={!!pending || clearing}
                        >
                          <RefreshCw size={14} aria-hidden="true" />
                          Thử tra cứu lại
                        </Button>
                      )}
                      {index === turns.length - 1 &&
                        !!answer.suggestions.length &&
                        !answer.clarification && (
                          <div className="chat-suggestions">
                            {answer.suggestions.map((text) => (
                              <Button
                                variant="outline"
                                size="sm"
                                key={text}
                                disabled={!!pending}
                                onClick={() => send(text)}
                              >
                                {text}
                              </Button>
                            ))}
                          </div>
                        )}
                      {online && currentReply && (
                        <details className="assistant-details">
                          <summary>Chi tiết phản hồi</summary>
                          <small>
                            AI:{" "}
                            {remoteReplies[turn.id || ""].usage.promptTokens}{" "}
                            token vào /{" "}
                            {
                              remoteReplies[turn.id || ""].usage
                                .completionTokens
                            }{" "}
                            token ra • Chi phí:{" "}
                            {remoteReplies[turn.id || ""].usage.cost === null
                              ? "chưa xác định"
                              : remoteReplies[
                                  turn.id || ""
                                ].usage.cost!.toFixed(6) + " USD"}
                          </small>
                        </details>
                      )}
                      <small>
                        Dữ liệu demo hiện tại • Lần cập nhật {s.revision}
                      </small>
                    </div>
                  </div>
                </article>
              );
            })}
            {pending && (
              <div className="chat-turn">
                <div className="chat-question">{pending.question}</div>
                <p role="status" className="chat-loading">
                  <LoaderCircle size={16} aria-hidden="true" />
                  Đang đối chiếu dữ liệu demo…
                </p>
              </div>
            )}
          </div>
          {newMessages && (
            <Button
              className="assistant-new-messages"
              variant="outline"
              onClick={() => {
                stickToBottom.current = true;
                setNewMessages(false);
                if (log.current)
                  log.current.scrollTop = log.current.scrollHeight;
              }}
            >
              Xem tin mới
            </Button>
          )}
          {pending && (
            <Button variant="outline" onClick={cancel}>
              Hủy tra cứu
            </Button>
          )}
          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label htmlFor={`${dialogId}-input`}>Câu hỏi cho trợ lý</label>
            <div className="assistant-input">
              <textarea
                id={`${dialogId}-input`}
                ref={input}
                autoComplete="off"
                maxLength={500}
                rows={2}
                disabled={clearing}
                placeholder="Ví dụ: Tồn kho áo blouse size M"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby={`${dialogId}-hint`}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <Button
                type="submit"
                aria-label="Gửi câu hỏi"
                disabled={clearing || !!pending || !query.trim()}
              >
                <Send size={18} aria-hidden="true" />
              </Button>
            </div>
            <small id={`${dialogId}-hint`}>
              Enter để gửi • Shift+Enter xuống dòng • {query.length}/500 ký tự.{" "}
              {s.workbookData || s.readModel?.externalAiBlocked
                ? "Chỉ tra cứu cục bộ; OpenRouter bị chặn. Dòng Excel giữ thông tin nguồn, chưa thay cho xác nhận nghiệp vụ hiện hành."
                : online
                  ? "Giữ câu hỏi trong phiên; câu trả lời cũ được ẩn khi dữ liệu đổi. AI chỉ đọc nguồn trên máy chủ; không tự phê duyệt hoặc ghi giao dịch. SAP mô phỏng."
                  : "Giữ 30 lượt gần nhất trong phiên. Không kết nối LLM hay SAP thật. Kết quả tự đối chiếu lại khi dữ liệu thay đổi. Chỉ sử dụng dữ liệu tổng hợp."}
            </small>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
