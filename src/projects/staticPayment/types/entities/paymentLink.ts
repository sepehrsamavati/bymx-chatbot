export type PaymentLink = {
    url: string;
    productId: string;
}

export type SearchPaymentLink = Pick<Partial<PaymentLink>, 'url' | 'productId'>;
