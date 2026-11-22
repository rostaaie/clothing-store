import { PaymentProviderService } from './payment-provider.service';

describe('PaymentProviderService', () => {
  let service: PaymentProviderService;

  beforeEach(() => {
    service = new PaymentProviderService();
  });

  describe('requestPayment', () => {
    it('آدرس پرداخت با orderId و Authority ساختگی برمی‌گرداند', async () => {
      const result = await service.requestPayment(42, 100000);

      expect(result.url).toContain('orderId=42');
      expect(result.authority).toBe('FAKE_AUTH_123');
    });
  });

  describe('verifyPayment', () => {
    it('پرداخت را موفق برمی‌گرداند', async () => {
      const result = await service.verifyPayment('FAKE_AUTH_123');

      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('TEST_REF_98765');
    });
  });
});
