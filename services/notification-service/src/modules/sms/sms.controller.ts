import { Controller, Post, Body, Get, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SmsService, SmsProvider } from './sms.service';

class SendSmsDto {
  to: string;
  body: string;
  from?: string;
  provider?: SmsProvider;
}

class VerificationCodeDto {
  to: string;
  code: string;
}

class MilestoneAlertDto {
  to: string;
  linkTitle: string;
  clicks: number;
}

class SecurityAlertDto {
  to: string;
  alertType: string;
  details: string;
}

class LinkDownAlertDto {
  to: string;
  linkTitle: string;
  shortUrl: string;
}

class WeeklyDigestDto {
  to: string;
  totalClicks: number;
  topLink: string;
  growth: string;
}

@ApiTags('sms')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an SMS message' })
  async sendSms(@Body() dto: SendSmsDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format (e.g., +14155552671)');
    }

    const result = await this.smsService.sendSms(dto);
    return result;
  }

  @Post('queue')
  @ApiOperation({ summary: 'Queue an SMS message for sending' })
  async queueSms(@Body() dto: SendSmsDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format. Use E.164 format');
    }

    await this.smsService.queueSms(dto);
    return { queued: true, to: dto.to };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Send verification code via SMS' })
  async sendVerificationCode(@Body() dto: VerificationCodeDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const result = await this.smsService.sendVerificationCode(dto.to, dto.code);
    return result;
  }

  @Post('notify/milestone')
  @ApiOperation({ summary: 'Send milestone alert via SMS' })
  async sendMilestoneAlert(@Body() dto: MilestoneAlertDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const result = await this.smsService.sendLinkMilestoneAlert(dto.to, dto.linkTitle, dto.clicks);
    return result;
  }

  @Post('notify/security')
  @ApiOperation({ summary: 'Send security alert via SMS' })
  async sendSecurityAlert(@Body() dto: SecurityAlertDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const result = await this.smsService.sendSecurityAlert(dto.to, dto.alertType, dto.details);
    return result;
  }

  @Post('notify/link-down')
  @ApiOperation({ summary: 'Send link down alert via SMS' })
  async sendLinkDownAlert(@Body() dto: LinkDownAlertDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const result = await this.smsService.sendLinkDownAlert(dto.to, dto.linkTitle, dto.shortUrl);
    return result;
  }

  @Post('notify/weekly-digest')
  @ApiOperation({ summary: 'Send weekly digest via SMS' })
  async sendWeeklyDigest(@Body() dto: WeeklyDigestDto) {
    if (!this.smsService.validatePhoneNumber(dto.to)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const result = await this.smsService.sendWeeklyDigest(dto.to, {
      totalClicks: dto.totalClicks,
      topLink: dto.topLink,
      growth: dto.growth,
    });
    return result;
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available SMS providers' })
  getProviders() {
    return {
      available: this.smsService.getAvailableProviders(),
    };
  }
}
