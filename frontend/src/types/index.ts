export type UserType = "POSTER" | "HELPER";
export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type WalletTxType = "DEPOSIT" | "WITHDRAW" | "ESCROW_HOLD" | "ESCROW_RELEASE" | "REFUND";

export interface User {
  id: number;
  name: string;
  email: string;
  userType: UserType;
  city: string | null;
  phone: string | null;
  walletBalance: number;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface TaskUserRef {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  posterId: number;
  poster: TaskUserRef;
  categoryId: number;
  category: Category;
  title: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  budget: number;
  status: TaskStatus;
  helperId: number | null;
  helper: TaskUserRef | null;
  acceptedAmount: number | null;
  createdAt: string;
  distanceKm?: number | null;
}

export interface Rating {
  average: number | null;
  count: number;
}

export interface Bid {
  id: number;
  taskId: number;
  helperId: number;
  helper: TaskUserRef;
  proposedAmount: number;
  status: BidStatus;
  createdAt: string;
  helperRating?: Rating;
  task?: Task;
}

export interface Review {
  id: number;
  taskId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer?: TaskUserRef;
}

export interface WalletTransaction {
  id: number;
  userId: number;
  type: WalletTxType;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface ContactStatus {
  myShared: boolean;
  otherShared: boolean;
  other: { name: string; email: string; phone: string | null } | null;
}
