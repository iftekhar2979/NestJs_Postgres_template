export enum OrderStatus {
    DELIVERED = 'delivered',
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',   
    REFUNDED = 'refunded',
    DELIVERY_FILLED = 'delivery_filled',
    SHIPMENT_READY = 'shipment_ready',
    PREPEARED = 'prepeared',
    PAYMENT_DUE = 'payment_due'

}

export enum PaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed' ,
    FAILED = 'failed',
    REFUNDED = 'refunded',
    CANCELED = 'canceled' ,
    SUBMITTED = 'submitted',
    DUE_DELIVERY = 'due_delivery'
}