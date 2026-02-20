# How to Disable Email Confirmation in Supabase

To allow users to sign up and immediately access your app without email verification, follow these steps:

## Steps

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Providers"**

3. **Edit Email Provider**
   - Find **"Email"** in the list of providers
   - Click on it to expand settings

4. **Disable Email Confirmation**
   - Find the toggle for **"Confirm email"**
   - Turn it **OFF** (should be grey/inactive)
   - Click **"Save"**

## What This Does

- Users can sign up and immediately access the app
- No confirmation email is sent
- User session is created instantly after signup
- The loading/waiting issue will be resolved

## Alternative: Test with Gmail Provider

If you want to test quickly without changing settings, you can also:
- Use Google Sign-In instead of email signup
- Google auth doesn't require email confirmation

---

After making this change, try signing up again and you should be immediately logged in without waiting!
