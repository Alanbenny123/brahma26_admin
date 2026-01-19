'use server';

/**
 * Razorpay API Integration
 * Fetches payment details from Razorpay using their API
 */

interface RazorpayPayment {
    id: string;
    amount: number; // in paise
    currency: string;
    status: string;
    method: string;
    description: string | null;
    email: string;
    contact: string;
    captured: boolean;
    created_at: number;
    error_code: string | null;
    error_description: string | null;
}

interface PaymentDetails {
    success: boolean;
    payment?: {
        id: string;
        amount: number; // in rupees
        amountPaise: number; // original paise amount
        currency: string;
        status: string;
        method: string;
        description: string | null;
        email: string;
        contact: string;
        captured: boolean;
        createdAt: Date;
    };
    error?: string;
}

/**
 * Fetch payment details from Razorpay using payment ID
 * @param paymentId - The Razorpay payment ID (e.g., pay_xxxxx)
 */
export async function fetchPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return { success: false, error: 'Razorpay credentials not configured' };
        }

        // Create Basic Auth header
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error?.description || `Failed to fetch payment: ${response.status}`
            };
        }

        const payment: RazorpayPayment = await response.json();

        return {
            success: true,
            payment: {
                id: payment.id,
                amount: payment.amount / 100, // Convert paise to rupees
                amountPaise: payment.amount,
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                description: payment.description,
                email: payment.email,
                contact: payment.contact,
                captured: payment.captured,
                createdAt: new Date(payment.created_at * 1000),
            }
        };
    } catch (error) {
        console.error('Error fetching Razorpay payment:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Fetch multiple payment details at once
 * @param paymentIds - Array of Razorpay payment IDs
 */
export async function fetchMultiplePayments(paymentIds: string[]): Promise<Map<string, PaymentDetails>> {
    const results = new Map<string, PaymentDetails>();

    // Fetch in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < paymentIds.length; i += batchSize) {
        const batch = paymentIds.slice(i, i + batchSize);
        const promises = batch.map(id => fetchPaymentDetails(id));
        const batchResults = await Promise.all(promises);

        batch.forEach((id, index) => {
            results.set(id, batchResults[index]);
        });

        // Small delay between batches to respect rate limits
        if (i + batchSize < paymentIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

/**
 * Get payment amount for a transaction ID
 * Simplified function that just returns the amount
 */
export async function getPaymentAmount(paymentId: string): Promise<{ success: boolean; amount?: number; error?: string }> {
    const result = await fetchPaymentDetails(paymentId);

    if (result.success && result.payment) {
        return { success: true, amount: result.payment.amount };
    }

    return { success: false, error: result.error };
}
