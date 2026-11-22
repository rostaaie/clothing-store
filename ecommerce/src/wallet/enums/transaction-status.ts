export enum TransactionStatus {
  //payment
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',

  //transaction
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
  PURCHASE = 'PURCHASE',

  ORDER_PAYMENT = 'ORDER_PAYMENT',
}
