import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';

import {
  CustomDomain,
  DomainStatus,
  SSLStatus,
} from './entities/custom-domain.entity';
import { CreateDomainDto, UpdateDomainDto } from './dto/create-domain.dto';
import { DomainVerificationDto } from './dto/verify-domain.dto';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

@Injectable()
export class DomainService {
  private readonly targetCname: string;

  constructor(
    @InjectRepository(CustomDomain)
    private readonly domainRepository: Repository<CustomDomain>,
    private readonly configService: ConfigService,
  ) {
    this.targetCname = this.configService.get('TARGET_CNAME', 'cname.lnk.day');
  }

  async create(
    dto: CreateDomainDto,
    userId: string,
    teamId: string,
  ): Promise<CustomDomain> {
    // 检查域名是否已存在
    const existing = await this.domainRepository.findOne({
      where: { domain: dto.domain.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Domain already registered');
    }

    // 生成验证令牌
    const verificationToken = this.generateVerificationToken();

    const domain = this.domainRepository.create({
      domain: dto.domain.toLowerCase(),
      type: dto.type,
      settings: dto.settings,
      userId,
      teamId,
      verificationToken,
      verificationMethod: 'TXT',
      status: DomainStatus.PENDING,
      dnsRecords: [
        {
          type: 'TXT',
          name: `_lnkday-verify.${dto.domain.toLowerCase()}`,
          value: verificationToken,
        },
        {
          type: 'CNAME',
          name: dto.domain.toLowerCase(),
          value: this.targetCname,
        },
      ],
    });

    return this.domainRepository.save(domain);
  }

  async findAll(
    teamId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ domains: CustomDomain[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [domains, total] = await this.domainRepository.findAndCount({
      where: { teamId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { domains, total };
  }

  async findOne(id: string): Promise<CustomDomain> {
    const domain = await this.domainRepository.findOne({ where: { id } });
    if (!domain) {
      throw new NotFoundException(`Domain with ID ${id} not found`);
    }
    return domain;
  }

  async findByDomain(domainName: string): Promise<CustomDomain | null> {
    return this.domainRepository.findOne({
      where: { domain: domainName.toLowerCase() },
    });
  }

  async update(id: string, dto: UpdateDomainDto): Promise<CustomDomain> {
    const domain = await this.findOne(id);

    if (dto.type) {
      domain.type = dto.type;
    }

    if (dto.settings) {
      domain.settings = { ...domain.settings, ...dto.settings };
    }

    return this.domainRepository.save(domain);
  }

  async remove(id: string): Promise<void> {
    const domain = await this.findOne(id);
    await this.domainRepository.remove(domain);
  }

  async getVerificationStatus(id: string): Promise<DomainVerificationDto> {
    const domain = await this.findOne(id);

    const requiredRecords = [
      {
        type: 'TXT',
        name: `_lnkday-verify.${domain.domain}`,
        value: domain.verificationToken,
        description: '用于验证域名所有权的 TXT 记录',
      },
      {
        type: 'CNAME',
        name: domain.domain,
        value: this.targetCname,
        description: '指向 lnk.day 的 CNAME 记录',
      },
    ];

    let currentRecords: DomainVerificationDto['currentRecords'] = null;

    if (domain.lastCheckAt) {
      currentRecords = [];

      // 获取当前 DNS 记录
      try {
        const txtRecords = await this.getTxtRecords(`_lnkday-verify.${domain.domain}`);
        for (const txt of txtRecords) {
          currentRecords.push({
            type: 'TXT',
            name: `_lnkday-verify.${domain.domain}`,
            value: txt,
            valid: txt === domain.verificationToken,
          });
        }
      } catch (e) {
        // TXT 记录不存在
      }

      try {
        const cnameRecords = await this.getCnameRecords(domain.domain);
        for (const cname of cnameRecords) {
          currentRecords.push({
            type: 'CNAME',
            name: domain.domain,
            value: cname,
            valid: cname.toLowerCase() === this.targetCname.toLowerCase() ||
                   cname.toLowerCase() === `${this.targetCname}.`.toLowerCase(),
          });
        }
      } catch (e) {
        // CNAME 记录不存在
      }
    }

    return {
      domain: domain.domain,
      status: domain.status,
      isVerified: domain.isVerified,
      requiredRecords,
      currentRecords,
      lastCheckAt: domain.lastCheckAt,
      lastCheckError: domain.lastCheckError,
    };
  }

  async verifyDomain(id: string): Promise<{
    success: boolean;
    txtVerified: boolean;
    cnameVerified: boolean;
    message: string;
  }> {
    const domain = await this.findOne(id);

    domain.status = DomainStatus.VERIFYING;
    domain.lastCheckAt = new Date();
    domain.verificationAttempts += 1;

    let txtVerified = false;
    let cnameVerified = false;

    // 检查 TXT 记录
    try {
      const txtRecords = await this.getTxtRecords(`_lnkday-verify.${domain.domain}`);
      txtVerified = txtRecords.some((txt) => txt === domain.verificationToken);
    } catch (error: any) {
      domain.lastCheckError = `TXT verification failed: ${error.message}`;
    }

    // 检查 CNAME 记录
    try {
      const cnameRecords = await this.getCnameRecords(domain.domain);
      cnameVerified = cnameRecords.some(
        (cname) =>
          cname.toLowerCase() === this.targetCname.toLowerCase() ||
          cname.toLowerCase() === `${this.targetCname}.`.toLowerCase(),
      );
    } catch (error: any) {
      if (!domain.lastCheckError) {
        domain.lastCheckError = `CNAME verification failed: ${error.message}`;
      }
    }

    if (txtVerified && cnameVerified) {
      domain.status = DomainStatus.VERIFIED;
      domain.isVerified = true;
      domain.verifiedAt = new Date();
      domain.lastCheckError = null;

      // 触发 SSL 证书配置
      domain.sslStatus = SSLStatus.PENDING;
    } else if (txtVerified || cnameVerified) {
      domain.status = DomainStatus.PENDING;
      domain.lastCheckError = `Partial verification: TXT=${txtVerified}, CNAME=${cnameVerified}`;
    } else {
      domain.status = DomainStatus.FAILED;
    }

    await this.domainRepository.save(domain);

    return {
      success: txtVerified && cnameVerified,
      txtVerified,
      cnameVerified,
      message: domain.lastCheckError || 'Domain verified successfully',
    };
  }

  async activateDomain(id: string): Promise<CustomDomain> {
    const domain = await this.findOne(id);

    if (!domain.isVerified) {
      throw new BadRequestException('Domain must be verified before activation');
    }

    domain.status = DomainStatus.ACTIVE;
    domain.sslStatus = SSLStatus.ACTIVE;

    return this.domainRepository.save(domain);
  }

  async suspendDomain(id: string): Promise<CustomDomain> {
    const domain = await this.findOne(id);
    domain.status = DomainStatus.SUSPENDED;
    return this.domainRepository.save(domain);
  }

  async countByTeam(teamId: string): Promise<number> {
    return this.domainRepository.count({ where: { teamId } });
  }

  // ========== 私有方法 ==========

  private generateVerificationToken(): string {
    return `lnkday-verify-${crypto.randomBytes(16).toString('hex')}`;
  }

  private async getTxtRecords(hostname: string): Promise<string[]> {
    try {
      const records = await resolveTxt(hostname);
      return records.flat();
    } catch (error) {
      return [];
    }
  }

  private async getCnameRecords(hostname: string): Promise<string[]> {
    try {
      const records = await resolveCname(hostname);
      return records;
    } catch (error) {
      return [];
    }
  }
}
