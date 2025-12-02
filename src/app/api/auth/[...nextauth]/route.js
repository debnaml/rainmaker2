import { randomUUID } from 'node:crypto';
import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createSupabaseServiceClient } from '/lib/supabaseServer';

const AZURE_TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const azureConfigured = Boolean(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET);

async function syncUserProfile({ email, name }) {
  if (!email) {
    throw new Error('Azure SSO did not return an email address.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || null;
  const supabase = createSupabaseServiceClient();

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const baseProfile = {
    email: normalizedEmail,
    display_name: displayName,
  };

  if (existingUser) {
    const shouldUpdate =
      (displayName && displayName !== existingUser.display_name) ||
      normalizedEmail !== existingUser.email;

    if (shouldUpdate) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(baseProfile)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return updatedUser;
    }

    return existingUser;
  }

  const insertPayload = {
    id: randomUUID(),
    ...baseProfile,
    role: 'normal',
  };

  const { data: insertedUser, error: insertError } = await supabase
    .from('users')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedUser;
}

function serializeUser(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.display_name ?? record.email,
    email: record.email,
    role: record.role ?? 'normal',
    peerGroupId: record.peer_group_id ?? null,
    avatarUrl: record.avatar_url ?? null,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null,
  };
}

const providers = [];

if (azureConfigured) {
  providers.push(
    AzureADProvider({
      clientId: AZURE_CLIENT_ID,
      clientSecret: AZURE_CLIENT_SECRET,
      tenantId: AZURE_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
    })
  );
} else {
  providers.push(
    CredentialsProvider({
      name: 'placeholder',
      credentials: {},
      async authorize() {
        return null;
      },
    })
  );
}

const handler = NextAuth({
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'azure-ad' && !azureConfigured) {
        console.warn('Azure AD sign-in attempted but the provider is not fully configured.');
        return false;
      }
      if (account?.provider === 'azure-ad' && !user?.email) {
        console.error('Azure AD sign-in is missing an email claim.');
        return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'azure-ad' && user?.email) {
        try {
          const profile = await syncUserProfile({ email: user.email, name: user.name });
          token.appUser = serializeUser(profile);
        } catch (error) {
          console.error('[next-auth] Failed to sync Azure AD user', error);
          throw error;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.appUser) {
        session.user = { ...token.appUser, authSource: 'sso' };
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

export const GET = handler;
export const POST = handler;
