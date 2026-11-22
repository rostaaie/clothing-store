import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentProviderService {
  async requestPayment(orderId: number, amount: number) {
    // اینجا فرضی یک درگاه پرداخت تستی شبیه‌سازی می‌کنیم
    const paymentUrl = `https://fake-gateway.com/pay?orderId=${orderId}`;

    return {
      url: paymentUrl,
      authority: 'FAKE_AUTH_123',
    };
  }

  async verifyPayment(authority: string) {
    // پاسخ تستی و فرضی

    // در حالت واقعی، درخواست به درگاه ارسال می‌شود
    // در اینجا: موفقیت
    return {
      success: true,
      referenceId: 'TEST_REF_98765',
    };
  }
}
