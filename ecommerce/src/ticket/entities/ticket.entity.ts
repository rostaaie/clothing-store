import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('tickets')
export class Ticket {
  // استفاده از یویوآیدی برای شناسه منحصر به فرد و مقیاس‌پذیرتر
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  subject: string;

  @Column({ nullable: true, type: 'text' }) // استفاده از تایپ: 'تکست' برای محتوای طولانی‌تر
  description: string;

  // رابطه با کاربر
  // هر تیکت متعلق به یک کاربر است
  @ManyToOne(() => User, (user) => user.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // نام ستون فورین کیی در جدول تیکتس
  user: User; //باید جاش همینجا باشه. نه اینکه قبل جوین کالم
  @Column() // ستون یوزرآیدی برای نگهداری فورین کیی
  //مجبوریم خودمون ستون ایجاد کنیم چون برای وان تو منی خودکار خودش درست میکنه اما برای منی تو وان نه
  userId: number;

  // رابطه والد-فرزندی برای زنجیره پاسخ‌ها
  // replyTo: اشاره به تیکت والد (پیامی که به آن پاسخ داده شده)
  @ManyToOne(() => Ticket, (ticket) => ticket.replies, { nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo: Ticket;

  @Column({ nullable: true })
  replyToId: string;

  // replies: لیستی از تیکت‌هایی که به این تیکت پاسخ داده‌اند
  @OneToMany(() => Ticket, (ticket) => ticket.replyTo)
  replies: Ticket[];

  // *** فیلد کلیدی برای مدیریت مکالمه/تب ***
  // rootTicketId: شناسه تیکت اصلی این مکالمه (تب)
  // برای اولین تیکت، این مقدار برابر با آیدی خودش است.
  // برای پیام‌های بعدی، این مقدار از تیکت والد (ریپلایتو) به ارث برده می‌شود.
  @Column({ nullable: false }) // این فیلد نباید نال باشد چون هر پیام باید به یک ریشه وصل باشد
  rootTicketId: string;

  // زمان ایجاد و به‌روزرسانی (اختیاری ولی توصیه شده)
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}

/*
what we did here:
    
     +-----------------+      +-----------------+      +-----------------+      +-----------------+      +-----------------+
|    Ticket 1     |----->|    Ticket 2     |----->|    Ticket 3     |----->|    Ticket 4     |----->|    Ticket 5     |
|   (User)        |      |   (Support)     |      |   (User)        |      |   (Support)     |      |   (User)        |
|-----------------|      |-----------------|      |-----------------|      |-----------------|      |-----------------|
| id: uuid1       |      | id: uuid2       |      | id: uuid3       |      | id: uuid4       |      | id: uuid5       |
| subject: Order  |      |subject: Re:Order|      |subject: Re:Order|      |subject: Re:Order|      |subject: Re:Order|
| replies: uuid2  |      | replies: uuid3  |      |replies: uuid 4,5|      | replies:        |      | replies:        |
| replyTo: null   |      | replyTo: uuid1  |      | replyTo: uuid2  |      | replyTo: uuid3  |      | replyTo: uuid3  | <--- (مثال پیچیده تر)
| rootTicketId:   |      | rootTicketId:   |      | rootTicketId:   |      | rootTicketId:   |      | rootTicketId:   |
|     uuid1       |      |     uuid1       |      |     uuid1       |      |     uuid1       |      |     uuid1       |
+-----------------+      +-----------------+      +-----------------+      +-----------------+      +-----------------+
       ^                                                                         |
       |-------------------------------------------------------------------------| (اینجا تیکت ۵ مستقیما ریپلای تیکت ۴ نیست،
                                                                                  بلکه ریپلای تیکت ۳ است، اما چون rootTicketId هر دو یکی است،
                                                                                  در یک مکالمه (تب) قرار می‌گیرند)


    */
