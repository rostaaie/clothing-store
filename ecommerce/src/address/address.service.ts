import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Address } from './entities/address.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createAddressDto: CreateAddressDto, userId: number) {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const address = this.addressRepository.create({
      ...createAddressDto,
      user,
    });
    return await this.addressRepository.save(address);
  }

  async findAllByUser(userId: number): Promise<Address[]> {
    return await this.addressRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId?: number): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!address) throw new NotFoundException('آدرس یافت نشد');
    if (userId && address.user?.id !== userId) {
      throw new ForbiddenException('دسترسی به این آدرس مجاز نیست');
    }
    return address;
  }

  async update(
    id: number,
    updateAddressDto: UpdateAddressDto,
    userId: number,
  ): Promise<Address> {
    const address = await this.findOne(id, userId);
    Object.assign(address, updateAddressDto);
    return await this.addressRepository.save(address);
  }

  async remove(id: number, userId: number) {
    const address = await this.findOne(id, userId);
    await this.addressRepository.remove(address);
  }
}
