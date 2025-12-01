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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiExcludeEndpoint, ApiHeader } from '@nestjs/swagger';
import { Response, Request } from 'express';

import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
  Public,
} from '@lnk/nestjs-common';
import { ShopifyService } from './shopify.service';

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
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  // ========== OAuth Endpoints ==========

  @Get('oauth/install')
  @Public()
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
  @Public()
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
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Shopify connection status' })
  async getConnection(@ScopedTeamId() teamId: string) {
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
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update Shopify integration settings' })
  async updateSettings(
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const connection = await this.shopifyService.updateSettings(teamId, dto);
    return { success: true, settings: connection.settings };
  }

  @Delete('disconnect')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Disconnect Shopify integration' })
  async disconnect(@ScopedTeamId() teamId: string) {
    await this.shopifyService.disconnect(teamId);
    return { success: true };
  }

  // ========== Products ==========

  @Get('products')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Shopify products' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page_info', required: false })
  async getProducts(
    @ScopedTeamId() teamId: string,
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
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get a specific product' })
  async getProduct(
    @ScopedTeamId() teamId: string,
    @Param('productId') productId: string,
  ) {
    return this.shopifyService.getProduct(teamId, parseInt(productId));
  }

  // ========== Orders ==========

  @Get('orders')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Shopify orders' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getOrders(
    @ScopedTeamId() teamId: string,
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
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get a specific order' })
  async getOrder(
    @ScopedTeamId() teamId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.shopifyService.getOrder(teamId, parseInt(orderId));
  }

  // ========== Link Generation ==========

  @Post('products/:productId/link')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Generate short link for a product' })
  async generateProductLink(
    @ScopedTeamId() teamId: string,
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
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Generate short links for multiple products' })
  async bulkGenerateLinks(
    @ScopedTeamId() teamId: string,
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
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get product metafields' })
  async getProductMetafields(
    @ScopedTeamId() teamId: string,
    @Param('productId') productId: string,
  ) {
    const metafields = await this.shopifyService.getProductMetafields(
      teamId,
      parseInt(productId),
    );
    return { metafields };
  }

  @Post('products/:productId/metafields')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Save product metafield' })
  async saveProductMetafield(
    @ScopedTeamId() teamId: string,
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
