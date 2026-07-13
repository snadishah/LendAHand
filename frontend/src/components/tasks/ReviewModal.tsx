import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { Modal } from "../ui/Modal";
import { StarRating } from "../ui/StarRating";

interface ReviewModalProps {
  taskId: number;
  revieweeName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReviewModal({ taskId, revieweeName, onClose, onSubmitted }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/reviews", { taskId, rating, comment: comment || undefined });
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Rate ${revieweeName} 🏁`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Task complete! Let others know how it went.</p>

        {error && <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-3 py-2">{error}</div>}

        <div className="flex justify-center">
          <StarRating rating={rating} size="lg" interactive onChange={setRating} />
        </div>

        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Add a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Skip
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
