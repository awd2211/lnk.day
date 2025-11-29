import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lnk/nestjs-common';

import { GS1Service, GS1ParseResult, GS1DigitalLink } from './gs1.service';
import {
  ParseDigitalLinkDto,
  ParseBarcodeDto,
  GenerateDigitalLinkDto,
  ValidateGTINDto,
  GS1ParseResultDto,
  GS1DigitalLinkDto,
  ValidateGTINResultDto,
  AIDefinitionDto,
} from './dto/gs1.dto';

@ApiTags('gs1')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gs1')
export class GS1Controller {
  constructor(private readonly gs1Service: GS1Service) {}

  @Post('parse/digital-link')
  @ApiOperation({
    summary: '解析 GS1 Digital Link URL',
    description: '解析 GS1 Digital Link URL 并提取所有 Application Identifiers',
  })
  @ApiResponse({ status: 200, type: GS1ParseResultDto })
  parseDigitalLink(@Body() dto: ParseDigitalLinkDto): GS1ParseResult {
    return this.gs1Service.parseDigitalLink(dto.url);
  }

  @Get('parse/digital-link')
  @ApiOperation({
    summary: '解析 GS1 Digital Link URL (GET)',
    description: '通过 URL 参数解析 GS1 Digital Link',
  })
  @ApiQuery({ name: 'url', description: 'GS1 Digital Link URL to parse' })
  @ApiResponse({ status: 200, type: GS1ParseResultDto })
  parseDigitalLinkGet(@Query('url') url: string): GS1ParseResult {
    return this.gs1Service.parseDigitalLink(url);
  }

  @Post('parse/barcode')
  @ApiOperation({
    summary: '解析 GS1-128 条码数据',
    description: '从 GS1-128 条码扫描数据中提取 Application Identifiers',
  })
  @ApiResponse({ status: 200, type: GS1ParseResultDto })
  parseBarcode(@Body() dto: ParseBarcodeDto): GS1ParseResult {
    return this.gs1Service.parseGS1Barcode(dto.barcodeData);
  }

  @Post('generate')
  @ApiOperation({
    summary: '生成 GS1 Digital Link',
    description: '根据 GTIN 和其他可选标识符生成 GS1 Digital Link URL',
  })
  @ApiResponse({ status: 200, type: GS1DigitalLinkDto })
  @ApiResponse({ status: 400, description: 'Invalid GTIN format' })
  generateDigitalLink(@Body() dto: GenerateDigitalLinkDto): GS1DigitalLink {
    return this.gs1Service.generateDigitalLink(dto.domain, dto.gtin, dto.options);
  }

  @Post('validate/gtin')
  @ApiOperation({
    summary: '验证 GTIN 校验位',
    description: '验证 GTIN (8/12/13/14 位) 的校验位是否正确',
  })
  @ApiResponse({ status: 200, type: ValidateGTINResultDto })
  validateGTIN(@Body() dto: ValidateGTINDto): ValidateGTINResultDto {
    const valid = this.gs1Service.validateGTIN(dto.gtin);
    return {
      gtin: dto.gtin,
      valid,
      error: valid ? undefined : 'Invalid GTIN check digit',
    };
  }

  @Get('validate/gtin')
  @ApiOperation({
    summary: '验证 GTIN 校验位 (GET)',
    description: '通过 URL 参数验证 GTIN',
  })
  @ApiQuery({ name: 'gtin', description: 'GTIN to validate' })
  @ApiResponse({ status: 200, type: ValidateGTINResultDto })
  validateGTINGet(@Query('gtin') gtin: string): ValidateGTINResultDto {
    const valid = this.gs1Service.validateGTIN(gtin);
    return {
      gtin,
      valid,
      error: valid ? undefined : 'Invalid GTIN check digit',
    };
  }

  @Get('ai-definitions')
  @ApiOperation({
    summary: '获取 AI 定义列表',
    description: '获取所有支持的 GS1 Application Identifier 定义',
  })
  @ApiResponse({ status: 200, type: Object })
  getAIDefinitions(): Record<string, AIDefinitionDto> {
    return this.gs1Service.getAIDefinitions();
  }
}
