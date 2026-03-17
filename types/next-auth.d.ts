import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      traderId: string | null;
      traderSlug: string | null;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    traderId?: string | null;
    traderSlug?: string | null;
    role?: string;
  }
}
