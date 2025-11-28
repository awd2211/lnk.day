"""
Notification client for sending emails via notification-service
"""
import logging
import httpx
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationClient:
    """通知服务客户端"""

    def __init__(self):
        self.base_url = settings.NOTIFICATION_SERVICE_URL
        self.timeout = 30.0

    async def send_scheduled_report_email(
        self,
        recipients: List[str],
        report_name: str,
        report_id: str,
        report_format: str,
        download_url: Optional[str] = None,
    ) -> int:
        """
        发送定时报告邮件

        Args:
            recipients: 收件人列表
            report_name: 报告名称
            report_id: 报告ID
            report_format: 报告格式 (pdf, csv, json)
            download_url: 下载链接

        Returns:
            成功发送的邮件数量
        """
        if not recipients:
            logger.debug("No recipients specified, skipping email notification")
            return 0

        sent_count = 0

        for recipient in recipients:
            try:
                success = await self._send_email(
                    to=recipient,
                    subject=f"定时报告已生成 - {report_name}",
                    template="scheduled-report",
                    data={
                        "report_name": report_name,
                        "report_id": report_id,
                        "report_format": report_format.upper(),
                        "download_url": download_url or f"{self.base_url}/reports/{report_id}/download",
                        "generated_at": self._get_current_time_str(),
                    },
                )
                if success:
                    sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send report email to {recipient}: {e}")

        logger.info(f"Sent scheduled report emails: {sent_count}/{len(recipients)}")
        return sent_count

    async def send_report_failed_email(
        self,
        recipients: List[str],
        report_name: str,
        error_message: str,
    ) -> int:
        """
        发送报告生成失败邮件

        Args:
            recipients: 收件人列表
            report_name: 报告名称
            error_message: 错误信息

        Returns:
            成功发送的邮件数量
        """
        if not recipients:
            return 0

        sent_count = 0

        for recipient in recipients:
            try:
                success = await self._send_email(
                    to=recipient,
                    subject=f"定时报告生成失败 - {report_name}",
                    template="report-failed",
                    data={
                        "report_name": report_name,
                        "error_message": error_message,
                        "failed_at": self._get_current_time_str(),
                        "support_url": "https://lnk.day/support",
                    },
                )
                if success:
                    sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send failure email to {recipient}: {e}")

        return sent_count

    async def _send_email(
        self,
        to: str,
        subject: str,
        template: str,
        data: dict,
    ) -> bool:
        """
        通过 notification-service 发送邮件

        Args:
            to: 收件人
            subject: 邮件主题
            template: 邮件模板
            data: 模板数据

        Returns:
            是否发送成功
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/email/send",
                    json={
                        "to": to,
                        "subject": subject,
                        "template": template,
                        "data": data,
                    },
                    headers={
                        "Content-Type": "application/json",
                        "X-Internal-Auth": "internal-key",  # Should be configured
                    },
                )

                if response.status_code == 200:
                    logger.debug(f"Email sent successfully to {to}")
                    return True
                else:
                    logger.error(f"Failed to send email: {response.status_code} {response.text}")
                    return False

        except httpx.TimeoutException:
            logger.error(f"Timeout sending email to {to}")
            return False
        except httpx.RequestError as e:
            logger.error(f"Request error sending email to {to}: {e}")
            return False

    def _get_current_time_str(self) -> str:
        """获取当前时间字符串"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# Singleton instance
notification_client = NotificationClient()
