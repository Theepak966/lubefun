# NOWPayments Information

## Important: About Wallets and Private Keys

**NOWPayments does NOT provide private keys or direct wallet access.**

NOWPayments is a **payment processing service** (like Stripe for crypto). They handle:
- Receiving payments from users
- Managing wallet addresses for deposits
- Processing withdrawals to user-provided addresses
- Currency conversion and exchange rates

### How NOWPayments Works:

1. **Deposits:**
   - NOWPayments generates unique wallet addresses for each payment
   - Users send crypto to those addresses
   - NOWPayments notifies your app via webhook when payment is received
   - The `pay_address` in the webhook is the wallet address (temporary, per transaction)

2. **Withdrawals:**
   - Users provide their own wallet addresses
   - Your app requests withdrawals via NOWPayments API
   - NOWPayments sends crypto from their managed wallets to user addresses
   - You don't have access to NOWPayments' wallet private keys

### Your NOWPayments Configuration:

```
API Key: 53VGRHS-1BPMCJG-PGQWYQZ-H0RPBXY
Public Key: e4a6e266-51ed-49e7-8903-1038da12c516
IPN Secret: IspdO+XCJfLk0+aLMghP7V2+TYxJVAND
Callback URL: https://lube.fun/nowpayments/callback
```

### What You Can Access:

1. **Payment Status:** Via webhooks and API calls
2. **Exchange Rates:** Via API (`/v1/estimate`)
3. **Transaction History:** Via NOWPayments dashboard
4. **Wallet Addresses:** Only the temporary addresses generated for each deposit

### What You CANNOT Access:

- ❌ Private keys (NOWPayments manages these)
- ❌ Direct wallet control
- ❌ Wallet balances (managed by NOWPayments)
- ❌ Master wallet addresses (internal to NOWPayments)

### To View Your NOWPayments Account:

1. Go to https://nowpayments.io/
2. Log in with your NOWPayments account credentials
3. Access the dashboard to see:
   - Transaction history
   - Payment statistics
   - Account settings
   - API keys management

### Important Notes:

- NOWPayments manages all wallet infrastructure
- You receive payments via webhooks, not direct wallet access
- All crypto is held by NOWPayments until you request withdrawals
- This is a standard payment processor model (secure and compliant)
