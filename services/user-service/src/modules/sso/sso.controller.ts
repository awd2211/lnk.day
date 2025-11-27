import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { SSOService } from './sso.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateSAMLConfigDto,
  CreateOIDCConfigDto,
  CreateLDAPConfigDto,
  UpdateSSOConfigDto,
} from './dto/sso.dto';

@ApiTags('sso')
@Controller('sso')
export class SSOController {
  constructor(private readonly ssoService: SSOService) {}

  // ========== Config Management ==========

  @Get('configs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 SSO 配置列表' })
  getConfigs(@Headers('x-team-id') teamId: string) {
    return this.ssoService.getConfigs(teamId);
  }

  @Get('configs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个 SSO 配置' })
  getConfig(
    @Headers('x-team-id') teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.getConfig(teamId, configId);
  }

  // ========== SAML ==========

  @Post('saml/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 SAML 配置' })
  createSAMLConfig(
    @Headers('x-team-id') teamId: string,
    @Body() dto: CreateSAMLConfigDto,
  ) {
    return this.ssoService.createSAMLConfig(teamId, dto);
  }

  @Get('saml/metadata')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 SAML SP 元数据' })
  getSAMLMetadata(@Headers('x-team-id') teamId: string) {
    return this.ssoService.getSAMLMetadata(teamId);
  }

  @Get('saml/:teamId/login')
  @ApiOperation({ summary: '发起 SAML 登录' })
  initiateSAMLLogin(@Param('teamId') teamId: string) {
    return this.ssoService.initiateSAMLLogin(teamId);
  }

  // ========== OIDC ==========

  @Post('oidc/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 OIDC 配置' })
  createOIDCConfig(
    @Headers('x-team-id') teamId: string,
    @Body() dto: CreateOIDCConfigDto,
  ) {
    return this.ssoService.createOIDCConfig(teamId, dto);
  }

  @Get('oidc/:teamId/login')
  @ApiOperation({ summary: '发起 OIDC 登录' })
  initiateOIDCLogin(@Param('teamId') teamId: string) {
    return this.ssoService.initiateOIDCLogin(teamId);
  }

  // ========== LDAP ==========

  @Post('ldap/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 LDAP 配置' })
  createLDAPConfig(
    @Headers('x-team-id') teamId: string,
    @Body() dto: CreateLDAPConfigDto,
  ) {
    return this.ssoService.createLDAPConfig(teamId, dto);
  }

  // ========== Common Operations ==========

  @Put('configs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新 SSO 配置' })
  updateConfig(
    @Headers('x-team-id') teamId: string,
    @Param('id') configId: string,
    @Body() dto: UpdateSSOConfigDto,
  ) {
    return this.ssoService.updateConfig(teamId, configId, dto);
  }

  @Post('configs/:id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '激活 SSO 配置' })
  activateConfig(
    @Headers('x-team-id') teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.activateConfig(teamId, configId);
  }

  @Post('configs/:id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '停用 SSO 配置' })
  deactivateConfig(
    @Headers('x-team-id') teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.deactivateConfig(teamId, configId);
  }

  @Delete('configs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 SSO 配置' })
  async deleteConfig(
    @Headers('x-team-id') teamId: string,
    @Param('id') configId: string,
  ) {
    await this.ssoService.deleteConfig(teamId, configId);
    return { message: 'SSO configuration deleted' };
  }

  @Post('configs/:id/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '测试 SSO 连接' })
  testConnection(
    @Headers('x-team-id') teamId: string,
    @Param('id') configId: string,
  ) {
    return this.ssoService.testConnection(teamId, configId);
  }
}
