import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailConfigService } from '../email/email-config.service';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly emailConfigService: EmailConfigService) {}

  @Post('reload')
  @ApiOperation({ summary: '重新加载配置' })
  async reloadConfig() {
    return this.emailConfigService.reloadConfig();
  }

  @Get('status')
  @ApiOperation({ summary: '获取配置状态' })
  getConfigStatus() {
    return {
      emailProvider: this.emailConfigService.getProvider(),
      configVersion: this.emailConfigService.getVersion(),
    };
  }
}
