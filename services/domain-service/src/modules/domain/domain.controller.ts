import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { DomainService } from './domain.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';
import { CreateDomainDto, UpdateDomainDto } from './dto/create-domain.dto';
import { CustomDomain } from './entities/custom-domain.entity';

@ApiTags('domains')
@Controller('domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Post()
  @RequirePermissions(Permission.DOMAINS_ADD)
  @ApiOperation({ summary: '添加自定义域名' })
  @ApiResponse({ status: 201, type: CustomDomain })
  async create(
    @Body() dto: CreateDomainDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<CustomDomain> {
    return this.domainService.create(dto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.DOMAINS_VIEW)
  @ApiOperation({ summary: '获取域名列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ domains: CustomDomain[]; total: number }> {
    return this.domainService.findAll(teamId, { page, limit });
  }

  @Get('check/:domain')
  @RequirePermissions(Permission.DOMAINS_VIEW)
  @ApiOperation({ summary: '检查域名是否可用' })
  @ApiParam({ name: 'domain', type: String })
  async checkAvailability(@Param('domain') domain: string) {
    const existing = await this.domainService.findByDomain(domain);
    return {
      domain,
      available: !existing,
      registered: !!existing,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.DOMAINS_VIEW)
  @ApiOperation({ summary: '获取域名详情' })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomDomain> {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权访问此域名');
    }
    return domain;
  }

  @Get(':id/verification')
  @RequirePermissions(Permission.DOMAINS_VIEW)
  @ApiOperation({ summary: '获取域名验证状态和所需 DNS 记录' })
  @ApiParam({ name: 'id', type: String })
  async getVerificationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权访问此域名');
    }
    return this.domainService.getVerificationStatus(id);
  }

  @Post(':id/verify')
  @RequirePermissions(Permission.DOMAINS_CONFIGURE)
  @ApiOperation({ summary: '触发域名验证' })
  @ApiParam({ name: 'id', type: String })
  async verifyDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权操作此域名');
    }
    return this.domainService.verifyDomain(id);
  }

  @Post(':id/activate')
  @RequirePermissions(Permission.DOMAINS_CONFIGURE)
  @ApiOperation({ summary: '激活域名（需要先验证通过）' })
  @ApiParam({ name: 'id', type: String })
  async activateDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomDomain> {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权操作此域名');
    }
    return this.domainService.activateDomain(id);
  }

  @Post(':id/suspend')
  @RequirePermissions(Permission.DOMAINS_CONFIGURE)
  @ApiOperation({ summary: '暂停域名' })
  @ApiParam({ name: 'id', type: String })
  async suspendDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomDomain> {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权操作此域名');
    }
    return this.domainService.suspendDomain(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.DOMAINS_CONFIGURE)
  @ApiOperation({ summary: '更新域名设置' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDomainDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomDomain> {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权修改此域名');
    }
    return this.domainService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DOMAINS_REMOVE)
  @ApiOperation({ summary: '删除域名' })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const domain = await this.domainService.findOne(id);
    if (!isPlatformAdmin(user) && domain.teamId !== teamId) {
      throw new ForbiddenException('无权删除此域名');
    }
    await this.domainService.remove(id);
    return { message: 'Domain deleted successfully' };
  }
}
