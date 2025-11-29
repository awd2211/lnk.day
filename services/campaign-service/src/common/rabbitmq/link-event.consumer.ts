import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as amqplib from 'amqplib';
import { RABBITMQ_CHANNEL, CAMPAIGN_LINK_EVENTS_QUEUE } from './rabbitmq.constants';
import { LinkCreatedEvent, LinkUpdatedEvent, LinkDeletedEvent } from '@lnk/shared-types';
import { Campaign } from '../../modules/campaign/entities/campaign.entity';
import { CampaignEventService } from './campaign-event.service';

type LinkEvent = LinkCreatedEvent | LinkUpdatedEvent | LinkDeletedEvent;

@Injectable()
export class LinkEventConsumer {
  private readonly logger = new Logger(LinkEventConsumer.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly campaignEventService: CampaignEventService,
  ) {}

  async startConsuming(): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available - cannot consume link events');
      return;
    }

    try {
      await this.channel.consume(
        CAMPAIGN_LINK_EVENTS_QUEUE,
        async (msg) => {
          if (msg) {
            await this.handleMessage(msg);
          }
        },
        { noAck: false },
      );

      this.logger.log('Started consuming link events');
    } catch (error: any) {
      this.logger.error(`Failed to start consuming: ${error.message}`);
    }
  }

  private async handleMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const event: LinkEvent = JSON.parse(content);

      this.logger.debug(`Received link event: ${event.type}`);

      switch (event.type) {
        case 'link.created':
          await this.handleLinkCreated(event as LinkCreatedEvent);
          break;
        case 'link.updated':
          await this.handleLinkUpdated(event as LinkUpdatedEvent);
          break;
        case 'link.deleted':
          await this.handleLinkDeleted(event as LinkDeletedEvent);
          break;
        default:
          this.logger.warn(`Unknown event type: ${(event as any).type}`);
      }

      // Acknowledge the message
      this.channel?.ack(msg);
    } catch (error: any) {
      this.logger.error(`Failed to process message: ${error.message}`);
      // Reject and don't requeue (dead letter)
      this.channel?.nack(msg, false, false);
    }
  }

  private async handleLinkCreated(event: LinkCreatedEvent): Promise<void> {
    const eventData = event.data as any;
    const { linkId, shortCode, campaignId, teamId } = eventData;

    if (!campaignId) {
      return; // 没有关联 campaign，跳过
    }

    try {
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
      });

      if (!campaign) {
        this.logger.warn(`Campaign ${campaignId} not found for link ${shortCode}`);
        return;
      }

      // 添加 linkId 到 campaign
      if (!campaign.linkIds.includes(linkId)) {
        campaign.linkIds = [...campaign.linkIds, linkId];
        campaign.totalLinks = campaign.linkIds.length;
        await this.campaignRepository.save(campaign);

        this.logger.log(
          `Link ${shortCode} added to campaign ${campaign.name} (total: ${campaign.totalLinks})`,
        );

        // 发布 campaign.link_added 事件
        await this.campaignEventService.publishCampaignLinkAdded({
          campaignId,
          linkId,
          shortCode,
          teamId: teamId || campaign.teamId,
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle link created: ${error.message}`);
      throw error;
    }
  }

  private async handleLinkUpdated(event: LinkUpdatedEvent): Promise<void> {
    const eventData = event.data as any;
    const { linkId, shortCode, changes } = eventData;

    // 检查是否更新了 campaignId
    if (!changes || !('campaignId' in changes)) {
      return;
    }

    const campaignChange = changes.campaignId;
    const newCampaignId = campaignChange?.new as string | null;
    const oldCampaignId = campaignChange?.old as string | null;

    try {
      // 从旧 campaign 移除
      if (oldCampaignId) {
        const oldCampaign = await this.campaignRepository.findOne({
          where: { id: oldCampaignId },
        });
        if (oldCampaign && oldCampaign.linkIds.includes(linkId)) {
          oldCampaign.linkIds = oldCampaign.linkIds.filter((id) => id !== linkId);
          oldCampaign.totalLinks = oldCampaign.linkIds.length;
          await this.campaignRepository.save(oldCampaign);
          this.logger.log(`Link ${shortCode} removed from campaign ${oldCampaign.name}`);
        }
      }

      // 添加到新 campaign
      if (newCampaignId) {
        const newCampaign = await this.campaignRepository.findOne({
          where: { id: newCampaignId },
        });
        if (newCampaign && !newCampaign.linkIds.includes(linkId)) {
          newCampaign.linkIds = [...newCampaign.linkIds, linkId];
          newCampaign.totalLinks = newCampaign.linkIds.length;
          await this.campaignRepository.save(newCampaign);
          this.logger.log(`Link ${shortCode} added to campaign ${newCampaign.name}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle link updated: ${error.message}`);
      throw error;
    }
  }

  private async handleLinkDeleted(event: LinkDeletedEvent): Promise<void> {
    const eventData = event.data as any;
    const { linkId, shortCode, campaignId } = eventData;

    if (!campaignId) {
      return;
    }

    try {
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
      });

      if (campaign && campaign.linkIds.includes(linkId)) {
        campaign.linkIds = campaign.linkIds.filter((id) => id !== linkId);
        campaign.totalLinks = campaign.linkIds.length;
        await this.campaignRepository.save(campaign);

        this.logger.log(
          `Link ${shortCode} removed from campaign ${campaign.name} (remaining: ${campaign.totalLinks})`,
        );

        // 发布 campaign.link_removed 事件
        await this.campaignEventService.publishCampaignLinkRemoved({
          campaignId,
          linkId,
          shortCode,
          teamId: campaign.teamId,
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle link deleted: ${error.message}`);
      throw error;
    }
  }
}
