import type { Bid } from "../../types";
import { StarRating } from "../ui/StarRating";
import { Avatar } from "../ui/Avatar";

interface BidCardProps {
  bid: Bid;
  disabled?: boolean;
  onAccept?: () => void;
  accepting?: boolean;
}

const STATUS_LABEL: Record<Bid["status"], string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted ✅",
  REJECTED: "Not selected",
};

export function BidCard({ bid, disabled, onAccept, accepting }: BidCardProps) {
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={bid.helper.name} size={40} />
        <div className="min-w-0">
          <p className="font-semibold truncate">{bid.helper.name}</p>
          {bid.helperRating && <StarRating rating={bid.helperRating.average ?? 0} count={bid.helperRating.count} />}
          <p className="text-sm text-muted mt-1">
            Bid: <span className="font-bold text-navy dark:text-slate-100">Rs. {bid.proposedAmount.toFixed(0)}</span>
          </p>
        </div>
      </div>

      {bid.status === "PENDING" ? (
        <button onClick={onAccept} disabled={disabled || accepting} className="btn-primary !px-4 !py-2 text-sm shrink-0">
          {accepting ? "Accepting..." : "Accept"}
        </button>
      ) : (
        <span className={`text-sm font-semibold shrink-0 ${bid.status === "ACCEPTED" ? "text-green" : "text-muted"}`}>
          {STATUS_LABEL[bid.status]}
        </span>
      )}
    </div>
  );
}
