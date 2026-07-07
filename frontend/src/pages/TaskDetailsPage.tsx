import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Bid, ContactStatus, Task } from "../types";
import { StatusChip } from "../components/ui/StatusChip";
import { Spinner } from "../components/ui/EmptyState";
import { Avatar } from "../components/ui/Avatar";
import { PageHeader } from "../components/ui/PageHeader";
import { BidCard } from "../components/tasks/BidCard";
import { ReviewModal } from "../components/tasks/ReviewModal";
import { MapView } from "../components/map/MapView";

interface TaskDetailResponse {
  task: Task;
  isOwner: boolean;
  isEligibleToBid: boolean;
  alreadyBid: boolean;
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
    (data.task.status === "IN_PROGRESS" || data.task.status === "DONE") &&
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

  async function handleMarkDone() {
    setActionLoading(true);
    setError(null);
    try {
      await apiPatch(`/tasks/${id}/done`, {});
      await load();
      setShowReview(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't mark this task as done.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this task? Any escrowed funds will be refunded to your wallet.")) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiPatch(`/tasks/${id}/cancel`, {});
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel this task.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !data) return <Spinner />;

  const { task, isOwner, isEligibleToBid, alreadyBid } = data;
  const anyBidAccepted = bids.some((b) => b.status === "ACCEPTED");

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-sm text-muted hover:text-navy dark:hover:text-slate-100">
        ← Back
      </button>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <span>{task.category.icon}</span>
            <span>{task.category.name}</span>
          </div>
          <PageHeader title={task.title} actions={<StatusChip status={task.status} />} />
        </div>

        <p className="text-navy dark:text-slate-200 whitespace-pre-wrap">{task.description}</p>

        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <InfoBlock label="Budget" value={`Rs. ${task.budget.toFixed(0)}`} accent />
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Posted by</p>
            <p className="font-semibold truncate flex items-center gap-1.5">
              <Avatar name={task.poster.name} size={20} />
              {task.poster.name}
            </p>
          </div>
          <InfoBlock label="Address" value={task.address} />
        </div>

        {task.helper && (
          <div className="rounded-xl bg-teal/10 text-sm px-4 py-2.5 flex items-center gap-2">
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

      {contactEligible && (
        <div className="card p-5 space-y-3">
          <p className="font-bold">📞 Contact & Coordinate</p>

          {!contact ? (
            <p className="text-sm text-muted">Loading contact status...</p>
          ) : (
            <>
              {contact.myShared ? (
                <p className="text-sm text-green font-medium">✅ You've shared your contact info.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    Sharing lets the other person call or email you to coordinate this task.
                  </p>
                  <button onClick={handleShareContact} disabled={sharingContact} className="btn-primary">
                    {sharingContact ? "Sharing..." : "Share My Contact Info"}
                  </button>
                </div>
              )}

              {contact.otherShared && contact.other ? (
                <div className="rounded-xl bg-teal/10 p-4 flex items-center gap-3">
                  <Avatar name={contact.other.name} size={40} />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{contact.other.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                      {contact.other.phone && (
                        <a href={`tel:${contact.other.phone}`} className="text-coral font-semibold hover:underline">
                          📱 {contact.other.phone}
                        </a>
                      )}
                      <a
                        href={`mailto:${contact.other.email}`}
                        className="text-coral font-semibold hover:underline truncate"
                      >
                        ✉️ {contact.other.email}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Waiting for the {isOwner ? "helper" : "poster"} to share their contact info.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {isOwner && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {task.status === "IN_PROGRESS" && (
              <button onClick={handleMarkDone} disabled={actionLoading} className="btn-primary">
                🏁 Mark as Done
              </button>
            )}
            {(task.status === "OPEN" || task.status === "IN_PROGRESS") && (
              <button onClick={handleCancel} disabled={actionLoading} className="btn-ghost-danger">
                Cancel Task
              </button>
            )}
          </div>

          <div>
            <p className="font-bold mb-3">Received Bids {bids.length > 0 && `(${bids.length})`}</p>
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
        </div>
      )}

      {isEligibleToBid && (
        <form onSubmit={handlePlaceBid} className="card p-5 space-y-3">
          <p className="font-bold">💬 Place Your Bid</p>
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
              {submittingBid ? "Submitting..." : "Submit Bid"}
            </button>
          </div>
        </form>
      )}

      {alreadyBid && !isOwner && (
        <div className="card p-5 text-sm text-muted">✅ You've already placed a bid on this task.</div>
      )}

      {user?.userType === "HELPER" && task.helperId === user.id && task.status === "IN_PROGRESS" && (
        <div className="card p-5 text-sm">🚧 You're working on this task — the poster will mark it done once you finish.</div>
      )}

      {showReview && task.helper && (
        <ReviewModal
          taskId={task.id}
          helperName={task.helper.name}
          onClose={() => setShowReview(false)}
          onSubmitted={() => setShowReview(false)}
        />
      )}
    </div>
  );
}

function InfoBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className={`font-semibold truncate ${accent ? "text-coral text-lg" : ""}`}>{value}</p>
    </div>
  );
}
