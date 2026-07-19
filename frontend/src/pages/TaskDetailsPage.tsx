import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Bid, ContactStatus, Task, TaskUserRef } from "../types";
import { Spinner } from "../components/ui/EmptyState";
import { Avatar } from "../components/ui/Avatar";
import { BidCard } from "../components/tasks/BidCard";
import { ReviewModal } from "../components/tasks/ReviewModal";
import { Modal } from "../components/ui/Modal";
import { MapView } from "../components/map/MapView";

const STATUS_TEXT: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Awaiting Confirmation",
  DONE: "Done",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

const errBox =
  "rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3";

interface OpenDispute {
  id: number;
  reason: string;
  createdAt: string;
  raisedBy: TaskUserRef;
}

interface TaskDetailResponse {
  task: Task;
  isOwner: boolean;
  isHelper: boolean;
  isEligibleToBid: boolean;
  alreadyBid: boolean;
  canSubmit: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canDispute: boolean;
  canReview: boolean;
  hasReviewed: boolean;
  openDispute: OpenDispute | null;
}

export function TaskDetailsPage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<TaskDetailResponse | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [contact, setContact] = useState<ContactStatus | null>(null);
  const [sharingContact, setSharingContact] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await apiGet<TaskDetailResponse>(`/tasks/${id}`);
      setData(detail);
      if (detail.isOwner) {
        const { bids } = await apiGet<{ bids: Bid[] }>(`/tasks/${id}/bids`);
        setBids(bids);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const contactEligible = !!(
    data &&
    user &&
    ["IN_PROGRESS", "SUBMITTED", "DONE", "DISPUTED"].includes(data.task.status) &&
    (data.isOwner || user.id === data.task.helperId)
  );

  useEffect(() => {
    if (!contactEligible) {
      setContact(null);
      return;
    }
    let cancelled = false;
    apiGet<ContactStatus>(`/tasks/${id}/contact`)
      .then((status) => {
        if (!cancelled) setContact(status);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load contact info.");
      });
    return () => {
      cancelled = true;
    };
  }, [contactEligible, id]);

  async function handleShareContact() {
    setSharingContact(true);
    setError(null);
    try {
      const status = await apiPost<ContactStatus>(`/tasks/${id}/contact/share`, {});
      setContact(status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't share your contact info.");
    } finally {
      setSharingContact(false);
    }
  }

  async function handlePlaceBid(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) return setError("Enter a valid bid amount.");

    setSubmittingBid(true);
    try {
      await apiPost(`/tasks/${id}/bids`, { proposedAmount: amount });
      await load();
      setBidAmount("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't place your bid.");
    } finally {
      setSubmittingBid(false);
    }
  }

  async function handleAccept(bidId: number) {
    setAcceptingBidId(bidId);
    setError(null);
    try {
      await apiPatch(`/bids/${bidId}/accept`, {});
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't accept this bid.");
    } finally {
      setAcceptingBidId(null);
    }
  }

  async function runAction(fn: () => Promise<unknown>, fallbackMsg: string, thenReview = false) {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
      await Promise.all([load(), refreshUser()]);
      if (thenReview) setShowReview(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallbackMsg);
    } finally {
      setActionLoading(false);
    }
  }

  const handleSubmitWork = () => runAction(() => apiPatch(`/tasks/${id}/submit`, {}), "Couldn't submit your work.");
  const handleConfirm = () => runAction(() => apiPatch(`/tasks/${id}/done`, {}), "Couldn't confirm this task.", true);

  function handleCancel() {
    if (!confirm("Cancel this task? Any escrowed funds will be refunded to your wallet.")) return;
    runAction(() => apiPatch(`/tasks/${id}/cancel`, {}), "Couldn't cancel this task.");
  }

  async function handleRaiseDispute(e: FormEvent) {
    e.preventDefault();
    if (disputeReason.trim().length < 5) return setError("Please describe the problem in a bit more detail.");
    setSubmittingDispute(true);
    setError(null);
    try {
      await apiPost(`/tasks/${id}/dispute`, { reason: disputeReason.trim() });
      setShowDispute(false);
      setDisputeReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open a dispute.");
    } finally {
      setSubmittingDispute(false);
    }
  }

  if (loading || !data) return <Spinner />;

  const { task, isOwner, isEligibleToBid, alreadyBid, canSubmit, canConfirm, canCancel, canDispute, canReview, hasReviewed, openDispute } = data;
  const anyBidAccepted = bids.some((b) => b.status === "ACCEPTED");
  const revieweeName = isOwner ? task.helper?.name ?? "the helper" : task.poster.name;
  const hasPartyActions = canSubmit || canConfirm || canCancel || canDispute || canReview || hasReviewed;

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-sm font-semibold text-muted hover:text-ink dark:hover:text-white transition-colors">
        ← Back
      </button>

      {error && <div className={errBox}>{error}</div>}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-card bg-ink text-paper dark:bg-white dark:text-ink p-7 sm:p-9">
        <div className="absolute -right-6 -top-14 text-[13rem] leading-none opacity-[0.06] font-display select-none pointer-events-none">
          {task.category.icon}
        </div>
        <div className="relative">
          <p className="eyebrow !text-paper/50 dark:!text-ink/50">{task.category.icon} {task.category.name}</p>
          <h1 className="mt-3 font-display font-bold tracking-tightest leading-[0.95] text-[clamp(1.9rem,5vw,3.25rem)]">
            {task.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="rounded-full border border-paper/30 dark:border-ink/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {STATUS_TEXT[task.status]}
            </span>
            <span className="font-display font-bold text-2xl sm:text-3xl tracking-tightest">Rs. {task.budget.toFixed(0)}</span>
          </div>
        </div>
      </section>

      {/* Dispute banner */}
      {task.status === "DISPUTED" && (
        <div className="card p-5 space-y-1">
          <p className="font-display font-semibold">⚖️ This task is under dispute</p>
          <p className="text-sm text-muted">
            Our team will review it and release or refund the escrowed payment. The task is frozen until then.
          </p>
          {openDispute && (
            <p className="text-sm mt-1">
              <span className="text-muted">Raised by {openDispute.raisedBy.name}:</span> “{openDispute.reason}”
            </p>
          )}
        </div>
      )}

      {/* Details */}
      <div className="card p-6 space-y-5">
        <p className="whitespace-pre-wrap leading-relaxed">{task.description}</p>

        <div className="grid sm:grid-cols-2 gap-4 text-sm pt-1">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide">Posted by</p>
            <p className="font-semibold flex items-center gap-1.5 mt-1">
              <Avatar name={task.poster.name} size={20} />
              {task.poster.name}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide">Address</p>
            <p className="font-semibold mt-1">{task.address}</p>
          </div>
        </div>

        {task.helper && (
          <div className="rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 text-sm px-4 py-3 flex items-center gap-2">
            <Avatar name={task.helper.name} size={24} />
            <span>
              Assigned to <span className="font-semibold">{task.helper.name}</span> for{" "}
              <span className="font-semibold">Rs. {task.acceptedAmount?.toFixed(0)}</span>
            </span>
          </div>
        )}

        {task.latitude != null && task.longitude != null && (
          <div className="h-56 rounded-xl overflow-hidden">
            <MapView tasks={[task]} />
          </div>
        )}
      </div>

      {/* Contact */}
      {contactEligible && (
        <div className="card p-6 space-y-3">
          <p className="font-display font-semibold">📞 Contact & coordinate</p>
          {!contact ? (
            <p className="text-sm text-muted">Loading contact status…</p>
          ) : (
            <>
              {contact.myShared ? (
                <p className="text-sm font-medium">✅ You've shared your contact info.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted">Sharing lets the other person call or email you to coordinate this task.</p>
                  <button onClick={handleShareContact} disabled={sharingContact} className="btn-primary">
                    {sharingContact ? "Sharing…" : "Share My Contact Info"}
                  </button>
                </div>
              )}

              {contact.otherShared && contact.other ? (
                <div className="rounded-xl bg-ink/5 dark:bg-white/5 border border-ink/10 dark:border-white/10 p-4 flex items-center gap-3">
                  <Avatar name={contact.other.name} size={40} />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{contact.other.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                      {contact.other.phone && (
                        <a href={`tel:${contact.other.phone}`} className="font-semibold hover:underline">
                          📱 {contact.other.phone}
                        </a>
                      )}
                      <a href={`mailto:${contact.other.email}`} className="font-semibold hover:underline truncate">
                        ✉️ {contact.other.email}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Waiting for the {isOwner ? "helper" : "poster"} to share their contact info.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      {hasPartyActions && (
        <div className="card p-6 space-y-3">
          {canSubmit && (
            <p className="text-sm text-muted">Finished the work? Mark it as done and the poster will confirm to release your payment.</p>
          )}
          {canConfirm && task.status === "SUBMITTED" && (
            <p className="text-sm text-muted">The helper marked this as done. Confirm to release the escrowed payment.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <button onClick={handleSubmitWork} disabled={actionLoading} className="btn-primary">✅ Mark Work as Done</button>
            )}
            {canConfirm && (
              <button onClick={handleConfirm} disabled={actionLoading} className="btn-primary">🏁 Confirm & Release Payment</button>
            )}
            {canReview && (
              <button onClick={() => setShowReview(true)} disabled={actionLoading} className="btn-primary">⭐ Leave a Review</button>
            )}
            {canDispute && (
              <button onClick={() => setShowDispute(true)} disabled={actionLoading} className="btn-secondary">⚖️ Open a Dispute</button>
            )}
            {canCancel && (
              <button onClick={handleCancel} disabled={actionLoading} className="btn-ghost-danger">Cancel Task</button>
            )}
            {hasReviewed && <span className="text-sm font-medium self-center">✓ You've reviewed this task</span>}
          </div>
        </div>
      )}

      {/* Owner bids */}
      {isOwner && (
        <div className="card p-6 space-y-4">
          <p className="font-display font-semibold">Received bids {bids.length > 0 && `(${bids.length})`}</p>
          {bids.length === 0 ? (
            <p className="text-sm text-muted">No bids yet — check back soon.</p>
          ) : (
            <div className="space-y-3">
              {bids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  disabled={anyBidAccepted || task.status !== "OPEN"}
                  accepting={acceptingBidId === bid.id}
                  onAccept={() => handleAccept(bid.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Place bid */}
      {isEligibleToBid && (
        <form onSubmit={handlePlaceBid} className="card p-6 space-y-3">
          <p className="font-display font-semibold">💬 Place your bid</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              required
              className="input-field"
              placeholder="Your proposed amount (Rs.)"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <button type="submit" disabled={submittingBid} className="btn-primary shrink-0">
              {submittingBid ? "Submitting…" : "Submit Bid"}
            </button>
          </div>
        </form>
      )}

      {alreadyBid && !isOwner && (
        <div className="card p-6 text-sm text-muted">✅ You've already placed a bid on this task.</div>
      )}

      {showReview && (
        <ReviewModal
          taskId={task.id}
          revieweeName={revieweeName}
          onClose={() => setShowReview(false)}
          onSubmitted={() => {
            setShowReview(false);
            load();
          }}
        />
      )}

      {showDispute && (
        <Modal title="Open a Dispute ⚖️" onClose={() => setShowDispute(false)}>
          <form onSubmit={handleRaiseDispute} className="space-y-4">
            <p className="text-sm text-muted">
              Tell us what went wrong. The task will be frozen and our team will review it, then release or refund the payment.
            </p>
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="Describe the problem…"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDispute(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={submittingDispute} className="btn-primary flex-1">
                {submittingDispute ? "Submitting…" : "Submit Dispute"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
