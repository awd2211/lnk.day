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
  Res,
  Req,
  UseGuards,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response, Request } from 'express';

import { ShopifyService } from './shopify.service';

// Placeholder auth guard
class JwtAuthGuard {
  canActivate() {
    return true;
  }
}

// DTOs
class UpdateSettingsDto {
  autoCreateProductLinks?: boolean;
  linkPrefix?: string;
  includeSku?: boolean;
  trackOrders?: boolean;
  syncDiscounts?: boolean;
  defaultUtmSource?: string;
  defaultUtmMedium?: string;
}

class GenerateLinkDto {
  productId: number;
  variantId?: number;
  customAlias?: string;
}

class BulkGenerateLinksDto {
  productIds: number[];
}

@ApiTags('shopify')
@Controller('shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  // ========== OAuth Endpoints ==========

  @Get('oauth/install')
  @ApiOperation({ summary: 'Initiate Shopify OAuth flow' })
  initiateOAuth(
    @Query('teamId') teamId: string,
    @Query('shop') shop: string,
    @Res() res: Response,
  ) {
    if (!shop) {
      throw new BadRequestException('Shop domain is required');
    }

    const authUrl = this.shopifyService.generateAuthUrl(teamId, shop);
    return res.redirect(authUrl);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle Shopify OAuth callback' })
  async handleOAuthCallback(
    @Query('shop') shop: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('hmac') hmac: string,
    @Res() res: Response,
  ) {
    try {
      const connection = await this.shopifyService.handleOAuthCallback(
        shop,
        code,
        state,
        hmac,
      );

      return res.redirect(
        `/settings/integrations?shopify=connected&shop=${encodeURIComponent(connection.shopDomain)}`,
      );
    } catch (error) {
      return res.redirect(
        `/settings/integrations?shopify=error&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Get('connection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Shopify connection status' })
  async getConnection(@Headers('x-team-id') teamId: string) {
    const connection = await this.shopifyService.getConnection(teamId);

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      shopDomain: connection.shopDomain,
      shopName: connection.shopName,
      currency: connection.currency,
      installedAt: connection.installedAt,
      lastSyncAt: connection.lastSyncAt,
      linkedProductsCount: connection.linkedProductsCount,
      settings: connection.settings,
    };
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Shopify integration settings' })
  async updateSettings(
    @Headers('x-team-id') teamId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const connection = await this.shopifyService.updateSettings(teamId, dto);
    return { success: true, settings: connection.settings };
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Shopify integration' })
  async disconnect(@Headers('x-team-id') teamId: string) {
    await this.shopifyService.disconnect(teamId);
    return { success: true };
  }

  // ========== Products ==========

  @Get('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Shopify products' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page_info', required: false })
  async getProducts(
    @Headers('x-team-id') teamId: string,
    @Query('limit') limit?: string,
    @Query('page_info') pageInfo?: string,
  ) {
    return this.shopifyService.getProducts(
      teamId,
      limit ? parseInt(limit) : 50,
      pageInfo,
    );
  }

  @Get('products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific product' })
  async getProduct(
    @Headers('x-team-id') teamId: string,
    @Param('productId') productId: string,
  ) {
    return this.shopifyService.getProduct(teamId, parseInt(productId));
  }

  // ========== Orders ==========

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Shopify orders' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getOrders(
    @Headers('x-team-id') teamId: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const orders = await this.shopifyService.getOrders(
      teamId,
      limit ? parseInt(limit) : 50,
      status || 'any',
    );
    return { orders };
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific order' })
  async getOrder(
    @Headers('x-team-id') teamId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.shopifyService.getOrder(teamId, parseInt(orderId));
  }

  // ========== Link Generation ==========

  @Post('products/:productId/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate short link for a product' })
  async generateProductLink(
    @Headers('x-team-id') teamId: string,
    @Param('productId') productId: string,
    @Body() dto: GenerateLinkDto,
  ) {
    return this.shopifyService.generateProductLink(
      teamId,
      parseInt(productId),
      dto.variantId,
      dto.customAlias,
    );
  }

  @Post('products/bulk-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate short links for multiple products' })
  async bulkGenerateLinks(
    @Headers('x-team-id') teamId: string,
    @Body() dto: BulkGenerateLinksDto,
  ) {
    const results = await this.shopifyService.bulkGenerateProductLinks(
      teamId,
      dto.productIds,
    );
    return {
      results,
      success: results.filter((r) => !r.error).length,
      failed: results.filter((r) => r.error).length,
    };
  }

  // ========== Metafields ==========

  @Get('products/:productId/metafields')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product metafields' })
  async getProductMetafields(
    @Headers('x-team-id') teamId: string,
    @Param('productId') productId: string,
  ) {
    const metafields = await this.shopifyService.getProductMetafields(
      teamId,
      parseInt(productId),
    );
    return { metafields };
  }

  @Post('products/:productId/metafields')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save product metafield' })
  async saveProductMetafield(
    @Headers('x-team-id') teamId: string,
    @Param('productId') productId: string,
    @Body() body: { key: string; value: string },
  ) {
    await this.shopifyService.saveProductMetafield(
      teamId,
      parseInt(productId),
      body.key,
      body.value,
    );
    return { success: true };
  }

  // ========== Webhooks ==========

  @Post('webhooks/products/create')
  @ApiExcludeEndpoint()
  async handleProductCreate(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() product: any,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(product);
    if (!this.shopifyService.verifyWebhook(rawBody, hmac)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.shopifyService.handleProductCreate(shopDomain, product);
    return { ok: true };
  }

  @Post('webhooks/products/update')
  @ApiExcludeEndpoint()
  async handleProductUpdate(
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() product: any,
  ) {
    // Handle product update if needed
    return { ok: true };
  }

  @Post('webhooks/products/delete')
  @ApiExcludeEndpoint()
  async handleProductDelete(
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() body: { id: number },
  ) {
    // Handle product deletion if needed
    return { ok: true };
  }

  @Post('webhooks/orders/create')
  @ApiExcludeEndpoint()
  async handleOrderCreate(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() order: any,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(order);
    if (!this.shopifyService.verifyWebhook(rawBody, hmac)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.shopifyService.handleOrderCreate(shopDomain, order);
    return { ok: true };
  }

  @Post('webhooks/orders/paid')
  @ApiExcludeEndpoint()
  async handleOrderPaid(
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() order: any,
  ) {
    // Handle paid order if needed
    return { ok: true };
  }

  @Post('webhooks/app/uninstalled')
  @ApiExcludeEndpoint()
  async handleAppUninstalled(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
  ) {
    await this.shopifyService.handleAppUninstalled(shopDomain);
    return { ok: true };
  }
}
