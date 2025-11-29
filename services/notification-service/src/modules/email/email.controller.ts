import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: '发送邮件' })
  async sendEmail(@Body() body: { to: string; subject: string; template: string; data: any }) {
    await this.emailService.sendEmail(body);
    return { message: 'Email queued successfully' };
  }

  @Post('welcome')
  @ApiOperation({ summary: '发送欢迎邮件' })
  async sendWelcomeEmail(@Body() body: { to: string; name: string }) {
    await this.emailService.sendWelcomeEmail(body.to, body.name);
    return { message: 'Welcome email queued' };
  }

  @Post('test')
  @ApiOperation({ summary: '发送测试邮件' })
  async sendTestEmail(@Body() body: { to: string }) {
    await this.emailService.sendTestEmail(body.to);
    return { success: true, message: '测试邮件已发送' };
  }
}
