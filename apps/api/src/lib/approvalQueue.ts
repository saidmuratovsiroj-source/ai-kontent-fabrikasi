import crypto from "crypto";

export type ApprovalAction = "approve" | "edit" | "cancel";

type PendingApproval = {
  resolve: (action: ApprovalAction) => void;
  reject:  (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const queue = new Map<string, PendingApproval>();

export function createApproval(timeoutMs = 10 * 60 * 1000): {
  approvalId: string;
  promise:    Promise<ApprovalAction>;
} {
  const approvalId = crypto.randomUUID();

  const promise = new Promise<ApprovalAction>((resolve, reject) => {
    const timeout = setTimeout(() => {
      queue.delete(approvalId);
      reject(new Error("Tasdiqlash vaqti tugadi (10 daqiqa)"));
    }, timeoutMs);

    queue.set(approvalId, { resolve, reject, timeout });
  });

  return { approvalId, promise };
}

export function resolveApproval(approvalId: string, action: ApprovalAction): boolean {
  const pending = queue.get(approvalId);
  if (!pending) return false;

  clearTimeout(pending.timeout);
  queue.delete(approvalId);
  pending.resolve(action);
  return true;
}
