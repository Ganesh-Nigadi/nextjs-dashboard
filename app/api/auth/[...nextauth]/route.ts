import NextAuth from "next-auth";
import { authConfig } from "@/auth.config"; // update the path if needed

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
