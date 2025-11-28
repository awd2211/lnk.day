import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { ShopifyConnection } from './entities/shopify-connection.entity';

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  line_items: Array<{
    id: number;
    product_id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
  created_at: string;
}

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly scopes: string;
  private readonly appUrl: string;

  // OAuth state storage
  private oauthStates = new Map<string, { teamId: string; shop: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ShopifyConnection)
    private readonly connectionRepo: Repository<ShopifyConnection>,
  ) {
    this.apiKey = this.configService.get<string>('SHOPIFY_API_KEY');
    this.apiSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
    this.scopes = this.configService.get<string>(
      'SHOPIFY_SCOPES',
      'read_products,write_products,read_orders,read_inventory,read_customers',
    );
    this.appUrl = this.configService.get<string>('APP_URL', 'https://app.lnk.day');
  }

  // ========== OAuth ==========

  generateAuthUrl(teamId: string, shop: string): string {
    // Normalize shop domain
    const shopDomain = this.normalizeShopDomain(shop);
    const state = crypto.randomBytes(16).toString('hex');

    this.oauthStates.set(state, {
      teamId,
      shop: shopDomain,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const redirectUri = `${this.appUrl}/api/shopify/oauth/callback`;

    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: redirectUri,
      state,
    });

    return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(
    shop: string,
    code: string,
    state: string,
    hmac: string,
  ): Promise<ShopifyConnection> {
    const stateData = this.oauthStates.get(state);
    if (!stateData) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    this.oauthStates.delete(state);

    const shopDomain = this.normalizeShopDomain(shop);

    // Exchange code for access token
    const tokenResponse = await this.exchangeCodeForToken(shopDomain, code);

    // Get shop info
    const shopInfo = await this.getShopInfo(shopDomain, tokenResponse.access_token);

    // Save connection
    const connection = await this.saveConnection(
      stateData.teamId,
      shopDomain,
      tokenResponse.access_token,
      tokenResponse.scope.split(','),
      shopInfo,
    );

    // Register webhooks
    await this.registerWebhooks(connection);

    return connection;
  }

  private async exchangeCodeForToken(
    shop: string,
    code: string,
  ): Promise<{ access_token: string; scope: string }> {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Shopify OAuth failed: ${error}`);
    }

    return response.json();
  }

  private async getShopInfo(shop: string, accessToken: string): Promise<any> {
    const response = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get shop info');
    }

    const data = await response.json();
    return data.shop;
  }

  private async saveConnection(
    teamId: string,
    shopDomain: string,
    accessToken: string,
    scopes: string[],
    shopInfo: any,
  ): Promise<ShopifyConnection> {
    let connection = await this.connectionRepo.findOne({ where: { shopDomain } });

    if (connection) {
      connection.teamId = teamId;
      connection.accessToken = accessToken;
      connection.scopes = scopes;
      connection.shopName = shopInfo.name;
      connection.shopEmail = shopInfo.email;
      connection.currency = shopInfo.currency;
      connection.isActive = true;
    } else {
      connection = this.connectionRepo.create({
        teamId,
        shopDomain,
        accessToken,
        scopes,
        shopName: shopInfo.name,
        shopEmail: shopInfo.email,
        currency: shopInfo.currency,
        settings: {
          autoCreateProductLinks: false,
          linkPrefix: 'shop',
          includeSku: true,
          trackOrders: true,
          defaultUtmSource: 'shopify',
          defaultUtmMedium: 'product_link',
        },
      });
    }

    return this.connectionRepo.save(connection);
  }

  private normalizeShopDomain(shop: string): string {
    // Remove protocol if present
    shop = shop.replace(/^https?:\/\//, '');
    // Add myshopify.com if not present
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`;
    }
    return shop.toLowerCase();
  }

  // ========== Connection Management ==========

  async getConnection(teamId: string): Promise<ShopifyConnection | null> {
    return this.connectionRepo.findOne({ where: { teamId, isActive: true } });
  }

  async getConnectionByShop(shopDomain: string): Promise<ShopifyConnection | null> {
    return this.connectionRepo.findOne({
      where: { shopDomain: this.normalizeShopDomain(shopDomain), isActive: true },
    });
  }

  async disconnect(teamId: string): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (connection) {
      connection.isActive = false;
      await this.connectionRepo.save(connection);
    }
  }

  async updateSettings(
    teamId: string,
    settings: Partial<ShopifyConnection['settings']>,
  ): Promise<ShopifyConnection> {
    const connection = await this.getConnection(teamId);
    if (!connection) {
      throw new NotFoundException('Shopify connection not found');
    }

    connection.settings = { ...connection.settings, ...settings };
    return this.connectionRepo.save(connection);
  }

  // ========== API Helper ==========

  private async shopifyRequest<T>(
    connection: ShopifyConnection,
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const url = `https://${connection.shopDomain}/admin/api/2024-01${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'X-Shopify-Access-Token': connection.accessToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Shopify API error: ${error}`);
      throw new BadRequestException(`Shopify API error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ========== Products ==========

  async getProducts(
    teamId: string,
    limit: number = 50,
    pageInfo?: string,
  ): Promise<{ products: ShopifyProduct[]; pageInfo?: string }> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    let endpoint = `/products.json?limit=${limit}`;
    if (pageInfo) {
      endpoint += `&page_info=${pageInfo}`;
    }

    const result = await this.shopifyRequest<{ products: ShopifyProduct[] }>(
      connection,
      'GET',
      endpoint,
    );

    return { products: result.products };
  }

  async getProduct(teamId: string, productId: number): Promise<ShopifyProduct> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    const result = await this.shopifyRequest<{ product: ShopifyProduct }>(
      connection,
      'GET',
      `/products/${productId}.json`,
    );

    return result.product;
  }

  async getProductByHandle(teamId: string, handle: string): Promise<ShopifyProduct | null> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    const result = await this.shopifyRequest<{ products: ShopifyProduct[] }>(
      connection,
      'GET',
      `/products.json?handle=${handle}`,
    );

    return result.products[0] || null;
  }

  // ========== Orders ==========

  async getOrders(
    teamId: string,
    limit: number = 50,
    status: string = 'any',
  ): Promise<ShopifyOrder[]> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    const result = await this.shopifyRequest<{ orders: ShopifyOrder[] }>(
      connection,
      'GET',
      `/orders.json?limit=${limit}&status=${status}`,
    );

    return result.orders;
  }

  async getOrder(teamId: string, orderId: number): Promise<ShopifyOrder> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    const result = await this.shopifyRequest<{ order: ShopifyOrder }>(
      connection,
      'GET',
      `/orders/${orderId}.json`,
    );

    return result.order;
  }

  // ========== Product Link Generation ==========

  async generateProductLink(
    teamId: string,
    productId: number,
    variantId?: number,
    customAlias?: string,
  ): Promise<{ linkId: string; shortUrl: string }> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    const product = await this.getProduct(teamId, productId);

    // Build the original URL
    let originalUrl = `https://${connection.shopDomain}/products/${product.handle}`;
    if (variantId) {
      originalUrl += `?variant=${variantId}`;
    }

    // Add UTM parameters if configured
    const utmParams = new URLSearchParams();
    if (connection.settings.defaultUtmSource) {
      utmParams.set('utm_source', connection.settings.defaultUtmSource);
    }
    if (connection.settings.defaultUtmMedium) {
      utmParams.set('utm_medium', connection.settings.defaultUtmMedium);
    }
    utmParams.set('utm_campaign', `product_${productId}`);

    if (utmParams.toString()) {
      originalUrl += (originalUrl.includes('?') ? '&' : '?') + utmParams.toString();
    }

    // Generate alias
    let alias = customAlias;
    if (!alias && connection.settings.linkPrefix) {
      alias = `${connection.settings.linkPrefix}-${product.handle}`;
      if (variantId && connection.settings.includeSku) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant?.sku) {
          alias += `-${variant.sku}`;
        }
      }
    }

    // Call link service to create the link (in production, use internal HTTP call)
    // For now, return mock data
    return {
      linkId: `link_${Date.now()}`,
      shortUrl: `https://lnk.day/${alias || product.handle}`,
    };
  }

  async bulkGenerateProductLinks(
    teamId: string,
    productIds: number[],
  ): Promise<Array<{ productId: number; linkId: string; shortUrl: string; error?: string }>> {
    const results = [];

    for (const productId of productIds) {
      try {
        const link = await this.generateProductLink(teamId, productId);
        results.push({ productId, ...link });
      } catch (error) {
        results.push({ productId, linkId: '', shortUrl: '', error: error.message });
      }
    }

    return results;
  }

  // ========== Metafields ==========

  async saveProductMetafield(
    teamId: string,
    productId: number,
    key: string,
    value: string,
  ): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    await this.shopifyRequest(
      connection,
      'POST',
      `/products/${productId}/metafields.json`,
      {
        metafield: {
          namespace: 'lnk_day',
          key,
          value,
          type: 'single_line_text_field',
        },
      },
    );
  }

  async getProductMetafields(teamId: string, productId: number): Promise<any[]> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Shopify not connected');

    const result = await this.shopifyRequest<{ metafields: any[] }>(
      connection,
      'GET',
      `/products/${productId}/metafields.json?namespace=lnk_day`,
    );

    return result.metafields;
  }

  // ========== Webhooks ==========

  async registerWebhooks(connection: ShopifyConnection): Promise<void> {
    const webhooks = [
      { topic: 'products/create', address: `${this.appUrl}/api/shopify/webhooks/products/create` },
      { topic: 'products/update', address: `${this.appUrl}/api/shopify/webhooks/products/update` },
      { topic: 'products/delete', address: `${this.appUrl}/api/shopify/webhooks/products/delete` },
      { topic: 'orders/create', address: `${this.appUrl}/api/shopify/webhooks/orders/create` },
      { topic: 'orders/paid', address: `${this.appUrl}/api/shopify/webhooks/orders/paid` },
      { topic: 'app/uninstalled', address: `${this.appUrl}/api/shopify/webhooks/app/uninstalled` },
    ];

    const webhookIds: Record<string, string> = {};

    for (const webhook of webhooks) {
      try {
        const result = await this.shopifyRequest<{ webhook: { id: number } }>(
          connection,
          'POST',
          '/webhooks.json',
          { webhook },
        );
        const key = webhook.topic.replace('/', '_').replace('/', '_');
        webhookIds[key] = String(result.webhook.id);
      } catch (error) {
        this.logger.warn(`Failed to register webhook ${webhook.topic}: ${error.message}`);
      }
    }

    connection.webhookIds = webhookIds;
    await this.connectionRepo.save(connection);
  }

  async handleProductCreate(shopDomain: string, product: ShopifyProduct): Promise<void> {
    const connection = await this.getConnectionByShop(shopDomain);
    if (!connection || !connection.settings.autoCreateProductLinks) return;

    await this.generateProductLink(connection.teamId, product.id);
    this.logger.log(`Auto-created link for product ${product.id}`);
  }

  async handleOrderCreate(shopDomain: string, order: ShopifyOrder): Promise<void> {
    const connection = await this.getConnectionByShop(shopDomain);
    if (!connection || !connection.settings.trackOrders) return;

    // Log order analytics
    this.logger.log(`Order ${order.name} created for shop ${shopDomain}`);
  }

  async handleAppUninstalled(shopDomain: string): Promise<void> {
    const connection = await this.getConnectionByShop(shopDomain);
    if (connection) {
      connection.isActive = false;
      await this.connectionRepo.save(connection);
      this.logger.log(`Shopify app uninstalled for ${shopDomain}`);
    }
  }

  // ========== Webhook Verification ==========

  verifyWebhook(rawBody: string, hmacHeader: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.apiSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hmacHeader),
    );
  }
}
