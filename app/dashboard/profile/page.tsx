import { redirect } from "next/navigation";
import { updateUserProfile } from "./actions";
import { auth } from "@/auth";

import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

type Props = {
  searchParams?: Promise<{
    success?: string;
  }>;
};
export default async function ProfilePage({ searchParams }: Props) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // Fetch full user data (including phone)
  const [user] = await sql`
    SELECT name, email, phone FROM users WHERE email = ${session.user.email}
  `;
  const success = (await searchParams)?.success === "true";

  return (
    <div>
      <h1>Profile</h1>
      <div className="max-w-md mx-auto mt-10 space-y-4">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded">
            ✅ Profile updated successfully!
          </div>
        )}

        <form action={updateUserProfile} className="space-y-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <input
            type="text"
            name="name"
            defaultValue={user.name || ""}
            placeholder="Name"
            className="w-full border p-2"
          />
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            name="email"
            defaultValue={user.email || ""}
            placeholder="Email"
            className="w-full border p-2"
          />
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            defaultValue={user.phone?.toString() || ""}
            placeholder="Phone"
            className="w-full border p-2"
          />
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            type="password"
            name="password"
            placeholder="New Password"
            className="w-full border p-2"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}
