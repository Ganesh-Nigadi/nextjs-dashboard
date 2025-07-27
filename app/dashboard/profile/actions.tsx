"use server";
import { auth } from "@/auth";
import { hash } from "bcrypt";
import { redirect } from "next/navigation";
import postgres from "postgres";

export const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });
export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !phone) {
    throw new Error("Missing required fields");
  }

  const values: any[] = [name, email, Number(phone)];

  let query = `
    UPDATE users
    SET name = $1, email = $2, phone = $3`;

  if (password) {
    const hashed = await hash(password, 10);
    query += `, password = $4 WHERE email = $5`;
    values.push(hashed, session.user.email);
  } else {
    query += ` WHERE email = $4`;
    values.push(session.user.email);
  }

  await sql.unsafe(query, values);
  redirect("/dashboard/profile?success=true");
}
