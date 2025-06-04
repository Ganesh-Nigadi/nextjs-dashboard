'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData): Promise<void> {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId')?.toString(),
    amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
    status: formData.get('status')?.toString(),
  });

  if (!validatedFields.success) {
    // You could extract and throw specific error messages if needed
    throw new Error('Missing Fields. Failed to Create Invoice.');
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Math.round(amount * 100);
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Create Invoice Error:', error);
    throw new Error('Database Error: Failed to Create Invoice.');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData): Promise<void> {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId')?.toString(),
    amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
    status: formData.get('status')?.toString(),
  });

  if (!validatedFields.success) {
    throw new Error('Missing Fields. Failed to Update Invoice.');
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Math.round(amount * 100);

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Update Invoice Error:', error);
    throw new Error('Database Error: Failed to Update Invoice.');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string): Promise<void> {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  } catch (error) {
    console.error('Delete Invoice Error:', error);
    throw new Error('Database Error: Failed to Delete Invoice.');
  }
}

// Authentication action
export async function authenticate(formData: FormData): Promise<string | undefined> {
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const redirectTo = formData.get('redirectTo')?.toString() || '/dashboard';

  if (!email || !password) {
    return 'Email and password are required.';
  }

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false, // do not redirect here, handle redirect manually
    });

    if (!result || !result.ok) {
      // You can check result.error for specific error string if your auth system provides it
      return 'Invalid email or password.';
    }

    // On success, redirect manually
    redirect(redirectTo);
    return undefined; // no error message
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
