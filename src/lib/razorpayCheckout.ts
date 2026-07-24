export type RazorpayOpenResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutInput = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  name?: string;
  description?: string;
  prefillEmail?: string;
  prefillContact?: string;
};

/** Opens native Razorpay checkout when react-native-razorpay is in the dev build. */
export async function openRazorpayCheckout(
  input: RazorpayCheckoutInput,
): Promise<RazorpayOpenResult | null> {
  try {
    // Optional native module — requires `npx expo run:android` after install
    const RazorpayCheckout = require('react-native-razorpay').default;
    const data = await RazorpayCheckout.open({
      key: input.keyId,
      order_id: input.razorpayOrderId,
      amount: input.amountPaise,
      currency: 'INR',
      name: input.name ?? 'QuickBite',
      description: input.description ?? 'Food order payment',
      prefill: {
        email: input.prefillEmail,
        contact: input.prefillContact,
      },
      theme: { color: '#ff5a00' },
    });
    return {
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_order_id: data.razorpay_order_id,
      razorpay_signature: data.razorpay_signature,
    };
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    // User cancelled Razorpay sheet
    if (code === 0 || code === 2) {
      return null;
    }
    throw err;
  }
}

export function isRazorpayNativeAvailable(): boolean {
  try {
    require('react-native-razorpay');
    return true;
  } catch {
    return false;
  }
}

/** Razorpay Checkout.js HTML for WebView when native SDK is unavailable. */
export function buildRazorpayWebCheckoutHtml(input: RazorpayCheckoutInput): string {
  const name = JSON.stringify(input.name ?? 'QuickBite');
  const description = JSON.stringify(input.description ?? 'Food order payment');
  const email = JSON.stringify(input.prefillEmail ?? '');
  const contact = JSON.stringify(input.prefillContact ?? '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    body { margin: 0; background: #fff; font-family: sans-serif; }
    #status { padding: 24px; text-align: center; color: #444; }
  </style>
</head>
<body>
  <div id="status">Opening Razorpay…</div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    try {
      var options = {
        key: ${JSON.stringify(input.keyId)},
        order_id: ${JSON.stringify(input.razorpayOrderId)},
        amount: ${input.amountPaise},
        currency: 'INR',
        name: ${name},
        description: ${description},
        prefill: { email: ${email}, contact: ${contact} },
        theme: { color: '#ff5a00' },
        handler: function (response) {
          post({
            type: 'success',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            post({ type: 'cancel' });
          },
        },
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        post({
          type: 'error',
          message: response.error && response.error.description
            ? response.error.description
            : 'Payment failed',
        });
      });
      rzp.open();
    } catch (err) {
      post({ type: 'error', message: err && err.message ? err.message : 'Could not open Razorpay' });
    }
  </script>
</body>
</html>`;
}
