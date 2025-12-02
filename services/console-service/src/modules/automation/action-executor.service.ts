import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ActionContext {
  workflowId: string;
  workflowName: string;
  triggerEvent?: string;
  eventData?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
}

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);
  private readonly serviceUrls: Record<string, string>;
  private readonly internalApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrls = {
      notification: configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
      link: configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
      user: configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
      webhook: configService.get('WEBHOOK_SERVICE_URL', 'http://localhost:60017'),
    };
    this.internalApiKey = configService.get('INTERNAL_API_KEY', 'internal-api-key');
  }

  async execute(
    action: { type: string; config: Record<string, any> },
    context: ActionContext,
  ): Promise<ActionResult> {
    this.logger.log(`Executing action: ${action.type} for workflow: ${context.workflowName}`);

    try {
      switch (action.type) {
        case 'send_email':
          return await this.sendEmail(action.config, context);
        case 'send_webhook':
          return await this.sendWebhook(action.config, context);
        case 'update_link':
          return await this.updateLink(action.config, context);
        case 'add_tag':
          return await this.addTag(action.config, context);
        case 'create_report':
          return await this.createReport(action.config, context);
        case 'notify_team':
          return await this.notifyTeam(action.config, context);
        case 'log_event':
          return await this.logEvent(action.config, context);
        case 'disable_link':
          return await this.disableLink(action.config, context);
        case 'send_slack':
          return await this.sendSlack(action.config, context);
        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error: any) {
      this.logger.error(`Action ${action.type} failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 发送邮件
   */
  private async sendEmail(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const { to, subject, template, variables } = config;

    // 替换变量占位符
    const resolvedVariables = this.resolveVariables(variables || {}, context);
    const resolvedSubject = this.resolveTemplate(subject, context);
    const resolvedTo = this.resolveRecipient(to, context);

    try {
      const response = await axios.post(
        `${this.serviceUrls.notification}/api/v1/notifications/send`,
        {
          channel: 'email',
          recipients: Array.isArray(resolvedTo) ? resolvedTo : [resolvedTo],
          template: template || 'automation_notification',
          subject: resolvedSubject,
          variables: resolvedVariables,
          metadata: {
            workflowId: context.workflowId,
            workflowName: context.workflowName,
            triggerEvent: context.triggerEvent,
          },
        },
        {
          headers: {
            'x-internal-api-key': this.internalApiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        output: { messageId: response.data?.id, recipients: resolvedTo },
      };
    } catch (error: any) {
      throw new Error(`Failed to send email: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 调用 Webhook
   */
  private async sendWebhook(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const { url, method = 'POST', headers = {}, body } = config;

    const resolvedBody = this.resolveVariables(body || {}, context);
    const payload = {
      ...resolvedBody,
      _automation: {
        workflowId: context.workflowId,
        workflowName: context.workflowName,
        triggerEvent: context.triggerEvent,
        timestamp: new Date().toISOString(),
      },
      _eventData: context.eventData,
    };

    try {
      const response = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data: payload,
        timeout: 30000, // 30 second timeout
      });

      return {
        success: true,
        output: {
          statusCode: response.status,
          responseData: response.data,
        },
      };
    } catch (error: any) {
      throw new Error(`Webhook failed: ${error.response?.status || 'N/A'} - ${error.message}`);
    }
  }

  /**
   * 更新链接
   */
  private async updateLink(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const linkId = config.linkId || context.eventData?.linkId;
    if (!linkId) {
      throw new Error('Link ID is required');
    }

    const updates: Record<string, any> = {};
    if (config.status) updates.status = config.status;
    if (config.expiresAt) updates.expiresAt = config.expiresAt;
    if (config.password) updates.password = config.password;
    if (config.maxClicks) updates.maxClicks = config.maxClicks;

    try {
      const response = await axios.patch(
        `${this.serviceUrls.link}/api/v1/internal/links/${linkId}`,
        updates,
        {
          headers: {
            'x-internal-api-key': this.internalApiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        output: { linkId, updates, result: response.data },
      };
    } catch (error: any) {
      throw new Error(`Failed to update link: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 添加标签
   */
  private async addTag(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const linkId = config.linkId || context.eventData?.linkId;
    const tags = config.tags || [];

    if (!linkId) {
      throw new Error('Link ID is required');
    }

    try {
      const response = await axios.post(
        `${this.serviceUrls.link}/api/v1/internal/links/${linkId}/tags`,
        { tags },
        {
          headers: {
            'x-internal-api-key': this.internalApiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        output: { linkId, tagsAdded: tags, result: response.data },
      };
    } catch (error: any) {
      throw new Error(`Failed to add tags: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 生成报告 (记录到审计日志)
   */
  private async createReport(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const { reportType, period, recipients } = config;

    // 报告生成是异步任务，这里只是触发
    this.logger.log(`Triggering report generation: ${reportType} for period ${period}`);

    // TODO: 可以发送到报告服务或分析服务
    return {
      success: true,
      output: {
        reportType,
        period,
        scheduledAt: new Date().toISOString(),
        recipients,
        status: 'scheduled',
      },
    };
  }

  /**
   * 通知团队
   */
  private async notifyTeam(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const { teamId, message, channels = ['email'] } = config;
    const resolvedTeamId = teamId || context.eventData?.teamId;

    if (!resolvedTeamId) {
      throw new Error('Team ID is required');
    }

    const resolvedMessage = this.resolveTemplate(message, context);

    try {
      // 获取团队成员
      const teamResponse = await axios.get(
        `${this.serviceUrls.user}/api/v1/internal/teams/${resolvedTeamId}/members`,
        {
          headers: { 'x-internal-api-key': this.internalApiKey },
        },
      );

      const members = teamResponse.data?.members || [];
      const emails = members.map((m: any) => m.email).filter(Boolean);

      if (emails.length === 0) {
        return {
          success: true,
          output: { message: 'No team members to notify' },
        };
      }

      // 发送通知
      if (channels.includes('email')) {
        await axios.post(
          `${this.serviceUrls.notification}/api/v1/notifications/send`,
          {
            channel: 'email',
            recipients: emails,
            template: 'team_notification',
            subject: `[${context.workflowName}] 自动化通知`,
            variables: {
              message: resolvedMessage,
              workflowName: context.workflowName,
              triggerEvent: context.triggerEvent,
            },
          },
          {
            headers: {
              'x-internal-api-key': this.internalApiKey,
              'Content-Type': 'application/json',
            },
          },
        );
      }

      return {
        success: true,
        output: { teamId: resolvedTeamId, notifiedCount: emails.length, channels },
      };
    } catch (error: any) {
      throw new Error(`Failed to notify team: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 记录事件日志
   */
  private async logEvent(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const { level = 'info', message, metadata = {} } = config;
    const resolvedMessage = this.resolveTemplate(message, context);

    const logEntry = {
      level,
      message: resolvedMessage,
      workflowId: context.workflowId,
      workflowName: context.workflowName,
      triggerEvent: context.triggerEvent,
      eventData: context.eventData,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // 记录到日志
    switch (level) {
      case 'error':
        this.logger.error(`[Automation] ${resolvedMessage}`, JSON.stringify(logEntry));
        break;
      case 'warn':
        this.logger.warn(`[Automation] ${resolvedMessage}`, JSON.stringify(logEntry));
        break;
      default:
        this.logger.log(`[Automation] ${resolvedMessage}`, JSON.stringify(logEntry));
    }

    return {
      success: true,
      output: logEntry,
    };
  }

  /**
   * 禁用链接 (安全响应)
   */
  private async disableLink(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const linkId = config.linkId || context.eventData?.linkId;
    const reason = config.reason || 'Disabled by automation workflow';

    if (!linkId) {
      throw new Error('Link ID is required');
    }

    try {
      const response = await axios.patch(
        `${this.serviceUrls.link}/api/v1/internal/links/${linkId}`,
        {
          status: 'disabled',
          disabledReason: reason,
          disabledAt: new Date().toISOString(),
          disabledBy: `automation:${context.workflowId}`,
        },
        {
          headers: {
            'x-internal-api-key': this.internalApiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        output: { linkId, reason, result: response.data },
      };
    } catch (error: any) {
      throw new Error(`Failed to disable link: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 发送 Slack 消息
   */
  private async sendSlack(
    config: Record<string, any>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const { webhookUrl, channel, message, attachments } = config;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }

    const resolvedMessage = this.resolveTemplate(message, context);

    try {
      const payload: Record<string, any> = {
        text: resolvedMessage,
      };

      if (channel) payload.channel = channel;
      if (attachments) payload.attachments = attachments;

      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      return {
        success: true,
        output: { channel, messageSent: true },
      };
    } catch (error: any) {
      throw new Error(`Failed to send Slack message: ${error.message}`);
    }
  }

  /**
   * 解析模板变量
   */
  private resolveTemplate(template: string, context: ActionContext): string {
    if (!template) return '';

    return template
      .replace(/\{\{workflowName\}\}/g, context.workflowName)
      .replace(/\{\{workflowId\}\}/g, context.workflowId)
      .replace(/\{\{triggerEvent\}\}/g, context.triggerEvent || '')
      .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
      .replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return context.eventData?.[key] ?? `{{${key}}}`;
      });
  }

  /**
   * 解析变量对象
   */
  private resolveVariables(
    variables: Record<string, any>,
    context: ActionContext,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveTemplate(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveVariables(value, context);
      } else {
        resolved[key] = value;
      }
    }

    // 添加上下文数据
    resolved._context = {
      workflowId: context.workflowId,
      workflowName: context.workflowName,
      triggerEvent: context.triggerEvent,
      eventData: context.eventData,
    };

    return resolved;
  }

  /**
   * 解析收件人
   */
  private resolveRecipient(to: string | string[], context: ActionContext): string | string[] {
    if (Array.isArray(to)) {
      return to.map((t) => this.resolveTemplate(t, context));
    }

    // 支持特殊占位符
    if (to === '{{user.email}}' && context.eventData?.userId) {
      return context.eventData.userEmail || to;
    }
    if (to === '{{team.admins}}' && context.eventData?.teamId) {
      // 这种情况需要查询团队管理员，返回占位符让上层处理
      return to;
    }

    return this.resolveTemplate(to, context);
  }
}
