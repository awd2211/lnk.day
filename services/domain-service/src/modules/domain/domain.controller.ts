import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { DomainService } from './domain.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateDomainDto, UpdateDomainDto } from './dto/create-domain.dto';
import { CustomDomain } from './entities/custom-domain.entity';

@ApiTags('domains')
@Controller('domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Post()
  @ApiOperation({ summary: '添加自定义域名' })
  @ApiResponse({ status: 201, type: CustomDomain })
  async create(
    @Body() dto: CreateDomainDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<CustomDomain> {
    return this.domainService.create(dto, userId, teamId || userId);
  }

  @Get()
  @ApiOperation({ summary: '获取域名列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ domains: CustomDomain[]; total: number }> {
    return this.domainService.findAll(teamId || userId, { page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取域名详情' })
  async findOne(@Param('id') id: string): Promise<CustomDomain> {
    return this.domainService.findOne(id);
  }

  @Get(':id/verification')
  @ApiOperation({ summary: '获取域名验证状态和所需 DNS 记录' })
  async getVerificationStatus(@Param('id') id: string) {
    return this.domainService.getVerificationStatus(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: '触发域名验证' })
  async verifyDomain(@Param('id') id: string) {
    return this.domainService.verifyDomain(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: '激活域名（需要先验证通过）' })
  async activateDomain(@Param('id') id: string): Promise<CustomDomain> {
    return this.domainService.activateDomain(id);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: '暂停域名' })
  async suspendDomain(@Param('id') id: string): Promise<CustomDomain> {
    return this.domainService.suspendDomain(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新域名设置' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
  ): Promise<CustomDomain> {
    return this.domainService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除域名' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.domainService.remove(id);
    return { message: 'Domain deleted successfully' };
  }

  @Get('check/:domain')
  @ApiOperation({ summary: '检查域名是否可用' })
  async checkAvailability(@Param('domain') domain: string) {
    const existing = await this.domainService.findByDomain(domain);
    return {
      domain,
      available: !existing,
      registered: !!existing,
    };
  }
}
