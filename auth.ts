import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import postgres from 'postgres';
import type { User } from '@/app/lib/definitions';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ 
            email: z.string().email(),
            password: z.string().min(6)
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          console.log('Invalid credentials format');
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user = await getUser(email);
        
        if (!user) {
          console.log('User not found');
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);
        
        if (passwordsMatch) {
          console.log('Authentication successful for:', email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            // Add any other user fields you need
          };
        }

        console.log('Invalid password for:', email);
        return null;
      },
    }),
  ],
});