import { Controller, Get, Post, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeepLinkService } from './deeplink.service';

@ApiTags('deeplinks')
@Controller('deeplinks')
@ApiBearerAuth()
export class DeepLinkController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @Post()
  @ApiOperation({ summary: '创建深度链接配置' })
  create(@Body() data: any) {
    return this.deepLinkService.create(data);
  }

  @Get('link/:linkId')
  @ApiOperation({ summary: '通过linkId获取深度链接配置' })
  findByLinkId(@Param('linkId') linkId: string) {
    return this.deepLinkService.findByLinkId(linkId);
  }

  @Get('resolve/:linkId')
  @ApiOperation({ summary: '解析深度链接跳转URL' })
  async resolveUrl(
    @Param('linkId') linkId: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const deepLink = await this.deepLinkService.findByLinkId(linkId);
    if (!deepLink) {
      return { url: null };
    }
    const url = this.deepLinkService.resolveRedirectUrl(deepLink, userAgent);
    return { url };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新深度链接配置' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.deepLinkService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除深度链接配置' })
  remove(@Param('id') id: string) {
    return this.deepLinkService.remove(id);
  }
}
