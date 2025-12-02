# Azure AD SSO Integration Notes

This branch includes scaffolding for Azure Active Directory single sign-on via NextAuth. Until the Azure credentials are populated the login flow continues to rely on the existing demo/local accounts.

## Quick Rollback

- Flip `NEXT_PUBLIC_AZURE_AD_SSO_ENABLED` back to `false` (or remove the variable) to hide the SSO button.
- Unset `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, and `AZURE_AD_CLIENT_SECRET` to stop NextAuth from handling Azure callbacks.
- No database schema or user data changes were introduced, so reverting these environment values restores the previous behaviour without touching code.

## Required Values When Ready

Ask Birketts IT for the following:

| Key                                | Purpose                                          |
| ---------------------------------- | ------------------------------------------------ |
| `AZURE_AD_TENANT_ID`               | Directory (tenant) the app registration lives in |
| `AZURE_AD_CLIENT_ID`               | Application (client) ID from the registration    |
| `AZURE_AD_CLIENT_SECRET`           | Client secret generated for Rainmaker            |
| `NEXTAUTH_SECRET`                  | Random 32+ character secret used by NextAuth     |
| `NEXT_PUBLIC_AZURE_AD_SSO_ENABLED` | Set to `true` to surface the login button        |

Add the corresponding redirect URL(s) to the Azure app registration, e.g. `https://app.rainmaker.com/api/auth/callback/azure-ad`.

## Local Admin Access

The legacy login flow and stored admin accounts remain available. That means you can continue to log in without Azure credentials and promote or demote users inside Rainmaker whenever needed.
