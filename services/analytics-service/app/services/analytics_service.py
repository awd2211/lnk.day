from datetime import datetime
from typing import Optional, List, Dict, Any
from app.core.clickhouse import get_clickhouse_client
from app.models.analytics import AnalyticsQuery, AnalyticsResponse


class AnalyticsService:
    def __init__(self):
        # Don't create a persistent connection - create fresh one for each request
        pass

    @property
    def client(self):
        """Get a fresh ClickHouse client for each request"""
        return get_clickhouse_client()

    def get_link_analytics(self, link_id: str, start_date: datetime, end_date: datetime) -> AnalyticsResponse:
        # Total clicks
        total_clicks = self._get_total_clicks(link_id, start_date, end_date)
        unique_clicks = self._get_unique_clicks(link_id, start_date, end_date)

        # Time series
        time_series = self._get_time_series(link_id, start_date, end_date)

        # Distributions
        geo_distribution = self._get_geo_distribution(link_id, start_date, end_date)
        device_distribution = self._get_device_distribution(link_id, start_date, end_date)
        browser_distribution = self._get_browser_distribution(link_id, start_date, end_date)
        top_referers = self._get_top_referers(link_id, start_date, end_date)

        return AnalyticsResponse(
            total_clicks=total_clicks,
            unique_clicks=unique_clicks,
            time_series=time_series,
            geo_distribution=geo_distribution,
            device_distribution=device_distribution,
            browser_distribution=browser_distribution,
            top_referers=top_referers,
        )

    def _get_total_clicks(self, link_id: str, start_date: datetime, end_date: datetime) -> int:
        result = self.client.execute(
            """
            SELECT count() as total
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        return result[0][0] if result else 0

    def _get_unique_clicks(self, link_id: str, start_date: datetime, end_date: datetime) -> int:
        result = self.client.execute(
            """
            SELECT uniq(visitor_ip) as unique_clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        return result[0][0] if result else 0

    def _get_time_series(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        result = self.client.execute(
            """
            SELECT toStartOfDay(timestamp) as date, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY date
            ORDER BY date
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        return [{"timestamp": row[0], "clicks": row[1]} for row in result]

    def _get_geo_distribution(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        result = self.client.execute(
            """
            SELECT country, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY country
            ORDER BY clicks DESC
            LIMIT 10
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        total = sum(row[1] for row in result) or 1
        return [{"country": row[0], "clicks": row[1], "percentage": row[1] / total * 100} for row in result]

    def _get_device_distribution(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        result = self.client.execute(
            """
            SELECT device_type, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY device_type
            ORDER BY clicks DESC
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        total = sum(row[1] for row in result) or 1
        return [{"device": row[0], "clicks": row[1], "percentage": row[1] / total * 100} for row in result]

    def _get_browser_distribution(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        result = self.client.execute(
            """
            SELECT browser, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY browser
            ORDER BY clicks DESC
            LIMIT 10
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        total = sum(row[1] for row in result) or 1
        return [{"browser": row[0], "clicks": row[1], "percentage": row[1] / total * 100} for row in result]

    def _get_top_referers(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        result = self.client.execute(
            """
            SELECT referrer, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
              AND referrer != ''
            GROUP BY referrer
            ORDER BY clicks DESC
            LIMIT 10
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        return [{"referer": row[0], "clicks": row[1]} for row in result]

    def get_team_summary(self, team_id: str, start_date: datetime, end_date: datetime) -> Dict:
        """Get summary statistics for a team"""
        result = self.client.execute(
            """
            SELECT
                count() as total_clicks,
                uniq(visitor_ip) as unique_visitors,
                uniq(link_id) as active_links
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            """,
            {"team_id": team_id, "start_date": start_date, "end_date": end_date}
        )

        if result:
            return {
                "team_id": team_id,
                "total_clicks": result[0][0],
                "unique_visitors": result[0][1],
                "active_links": result[0][2],
                "period": {"start": start_date, "end": end_date}
            }

        return {
            "team_id": team_id,
            "total_clicks": 0,
            "unique_visitors": 0,
            "active_links": 0,
            "period": {"start": start_date, "end": end_date}
        }

    def get_team_analytics(self, team_id: str, start_date: datetime, end_date: datetime) -> Dict:
        """Get comprehensive team analytics data for dashboard"""
        # Get a single client for all queries in this method
        client = get_clickhouse_client()
        params = {"team_id": team_id, "start_date": start_date, "end_date": end_date}

        # Total and unique clicks
        totals = client.execute(
            """
            SELECT
                count() as total_clicks,
                uniq(visitor_ip) as unique_visitors
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            """,
            params
        )

        # Today's clicks
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_clicks = client.execute(
            """
            SELECT count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(today)s
            """,
            {"team_id": team_id, "today": today}
        )

        # Time series (clicks by day)
        time_series = client.execute(
            """
            SELECT toDate(timestamp) as date, count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY date
            ORDER BY date
            """,
            params
        )

        # Device distribution
        devices = client.execute(
            """
            SELECT device_type, count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY device_type
            ORDER BY clicks DESC
            """,
            params
        )

        # Browser distribution
        browsers = client.execute(
            """
            SELECT browser, count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY browser
            ORDER BY clicks DESC
            LIMIT 10
            """,
            params
        )

        # Country distribution
        countries = client.execute(
            """
            SELECT country, count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY country
            ORDER BY clicks DESC
            LIMIT 10
            """,
            params
        )

        # Referrer distribution
        referrers = client.execute(
            """
            SELECT referrer, count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
              AND referrer != ''
            GROUP BY referrer
            ORDER BY clicks DESC
            LIMIT 10
            """,
            params
        )

        # Hourly activity heatmap
        hourly_activity = client.execute(
            """
            SELECT
                toDayOfWeek(timestamp) as day_of_week,
                toHour(timestamp) as hour,
                count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour
            """,
            params
        )

        # Calculate percentages
        total_clicks = totals[0][0] if totals else 0
        device_total = sum(row[1] for row in devices) or 1
        browser_total = sum(row[1] for row in browsers) or 1
        country_total = sum(row[1] for row in countries) or 1
        referrer_total = sum(row[1] for row in referrers) or 1

        return {
            "totalClicks": total_clicks,
            "uniqueVisitors": totals[0][1] if totals else 0,
            "todayClicks": today_clicks[0][0] if today_clicks else 0,
            "clicksByDay": [
                {"date": str(row[0]), "clicks": row[1]}
                for row in time_series
            ],
            "devices": [
                {"device": row[0] or "Unknown", "clicks": row[1], "percentage": round(row[1] / device_total * 100, 1)}
                for row in devices
            ],
            "browsers": [
                {"browser": row[0] or "Unknown", "clicks": row[1], "percentage": round(row[1] / browser_total * 100, 1)}
                for row in browsers
            ],
            "countries": [
                {"country": row[0] or "Unknown", "clicks": row[1], "percentage": round(row[1] / country_total * 100, 1)}
                for row in countries
            ],
            "referrers": [
                {"referrer": row[0], "clicks": row[1], "percentage": round(row[1] / referrer_total * 100, 1)}
                for row in referrers
            ],
            "hourlyActivity": [
                {"day": row[0] % 7, "hour": row[1], "clicks": row[2]}
                for row in hourly_activity
            ],
        }

    def get_hourly_stats(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get hourly click statistics"""
        result = self.client.execute(
            """
            SELECT toStartOfHour(timestamp) as hour, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY hour
            ORDER BY hour
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        return [{"timestamp": row[0], "clicks": row[1]} for row in result]

    def get_hourly_activity(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get clicks by day of week and hour for heatmap visualization"""
        result = self.client.execute(
            """
            SELECT
                toDayOfWeek(timestamp) as day_of_week,
                toHour(timestamp) as hour,
                count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        # ClickHouse toDayOfWeek returns 1=Monday to 7=Sunday
        # Convert to JavaScript format: 0=Sunday to 6=Saturday
        return [
            {
                "day": row[0] % 7,  # Convert: 1-6 -> 1-6, 7 -> 0
                "hour": row[1],
                "clicks": row[2]
            }
            for row in result
        ]

    def get_team_hourly_activity(self, team_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get team-level clicks by day of week and hour for heatmap"""
        result = self.client.execute(
            """
            SELECT
                toDayOfWeek(timestamp) as day_of_week,
                toHour(timestamp) as hour,
                count() as clicks
            FROM link_events
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour
            """,
            {"team_id": team_id, "start_date": start_date, "end_date": end_date}
        )
        return [
            {
                "day": row[0] % 7,
                "hour": row[1],
                "clicks": row[2]
            }
            for row in result
        ]

    def get_os_distribution(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get OS distribution"""
        result = self.client.execute(
            """
            SELECT os, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY os
            ORDER BY clicks DESC
            LIMIT 10
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        total = sum(row[1] for row in result) or 1
        return [{"os": row[0], "clicks": row[1], "percentage": row[1] / total * 100} for row in result]

    def get_geo_detailed(self, link_id: str, start_date: datetime, end_date: datetime, limit: int = 20) -> Dict:
        """Get detailed geo distribution with country, region, and city breakdown"""
        # Country distribution
        countries = self.client.execute(
            """
            SELECT country, count() as clicks, uniq(visitor_ip) as unique_visitors
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY country
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date, "limit": limit}
        )

        # City distribution (top cities)
        cities = self.client.execute(
            """
            SELECT country, city, count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
              AND city != ''
            GROUP BY country, city
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date, "limit": limit}
        )

        total_clicks = sum(row[1] for row in countries) or 1

        return {
            "countries": [
                {
                    "country": row[0],
                    "clicks": row[1],
                    "unique_visitors": row[2],
                    "percentage": row[1] / total_clicks * 100
                }
                for row in countries
            ],
            "cities": [
                {"country": row[0], "city": row[1], "clicks": row[2]}
                for row in cities
            ],
            "total_countries": len(countries),
        }

    def get_device_detailed(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get detailed device distribution"""
        result = self.client.execute(
            """
            SELECT device_type, count() as clicks, uniq(visitor_ip) as unique_visitors
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY device_type
            ORDER BY clicks DESC
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        total = sum(row[1] for row in result) or 1
        return [
            {
                "device": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
                "percentage": row[1] / total * 100
            }
            for row in result
        ]

    def get_browser_detailed(self, link_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get detailed browser distribution"""
        result = self.client.execute(
            """
            SELECT browser, count() as clicks, uniq(visitor_ip) as unique_visitors
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY browser
            ORDER BY clicks DESC
            LIMIT 15
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )
        total = sum(row[1] for row in result) or 1
        return [
            {
                "browser": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
                "percentage": row[1] / total * 100
            }
            for row in result
        ]

    def get_referrer_detailed(self, link_id: str, start_date: datetime, end_date: datetime, limit: int = 20) -> Dict:
        """Get detailed referrer distribution with domain grouping"""
        # Direct vs referral split
        direct_count = self.client.execute(
            """
            SELECT count() as clicks
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
              AND (referrer = '' OR referrer IS NULL)
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date}
        )

        # Top referrers
        referrers = self.client.execute(
            """
            SELECT referrer, count() as clicks, uniq(visitor_ip) as unique_visitors
            FROM link_events
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
              AND referrer != ''
            GROUP BY referrer
            ORDER BY clicks DESC
            LIMIT %(limit)s
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date, "limit": limit}
        )

        total_referral = sum(row[1] for row in referrers) or 0
        direct = direct_count[0][0] if direct_count else 0
        total = direct + total_referral or 1

        return {
            "direct": {
                "clicks": direct,
                "percentage": direct / total * 100
            },
            "referral": {
                "clicks": total_referral,
                "percentage": total_referral / total * 100
            },
            "top_referrers": [
                {
                    "url": row[0],
                    "clicks": row[1],
                    "unique_visitors": row[2],
                    "percentage": row[1] / total * 100
                }
                for row in referrers
            ],
        }
