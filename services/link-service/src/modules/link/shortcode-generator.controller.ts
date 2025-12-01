import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
} from '@lnk/nestjs-common';
import {
  ShortCodeGeneratorService,
  ShortCodeStrategy,
} from './shortcode-generator.service';

interface GenerateShortCodeDto {
  strategy?: ShortCodeStrategy;
  length?: number;
  prefix?: string;
  suffix?: string;
  charset?: string;
  pattern?: string;
  urlForHash?: string;
  count?: number;
}

@ApiTags('shortcode')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('shortcode')
export class ShortCodeGeneratorController {
  constructor(
    private readonly shortCodeGeneratorService: ShortCodeGeneratorService,
  ) {}

  @Post('generate')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '生成短码' })
  async generate(@Body() dto: GenerateShortCodeDto) {
    if (dto.count && dto.count > 1) {
      const codes = await this.shortCodeGeneratorService.bulkGenerate(
        Math.min(dto.count, 100),
        dto,
      );
      return { codes };
    }

    const code = await this.shortCodeGeneratorService.generate(dto);
    return { code };
  }

  @Get('check')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '检查短码可用性' })
  @ApiQuery({ name: 'code', required: true, description: '要检查的短码' })
  async checkAvailability(@Query('code') code: string) {
    return this.shortCodeGeneratorService.checkAvailability(code);
  }

  @Get('validate')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '验证短码格式' })
  @ApiQuery({ name: 'code', required: true, description: '要验证的短码' })
  async validate(@Query('code') code: string) {
    return this.shortCodeGeneratorService.validate(code);
  }

  @Get('suggestions')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取短码建议' })
  @ApiQuery({ name: 'url', required: false, description: '目标 URL (用于智能建议)' })
  @ApiQuery({ name: 'count', required: false, description: '建议数量 (默认 5)' })
  async getSuggestions(
    @Query('url') url?: string,
    @Query('count') count?: string,
  ) {
    const num = count ? Math.min(parseInt(count, 10), 10) : 5;

    if (url) {
      const suggestions = await this.shortCodeGeneratorService.getSmartSuggestions(
        url,
        num,
      );
      return { suggestions, source: 'smart' };
    }

    const suggestions = await this.shortCodeGeneratorService.getSuggestions(num);
    return { suggestions, source: 'random' };
  }

  @Get('strategies')
  @ApiOperation({ summary: '获取可用的生成策略' })
  getStrategies() {
    return {
      strategies: [
        {
          name: ShortCodeStrategy.RANDOM,
          description: '纯随机字符组合，安全性最高',
          example: 'aB3xK9m',
        },
        {
          name: ShortCodeStrategy.PRONOUNCEABLE,
          description: '可发音的字符组合，便于口头分享',
          example: 'bikela',
        },
        {
          name: ShortCodeStrategy.BRANDED,
          description: '带品牌前缀的短码',
          example: 'brand-x7k9',
        },
        {
          name: ShortCodeStrategy.MEMORABLE,
          description: '易记忆的单词+数字组合',
          example: 'fox42',
        },
        {
          name: ShortCodeStrategy.SEQUENTIAL,
          description: '顺序递增的 Base62 编码',
          example: 'FxZ1k',
        },
        {
          name: ShortCodeStrategy.HASH_BASED,
          description: '基于 URL 内容的 Hash 值',
          example: 'k9mX3a',
        },
        {
          name: ShortCodeStrategy.CUSTOM_PATTERN,
          description: '自定义模式 (A=字母, N=数字, X=任意)',
          example: 'ABC-123',
        },
      ],
    };
  }

  @Post('bulk-generate')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '批量生成短码' })
  async bulkGenerate(
    @Body()
    dto: {
      count: number;
      strategy?: ShortCodeStrategy;
      length?: number;
      prefix?: string;
    },
  ) {
    const count = Math.min(dto.count || 10, 100);
    const codes = await this.shortCodeGeneratorService.bulkGenerate(count, dto);
    return { codes, count: codes.length };
  }
}
