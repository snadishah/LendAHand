import type { UserType } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userType: UserType;
      };
    }
  }
}

export {};
