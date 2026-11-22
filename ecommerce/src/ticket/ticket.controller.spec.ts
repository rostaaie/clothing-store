import { Test, TestingModule } from '@nestjs/testing';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

describe('TicketController', () => {
  let controller: TicketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [{ provide: TicketService, useValue: {} }],
    }).compile();

    controller = module.get<TicketController>(TicketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('حذف تیکت فقط برای ادمین است', () => {
    const roles = Reflect.getMetadata(
      'roles',
      TicketController.prototype.remove,
    );
    expect(roles).toEqual(['admin']);
  });

  it('مسیرهای مشاهده تیکت و مکالمه نقش ثابت ندارند (کنترل مالکیت در سرویس)', () => {
    expect(
      Reflect.getMetadata('roles', TicketController.prototype.findOne),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata('roles', TicketController.prototype.getConversation),
    ).toBeUndefined();
  });
});