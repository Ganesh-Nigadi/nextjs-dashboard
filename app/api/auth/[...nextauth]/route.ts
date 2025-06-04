import NextAuth from "next-auth";
import { authConfig } from "@/auth.config"; // Adjust this path if needed

const handler = NextAuth(authConfig);

export const GET = handler;
export const POST = handler;

// OR — Recommended in Next.js 15+
// export default handler; // <- This works too for the App Router
