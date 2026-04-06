import { test, expect } from '@playwright/test';

test.describe('Halyk E-Pay Integration Test', () => {
  test('should successfully initiate payment and redirect to Halyk page', async ({ page }) => {
    // 1. In a real scenario, the frontend would fetch paymentData from the backend
    // For this test, let's assume we have paymentData from our API
    const paymentData = {
      invoiceId: "test-invoice-001",
      amount: 100,
      currency: "KZT",
      description: "Test Order",
      terminal: "67e34d63-102f-4bd1-898e-370781d0074d",
      auth: "Bearer ACCESS_TOKEN_FROM_BACKEND",
      backLink: "http://localhost:3000/success",
      failureBackLink: "http://localhost:3000/failure",
      postLink: "http://localhost:3000/api/halyk/webhook",
      failurePostLink: "http://localhost:3000/api/halyk/webhook"
    };

    // 2. Set up the page with Halyk script and initiate payment call
    await page.setContent(`
      <html>
        <body>
          <button id="pay-button">Pay with Halyk</button>
          <script src="https://test-epay.epayment.kz/payform/payment-api.js"></script>
          <script>
            document.getElementById('pay-button').onclick = function() {
              halyk.pay(${JSON.stringify(paymentData)});
            };
          </script>
        </body>
      </html>
    `);

    // 3. Click the payment button
    await page.click('#pay-button');

    // 4. Verify redirection to Halyk payment page (check URL)
    await page.waitForURL(/test-epay.epayment.kz/);
    const currentUrl = page.url();
    expect(currentUrl).toContain('test-epay.epayment.kz');
    
    // 5. In a real E2E test, you would then simulate entering card details or using a test card
    console.log('Successfully redirected to Halyk Payment Page:', currentUrl);
  });
});
