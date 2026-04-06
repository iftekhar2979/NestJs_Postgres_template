# Halyk E-Pay API Documentation

This document describes the integration with Halyk E-Pay (EPAY) for payment processing.

## Base URLs

- **Test**: `https://test-epay-oauth.epayment.kz`
- **Production**: `https://epay-oauth.homebank.kz`

## 1. Authentication (Token Retrieval)

Before any payment, you must obtain a Bearer token.

### Endpoint: `POST /oauth2/token`

**Request Headers**:
`Content-Type: application/x-www-form-urlencoded`

**Request Body (form-data)**:

| Field | Description | Mandatory | Example |
| :--- | :--- | :--- | :--- |
| `grant_type` | Authorization type | Yes | `"client_credentials"` |
| `scope` | Resource scope | Yes | `"payment"` |
| `client_id` | Merchant Identification | Yes | `"test"` |
| `client_secret` | Merchant Secret Key | Yes | `"yF587AV9Ms94qN2QShFzVR3vFnWkhjbAK3sG"` |
| `invoiceID` | Unique Order Number | Yes | `"000000001"` |
| `amount` | Transaction Amount | Yes | `100` |
| `currency` | Transaction Currency | Yes | `"KZT"` |
| `terminal` | Sale Point Identification | Yes | `"67e34d63-102f-4bd1-898e-370781d0074d"` |
| `postLink` | Success Notification URL | No | `"https://example.kz/success"` |
| `failurePostLink` | Failure Notification URL | No | `"https://example.kz/failure"` |
| `secret_hash` | Additional Secret | No | `"random_string"` |

**Response (JSON)**:
```json
{
  "access_token": "DCEB8O_ZM5U7SO_T_U5EJQ",
  "expires_in": 7200,
  "refresh_token": "",
  "scope": "payment",
  "token_type": "Bearer"
}
```

## 2. Payment Redirection

To redirect the user to the payment page, use the Halyk JS library.

- **Test JS**: `https://test-epay.epayment.kz/payform/payment-api.js`
- **Prod JS**: `https://epay.homebank.kz/payform/payment-api.js`

### JavaScript Example:
```javascript
var paymentObject = {
  invoiceId: "000000001",
  backLink: "https://example.kz/success.html",
  failureBackLink: "https://example.kz/failure.html",
  postLink: "https://example.kz/api/halyk/success",
  failurePostLink: "https://example.kz/api/halyk/fail",
  language: "RU",
  description: "Order Description",
  terminal: "67e34d63-102f-4bd1-898e-370781d0074d",
  amount: 100,
  currency: "KZT",
  auth: "Bearer ACCESS_TOKEN_FROM_STEP_1"
};

halyk.pay(paymentObject);
```

## 3. Postback Notifications

Halyk E-Pay will send a POST request to the `postLink` or `failurePostLink` specified in the payment object.

### Success Response Body (JSON):
```json
{
  "acountId": "9398101000014416472",
  "amount": 800,
  "approvalCode": "178644",
  "cardType": "VISA",
  "code": "ok",
  "currency": "KZT",
  "dateTime": "2025-02-12T09:42:51.960781107+05:00",
  "invoiceId": "33456850",
  "reason": "success",
  "terminal": "67e34d63-102f-4bd1-898e-370781d0074d"
}
```
