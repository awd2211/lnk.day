import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin || !admin.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    return {
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin ${id} not found`);
    return admin;
  }

  async create(data: Partial<Admin>): Promise<Admin> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = this.adminRepository.create({ ...data, password: hashedPassword });
    return this.adminRepository.save(admin);
  }

  async update(id: string, data: Partial<Admin>): Promise<Admin> {
    const admin = await this.findOne(id);
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    Object.assign(admin, data);
    return this.adminRepository.save(admin);
  }

  async remove(id: string): Promise<void> {
    const admin = await this.findOne(id);
    await this.adminRepository.remove(admin);
  }
}
