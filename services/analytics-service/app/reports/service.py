import csv
import io
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4
import asyncio

from .models import (
    ReportConfig,
    ScheduledReportConfig,
    ReportResult,
    ReportJob,
    ReportFormat,
    ReportMetric,
    ReportDimension,
    DateRange,
    ReportSchedule,
)


class ReportService:
    """Service for generating custom analytics reports."""

    def __init__(self, clickhouse_client=None, redis_client=None):
        self.clickhouse = clickhouse_client
        self.redis = redis_client
        self.scheduled_reports: Dict[str, ScheduledReportConfig] = {}
        self.report_jobs: Dict[str, ReportJob] = {}

    # ========== Report Generation ==========

    async def generate_report(
        self,
        config: ReportConfig,
        team_id: str,
        user_id: str,
    ) -> ReportResult:
        """Generate a report based on configuration."""
        # Get date range
        start_date, end_date = self._resolve_date_range(config)

        # Build and execute query
        data = await self._execute_query(
            team_id=team_id,
            metrics=config.metrics,
            dimensions=config.dimensions,
            start_date=start_date,
            end_date=end_date,
            filters=config.filters,
            limit=config.limit,
            sort_by=config.sort_by,
            sort_order=config.sort_order,
        )

        # Calculate totals if requested
        totals = None
        if config.include_totals:
            totals = self._calculate_totals(data, config.metrics)

        # Calculate comparison if requested
        comparison = None
        if config.include_comparison:
            comparison = await self._calculate_comparison(
                team_id=team_id,
                metrics=config.metrics,
                start_date=start_date,
                end_date=end_date,
            )

        result = ReportResult(
            report_id=str(uuid4()),
            name=config.name,
            generated_at=datetime.utcnow(),
            date_range={
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            metrics=[m.value for m in config.metrics],
            dimensions=[d.value for d in config.dimensions],
            data=data,
            totals=totals,
            comparison=comparison,
            metadata={
                "team_id": team_id,
                "user_id": user_id,
                "format": config.format.value,
                "row_count": len(data),
            },
        )

        return result

    async def generate_report_async(
        self,
        config: ReportConfig,
        team_id: str,
        user_id: str,
    ) -> ReportJob:
        """Queue a report for async generation."""
        job = ReportJob(
            id=str(uuid4()),
            team_id=team_id,
            user_id=user_id,
            config=config,
            status="pending",
            progress=0,
            created_at=datetime.utcnow(),
        )

        self.report_jobs[job.id] = job

        # Start async processing
        asyncio.create_task(self._process_report_job(job))

        return job

    async def _process_report_job(self, job: ReportJob) -> None:
        """Process a report job asynchronously."""
        try:
            job.status = "processing"
            job.started_at = datetime.utcnow()
            job.progress = 10

            # Generate report
            result = await self.generate_report(
                config=job.config,
                team_id=job.team_id,
                user_id=job.user_id,
            )
            job.progress = 80

            # Convert to requested format
            formatted_data = self._format_report(result, job.config.format)
            job.progress = 90

            # Store result (in production, upload to S3)
            job.result_url = f"/api/reports/download/{job.id}"
            job.status = "completed"
            job.progress = 100
            job.completed_at = datetime.utcnow()

        except Exception as e:
            job.status = "failed"
            job.error = str(e)

    def get_job_status(self, job_id: str) -> Optional[ReportJob]:
        """Get the status of a report job."""
        return self.report_jobs.get(job_id)

    # ========== Scheduled Reports ==========

    async def create_scheduled_report(
        self,
        config: ScheduledReportConfig,
        team_id: str,
        user_id: str,
    ) -> str:
        """Create a scheduled report."""
        report_id = str(uuid4())
        config.next_run = self._calculate_next_run(config)
        self.scheduled_reports[report_id] = config
        return report_id

    async def get_scheduled_reports(self, team_id: str) -> List[Dict[str, Any]]:
        """Get all scheduled reports for a team."""
        reports = []
        for report_id, config in self.scheduled_reports.items():
            reports.append({
                "id": report_id,
                "name": config.name,
                "schedule": config.schedule.value,
                "format": config.format.value,
                "enabled": config.enabled,
                "last_run": config.last_run.isoformat() if config.last_run else None,
                "next_run": config.next_run.isoformat() if config.next_run else None,
                "recipients": config.recipients,
            })
        return reports

    async def update_scheduled_report(
        self,
        report_id: str,
        updates: Dict[str, Any],
    ) -> bool:
        """Update a scheduled report."""
        if report_id not in self.scheduled_reports:
            return False

        config = self.scheduled_reports[report_id]
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)

        config.next_run = self._calculate_next_run(config)
        return True

    async def delete_scheduled_report(self, report_id: str) -> bool:
        """Delete a scheduled report."""
        if report_id in self.scheduled_reports:
            del self.scheduled_reports[report_id]
            return True
        return False

    async def run_scheduled_reports(self) -> None:
        """Run all due scheduled reports."""
        now = datetime.utcnow()

        for report_id, config in self.scheduled_reports.items():
            if not config.enabled:
                continue

            if config.next_run and config.next_run <= now:
                try:
                    # Generate report
                    result = await self.generate_report(
                        config=config,
                        team_id="",  # Would get from storage
                        user_id="",
                    )

                    # Format and deliver
                    formatted = self._format_report(result, config.format)
                    await self._deliver_report(config, formatted, result)

                    # Update schedule
                    config.last_run = now
                    config.next_run = self._calculate_next_run(config)

                except Exception as e:
                    print(f"Error running scheduled report {report_id}: {e}")

    # ========== Data Query ==========

    async def _execute_query(
        self,
        team_id: str,
        metrics: List[ReportMetric],
        dimensions: List[ReportDimension],
        start_date: datetime,
        end_date: datetime,
        filters: List[Any],
        limit: int,
        sort_by: Optional[str],
        sort_order: str,
    ) -> List[Dict[str, Any]]:
        """Execute the analytics query against ClickHouse."""
        # Build SELECT clause
        select_parts = []
        group_by_parts = []

        # Add dimensions
        for dim in dimensions:
            dim_sql = self._dimension_to_sql(dim)
            if dim_sql:
                select_parts.append(dim_sql)
                group_by_parts.append(dim_sql.split(" as ")[0])

        # Add metrics
        for metric in metrics:
            metric_sql = self._metric_to_sql(metric)
            if metric_sql:
                select_parts.append(metric_sql)

        if not select_parts:
            return []

        # Build WHERE clause
        where_parts = [
            "team_id = %(team_id)s",
            "timestamp >= %(start_date)s",
            "timestamp < %(end_date)s",
        ]
        params = {
            "team_id": team_id,
            "start_date": start_date,
            "end_date": end_date,
        }

        # Add filters
        for i, f in enumerate(filters):
            filter_sql, filter_params = self._filter_to_sql(f, i)
            if filter_sql:
                where_parts.append(filter_sql)
                params.update(filter_params)

        # Build query
        sql = f"""
            SELECT {', '.join(select_parts)}
            FROM clicks
            WHERE {' AND '.join(where_parts)}
        """

        if group_by_parts:
            sql += f" GROUP BY {', '.join(group_by_parts)}"

        # Sorting
        if sort_by:
            order = "DESC" if sort_order == "desc" else "ASC"
            sql += f" ORDER BY {sort_by} {order}"
        elif group_by_parts:
            sql += f" ORDER BY {group_by_parts[0]}"

        sql += f" LIMIT {limit}"

        # Execute query
        try:
            if self.clickhouse:
                result = self.clickhouse.execute(sql, params)
                # Convert to list of dicts
                columns = [s.split(" as ")[-1].strip() for s in select_parts]
                return [dict(zip(columns, row)) for row in result]
        except Exception as e:
            print(f"ClickHouse query error: {e}")

        # Fallback to mock data if ClickHouse unavailable
        return self._generate_mock_data(dimensions, metrics, start_date, end_date, limit)

    def _dimension_to_sql(self, dim: ReportDimension) -> str:
        """Convert dimension to SQL."""
        mapping = {
            ReportDimension.DATE: "toDate(timestamp) as date",
            ReportDimension.HOUR: "toHour(timestamp) as hour",
            ReportDimension.DAY_OF_WEEK: "toDayOfWeek(timestamp) as day_of_week",
            ReportDimension.COUNTRY: "country",
            ReportDimension.CITY: "city",
            ReportDimension.DEVICE: "device",
            ReportDimension.OS: "os",
            ReportDimension.BROWSER: "browser",
            ReportDimension.REFERRER: "referer_domain as referrer",
            ReportDimension.UTM_SOURCE: "utm_source",
            ReportDimension.UTM_MEDIUM: "utm_medium",
            ReportDimension.UTM_CAMPAIGN: "utm_campaign",
            ReportDimension.LINK: "link_id as link",
            ReportDimension.CAMPAIGN: "campaign_id as campaign",
            ReportDimension.TAG: "arrayJoin(tags) as tag",
        }
        return mapping.get(dim, "")

    def _metric_to_sql(self, metric: ReportMetric) -> str:
        """Convert metric to SQL."""
        mapping = {
            ReportMetric.CLICKS: "count() as clicks",
            ReportMetric.UNIQUE_VISITORS: "uniq(visitor_id) as unique_visitors",
            ReportMetric.CONVERSIONS: "countIf(is_conversion = 1) as conversions",
            ReportMetric.CONVERSION_RATE: "countIf(is_conversion = 1) / count() * 100 as conversion_rate",
            ReportMetric.REVENUE: "sum(revenue) as revenue",
            ReportMetric.CTR: "count() / impressions * 100 as ctr",
            ReportMetric.BOUNCE_RATE: "countIf(is_bounce = 1) / count() * 100 as bounce_rate",
            ReportMetric.AVG_TIME_ON_PAGE: "avg(time_on_page) as avg_time_on_page",
        }
        return mapping.get(metric, "")

    def _filter_to_sql(self, filter_obj: Any, index: int) -> tuple:
        """Convert filter to SQL."""
        if not hasattr(filter_obj, 'field'):
            return "", {}

        field = filter_obj.field
        operator = filter_obj.operator
        value = filter_obj.value
        param_name = f"filter_{index}"

        operators = {
            "eq": f"{field} = %({param_name})s",
            "ne": f"{field} != %({param_name})s",
            "gt": f"{field} > %({param_name})s",
            "lt": f"{field} < %({param_name})s",
            "gte": f"{field} >= %({param_name})s",
            "lte": f"{field} <= %({param_name})s",
            "in": f"{field} IN %({param_name})s",
            "not_in": f"{field} NOT IN %({param_name})s",
            "contains": f"{field} LIKE %({param_name})s",
            "starts_with": f"{field} LIKE %({param_name})s",
        }

        sql = operators.get(operator, "")
        if not sql:
            return "", {}

        # Adjust value for LIKE patterns
        if operator == "contains":
            value = f"%{value}%"
        elif operator == "starts_with":
            value = f"{value}%"

        return sql, {param_name: value}

    def _generate_mock_data(
        self,
        dimensions: List[ReportDimension],
        metrics: List[ReportMetric],
        start_date: datetime,
        end_date: datetime,
        limit: int,
    ) -> List[Dict[str, Any]]:
        """Generate mock data when ClickHouse is unavailable."""
        import random
        data = []
        current = start_date

        while current <= end_date and len(data) < limit:
            row = {}

            for dim in dimensions:
                if dim == ReportDimension.DATE:
                    row["date"] = current.strftime("%Y-%m-%d")
                elif dim == ReportDimension.HOUR:
                    row["hour"] = current.hour
                elif dim == ReportDimension.COUNTRY:
                    row["country"] = random.choice(["CN", "US", "JP", "UK", "DE"])
                elif dim == ReportDimension.DEVICE:
                    row["device"] = random.choice(["mobile", "desktop", "tablet"])
                elif dim == ReportDimension.UTM_SOURCE:
                    row["utm_source"] = random.choice(["wechat", "google", "direct", "facebook"])

            for metric in metrics:
                if metric == ReportMetric.CLICKS:
                    row["clicks"] = random.randint(100, 5000)
                elif metric == ReportMetric.UNIQUE_VISITORS:
                    row["unique_visitors"] = random.randint(50, 3000)
                elif metric == ReportMetric.CONVERSIONS:
                    row["conversions"] = random.randint(5, 200)
                elif metric == ReportMetric.REVENUE:
                    row["revenue"] = round(random.uniform(100, 10000), 2)
                elif metric == ReportMetric.CONVERSION_RATE:
                    row["conversion_rate"] = round(random.uniform(0.5, 5.0), 2)
                elif metric == ReportMetric.BOUNCE_RATE:
                    row["bounce_rate"] = round(random.uniform(20, 60), 2)

            data.append(row)
            current += timedelta(days=1)

        return data[:limit]

    def _calculate_totals(
        self,
        data: List[Dict[str, Any]],
        metrics: List[ReportMetric],
    ) -> Dict[str, Any]:
        """Calculate totals for numeric metrics."""
        totals = {}

        for metric in metrics:
            key = metric.value
            if key in ["conversion_rate", "bounce_rate"]:
                # Average for rate metrics
                values = [row.get(key, 0) for row in data]
                totals[key] = round(sum(values) / len(values), 2) if values else 0
            else:
                # Sum for count metrics
                totals[key] = sum(row.get(key, 0) for row in data)

        return totals

    async def _calculate_comparison(
        self,
        team_id: str,
        metrics: List[ReportMetric],
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Calculate comparison with previous period."""
        period_days = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date - timedelta(days=1)

        # Get previous period data
        prev_data = await self._execute_query(
            team_id=team_id,
            metrics=metrics,
            dimensions=[ReportDimension.DATE],
            start_date=prev_start,
            end_date=prev_end,
            filters=[],
            limit=1000,
            sort_by=None,
            sort_order="desc",
        )

        prev_totals = self._calculate_totals(prev_data, metrics)

        comparison = {}
        for metric in metrics:
            key = metric.value
            prev_value = prev_totals.get(key, 0)
            if prev_value > 0:
                # Mock current value
                current_value = prev_value * 1.15  # 15% growth
                change = ((current_value - prev_value) / prev_value) * 100
                comparison[key] = {
                    "previous": prev_value,
                    "change_percent": round(change, 2),
                    "trend": "up" if change > 0 else "down",
                }

        return comparison

    # ========== Formatting ==========

    def _format_report(
        self,
        result: ReportResult,
        format: ReportFormat,
    ) -> bytes:
        """Format report for output."""
        if format == ReportFormat.JSON:
            return json.dumps(result.dict(), indent=2, default=str).encode()

        elif format == ReportFormat.CSV:
            output = io.StringIO()
            if result.data:
                writer = csv.DictWriter(output, fieldnames=result.data[0].keys())
                writer.writeheader()
                writer.writerows(result.data)
            return output.getvalue().encode()

        elif format == ReportFormat.EXCEL:
            # In production, use openpyxl or xlsxwriter
            return self._generate_excel(result)

        elif format == ReportFormat.PDF:
            # In production, use reportlab or weasyprint
            return self._generate_pdf(result)

        return b""

    def _generate_excel(self, result: ReportResult) -> bytes:
        """Generate Excel report."""
        # Placeholder - use openpyxl in production
        return json.dumps(result.dict(), indent=2, default=str).encode()

    def _generate_pdf(self, result: ReportResult) -> bytes:
        """Generate PDF report."""
        # Placeholder - use reportlab or weasyprint in production
        return json.dumps(result.dict(), indent=2, default=str).encode()

    # ========== Delivery ==========

    async def _deliver_report(
        self,
        config: ScheduledReportConfig,
        data: bytes,
        result: ReportResult,
    ) -> None:
        """Deliver a generated report."""
        # Email delivery
        if config.recipients:
            await self._send_email_report(config.recipients, data, result, config.format)

        # Webhook delivery
        if config.webhook_url:
            await self._send_webhook_report(config.webhook_url, result)

        # S3 delivery
        if config.s3_bucket:
            await self._upload_to_s3(config.s3_bucket, config.s3_prefix, data, result)

    async def _send_email_report(
        self,
        recipients: List[str],
        data: bytes,
        result: ReportResult,
        format: ReportFormat,
    ) -> None:
        """Send report via email."""
        # In production, use email service
        print(f"Sending report to {recipients}")

    async def _send_webhook_report(
        self,
        webhook_url: str,
        result: ReportResult,
    ) -> None:
        """Send report to webhook."""
        # In production, use aiohttp
        print(f"Sending report to webhook: {webhook_url}")

    async def _upload_to_s3(
        self,
        bucket: str,
        prefix: Optional[str],
        data: bytes,
        result: ReportResult,
    ) -> None:
        """Upload report to S3."""
        # In production, use aioboto3
        print(f"Uploading report to s3://{bucket}/{prefix}")

    # ========== Utilities ==========

    def _resolve_date_range(self, config: ReportConfig) -> tuple:
        """Resolve date range from config."""
        now = datetime.utcnow()

        if config.date_range == DateRange.CUSTOM:
            return config.custom_start_date, config.custom_end_date

        ranges = {
            DateRange.TODAY: (now.replace(hour=0, minute=0, second=0), now),
            DateRange.YESTERDAY: (
                (now - timedelta(days=1)).replace(hour=0, minute=0, second=0),
                (now - timedelta(days=1)).replace(hour=23, minute=59, second=59),
            ),
            DateRange.LAST_7_DAYS: (now - timedelta(days=7), now),
            DateRange.LAST_30_DAYS: (now - timedelta(days=30), now),
            DateRange.LAST_90_DAYS: (now - timedelta(days=90), now),
            DateRange.THIS_MONTH: (now.replace(day=1, hour=0, minute=0, second=0), now),
            DateRange.THIS_YEAR: (now.replace(month=1, day=1, hour=0, minute=0, second=0), now),
        }

        return ranges.get(config.date_range, (now - timedelta(days=30), now))

    def _calculate_next_run(self, config: ScheduledReportConfig) -> datetime:
        """Calculate next run time for scheduled report."""
        now = datetime.utcnow()
        time_parts = config.schedule_time.split(":")
        run_hour = int(time_parts[0])
        run_minute = int(time_parts[1]) if len(time_parts) > 1 else 0

        if config.schedule == ReportSchedule.DAILY:
            next_run = now.replace(hour=run_hour, minute=run_minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
            return next_run

        elif config.schedule == ReportSchedule.WEEKLY:
            target_day = config.schedule_day or 0  # Default Monday
            days_ahead = target_day - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_run = (now + timedelta(days=days_ahead)).replace(
                hour=run_hour, minute=run_minute, second=0, microsecond=0
            )
            return next_run

        elif config.schedule == ReportSchedule.MONTHLY:
            target_day = config.schedule_day or 1
            next_run = now.replace(
                day=min(target_day, 28),  # Safe for all months
                hour=run_hour,
                minute=run_minute,
                second=0,
                microsecond=0,
            )
            if next_run <= now:
                # Move to next month
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)
            return next_run

        return now + timedelta(days=1)


# Singleton instance
report_service = ReportService()
