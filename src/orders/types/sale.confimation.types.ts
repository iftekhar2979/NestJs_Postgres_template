interface SaleConfirmationPayload {
    company: {
        name: string;
        logoUrl?: string;
        supportEmail?: string;
        supportPhone?: string;
        website?: string;
    };

    customer: {
        firstName: string;
        lastName: string;
        email: string;
    };

    order: {
        number: string;
        date: string;
        currency: string;
        subtotal: number;
        shippingCost: number;
        tax: number;
        total: number;
    };

    trackingNumber?: string;

    payment: {
        method: string;
        status: string;
        paidAt: string;
        transactionId: string;
    };

    shipping: any;

    products: Array<{
        sku: string;
        title: string;
        imageUrl?: string;
        quantity: number;
        unitPrice: number;
        options?: string;
    }>;

    baseUrl: string;
}
