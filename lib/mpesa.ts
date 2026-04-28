/**
 * Safaricom Daraja API — M-Pesa Express (STK Push)
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */

const DARAJA_BASE =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://yoursite.com/api/mpesa/callback";

/** Get OAuth access token from Daraja */
export async function getDarajaToken(): Promise<string> {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.statusText}`);
  const data = await res.json();
  return data.access_token;
}

/** Generate Daraja password (base64 of shortcode+passkey+timestamp) */
export function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const raw = `${SHORTCODE}${PASSKEY}${timestamp}`;
  const password = Buffer.from(raw).toString("base64");
  return { password, timestamp };
}

export interface STKPushParams {
  phone: string;       // Format: 2547XXXXXXXX
  amount: number;
  accountRef: string;  // e.g. ticket ID
  description: string; // e.g. "Jazz Night 2025 - VIP Ticket"
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/** Initiate STK Push — sends payment prompt to customer's phone */
export async function initiateSTKPush(params: STKPushParams): Promise<STKPushResponse> {
  const token = await getDarajaToken();
  const { password, timestamp } = generatePassword();

  // Normalize phone: strip leading 0 and add 254
  const phone = params.phone.replace(/^0/, "254").replace(/^\+/, "");

  const payload = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(params.amount),
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: params.accountRef,
    TransactionDesc: params.description,
  };

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`STK Push failed: ${err}`);
  }

  return res.json();
}

/** Query STK Push status */
export async function querySTKStatus(checkoutRequestId: string) {
  const token = await getDarajaToken();
  const { password, timestamp } = generatePassword();

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  return res.json();
}
