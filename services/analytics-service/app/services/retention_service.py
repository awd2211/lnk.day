"""
用户留存分析服务
提供群组分析、留存率计算、用户行为分析等功能
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from app.core.clickhouse import get_clickhouse_client


class RetentionService:
    """用户留存分析服务"""

    def __init__(self):
        pass

    @property
    def client(self):
        """Get a fresh ClickHouse client for each request"""
        return get_clickhouse_client()

    def get_cohort_analysis(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        cohort_size: str = "week",  # day, week, month
        retention_periods: int = 8
    ) -> Dict[str, Any]:
        """
        群组留存分析
        按首次访问时间将用户分组，分析各群组的回访留存情况
        """
        # 根据 cohort_size 确定时间粒度
        granularity_map = {
            "day": "toStartOfDay",
            "week": "toStartOfWeek",
            "month": "toStartOfMonth"
        }
        granularity_fn = granularity_map.get(cohort_size, "toStartOfWeek")

        # 获取用户首次访问时间（群组）
        cohort_query = f"""
        WITH first_visits AS (
            SELECT
                visitor_ip,
                {granularity_fn}(min(timestamp)) as cohort_date
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
        ),
        return_visits AS (
            SELECT
                e.visitor_ip,
                fv.cohort_date,
                {granularity_fn}(e.timestamp) as visit_date
            FROM link_events e
            INNER JOIN first_visits fv ON e.visitor_ip = fv.visitor_ip
            WHERE e.timestamp >= %(start_date)s
              AND e.timestamp <= %(end_date)s
        )
        SELECT
            cohort_date,
            visit_date,
            uniq(visitor_ip) as users
        FROM return_visits
        GROUP BY cohort_date, visit_date
        ORDER BY cohort_date, visit_date
        """

        result = self.client.execute(
            cohort_query,
            {"start_date": start_date, "end_date": end_date}
        )

        # 处理结果，构建群组留存矩阵
        cohorts: Dict[str, Dict] = {}
        for row in result:
            cohort_date = str(row[0])
            visit_date = str(row[1])
            users = row[2]

            if cohort_date not in cohorts:
                cohorts[cohort_date] = {"cohort_date": cohort_date, "periods": {}}

            # 计算周期差
            try:
                cohort_dt = datetime.fromisoformat(cohort_date.split()[0])
                visit_dt = datetime.fromisoformat(visit_date.split()[0])

                if cohort_size == "day":
                    period = (visit_dt - cohort_dt).days
                elif cohort_size == "week":
                    period = (visit_dt - cohort_dt).days // 7
                else:  # month
                    period = (visit_dt.year - cohort_dt.year) * 12 + (visit_dt.month - cohort_dt.month)

                if 0 <= period < retention_periods:
                    cohorts[cohort_date]["periods"][period] = users
            except Exception:
                continue

        # 计算留存率
        cohort_list = []
        for cohort_date, data in sorted(cohorts.items()):
            initial_users = data["periods"].get(0, 0)
            retention_rates = []

            for period in range(retention_periods):
                users = data["periods"].get(period, 0)
                rate = (users / initial_users * 100) if initial_users > 0 else 0
                retention_rates.append({
                    "period": period,
                    "users": users,
                    "rate": round(rate, 2)
                })

            cohort_list.append({
                "cohort_date": cohort_date,
                "initial_users": initial_users,
                "retention": retention_rates
            })

        return {
            "cohort_size": cohort_size,
            "retention_periods": retention_periods,
            "cohorts": cohort_list,
            "period": {"start": str(start_date), "end": str(end_date)}
        }

    def get_user_retention_rate(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        period_days: int = 7
    ) -> Dict[str, Any]:
        """
        计算指定时间段的用户留存率
        返回各周期的留存率
        """
        # 计算各周期的留存用户数
        retention_query = """
        WITH first_visit AS (
            SELECT
                visitor_ip,
                min(timestamp) as first_time
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
        )
        SELECT
            floor(dateDiff('day', fv.first_time, e.timestamp) / %(period_days)s) as period,
            uniq(e.visitor_ip) as users
        FROM link_events e
        INNER JOIN first_visit fv ON e.visitor_ip = fv.visitor_ip
        WHERE e.timestamp >= %(start_date)s
          AND e.timestamp <= %(end_date)s
        GROUP BY period
        HAVING period >= 0 AND period <= 12
        ORDER BY period
        """

        result = self.client.execute(
            retention_query,
            {
                "start_date": start_date,
                "end_date": end_date,
                "period_days": period_days
            }
        )

        # 构建留存数据
        periods_data = {int(row[0]): row[1] for row in result}
        initial_users = periods_data.get(0, 0)

        retention_data = []
        for period, users in sorted(periods_data.items()):
            rate = (users / initial_users * 100) if initial_users > 0 else 0
            retention_data.append({
                "period": period,
                "day_range": f"Day {period * period_days}-{(period + 1) * period_days - 1}",
                "users": users,
                "rate": round(rate, 2)
            })

        return {
            "period_days": period_days,
            "initial_users": initial_users,
            "retention": retention_data,
            "average_retention": round(
                sum(d["rate"] for d in retention_data[1:]) / len(retention_data[1:])
                if len(retention_data) > 1 else 0,
                2
            )
        }

    def get_returning_vs_new_visitors(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        分析新访客 vs 回访访客
        """
        # 查询：在时间段内访问的用户，区分新老用户
        query = """
        WITH period_visitors AS (
            SELECT visitor_ip, min(timestamp) as first_visit_in_period
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
        ),
        historical_visitors AS (
            SELECT DISTINCT visitor_ip
            FROM link_events
            WHERE timestamp < %(start_date)s
        )
        SELECT
            CASE
                WHEN hv.visitor_ip IS NOT NULL THEN 'returning'
                ELSE 'new'
            END as visitor_type,
            count() as count
        FROM period_visitors pv
        LEFT JOIN historical_visitors hv ON pv.visitor_ip = hv.visitor_ip
        GROUP BY visitor_type
        """

        result = self.client.execute(
            query,
            {"start_date": start_date, "end_date": end_date}
        )

        visitors = {"new": 0, "returning": 0}
        for row in result:
            visitors[row[0]] = row[1]

        total = visitors["new"] + visitors["returning"]

        # 获取按天的新老访客分布
        daily_query = """
        WITH historical_visitors AS (
            SELECT DISTINCT visitor_ip
            FROM link_events
            WHERE timestamp < %(start_date)s
        )
        SELECT
            toDate(timestamp) as date,
            uniqIf(visitor_ip, visitor_ip NOT IN (SELECT visitor_ip FROM historical_visitors)) as new_visitors,
            uniqIf(visitor_ip, visitor_ip IN (SELECT visitor_ip FROM historical_visitors)) as returning_visitors
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY date
        ORDER BY date
        """

        daily_result = self.client.execute(
            daily_query,
            {"start_date": start_date, "end_date": end_date}
        )

        daily_data = [
            {
                "date": str(row[0]),
                "new": row[1],
                "returning": row[2]
            }
            for row in daily_result
        ]

        return {
            "summary": {
                "new_visitors": visitors["new"],
                "returning_visitors": visitors["returning"],
                "total_visitors": total,
                "new_percentage": round(visitors["new"] / total * 100, 2) if total > 0 else 0,
                "returning_percentage": round(visitors["returning"] / total * 100, 2) if total > 0 else 0
            },
            "daily": daily_data
        }

    def get_visitor_frequency(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        访问频率分析
        分析用户的访问次数分布
        """
        query = """
        SELECT
            visit_count_bucket,
            count() as user_count
        FROM (
            SELECT
                visitor_ip,
                CASE
                    WHEN count() = 1 THEN '1 visit'
                    WHEN count() BETWEEN 2 AND 3 THEN '2-3 visits'
                    WHEN count() BETWEEN 4 AND 10 THEN '4-10 visits'
                    WHEN count() BETWEEN 11 AND 25 THEN '11-25 visits'
                    ELSE '26+ visits'
                END as visit_count_bucket
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
        )
        GROUP BY visit_count_bucket
        ORDER BY
            CASE visit_count_bucket
                WHEN '1 visit' THEN 1
                WHEN '2-3 visits' THEN 2
                WHEN '4-10 visits' THEN 3
                WHEN '11-25 visits' THEN 4
                ELSE 5
            END
        """

        result = self.client.execute(
            query,
            {"start_date": start_date, "end_date": end_date}
        )

        frequency_data = []
        total_users = 0
        for row in result:
            frequency_data.append({"bucket": row[0], "users": row[1]})
            total_users += row[1]

        # 计算百分比
        for item in frequency_data:
            item["percentage"] = round(item["users"] / total_users * 100, 2) if total_users > 0 else 0

        # 计算平均访问次数
        avg_query = """
        SELECT avg(visit_count) as avg_visits
        FROM (
            SELECT visitor_ip, count() as visit_count
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
        )
        """

        avg_result = self.client.execute(
            avg_query,
            {"start_date": start_date, "end_date": end_date}
        )

        return {
            "frequency_distribution": frequency_data,
            "total_unique_visitors": total_users,
            "average_visits_per_user": round(avg_result[0][0], 2) if avg_result else 0
        }

    def get_recency_analysis(
        self,
        team_id: Optional[str],
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        最近活跃度分析 (Recency)
        分析用户最后一次访问距今的时间分布
        """
        query = """
        SELECT
            recency_bucket,
            count() as user_count
        FROM (
            SELECT
                visitor_ip,
                CASE
                    WHEN dateDiff('day', max(timestamp), %(end_date)s) <= 1 THEN 'Today/Yesterday'
                    WHEN dateDiff('day', max(timestamp), %(end_date)s) <= 7 THEN 'Last 7 days'
                    WHEN dateDiff('day', max(timestamp), %(end_date)s) <= 14 THEN 'Last 14 days'
                    WHEN dateDiff('day', max(timestamp), %(end_date)s) <= 30 THEN 'Last 30 days'
                    WHEN dateDiff('day', max(timestamp), %(end_date)s) <= 60 THEN 'Last 60 days'
                    WHEN dateDiff('day', max(timestamp), %(end_date)s) <= 90 THEN 'Last 90 days'
                    ELSE 'Over 90 days'
                END as recency_bucket
            FROM link_events
            WHERE timestamp <= %(end_date)s
            GROUP BY visitor_ip
        )
        GROUP BY recency_bucket
        ORDER BY
            CASE recency_bucket
                WHEN 'Today/Yesterday' THEN 1
                WHEN 'Last 7 days' THEN 2
                WHEN 'Last 14 days' THEN 3
                WHEN 'Last 30 days' THEN 4
                WHEN 'Last 60 days' THEN 5
                WHEN 'Last 90 days' THEN 6
                ELSE 7
            END
        """

        result = self.client.execute(query, {"end_date": end_date})

        recency_data = []
        total_users = 0
        for row in result:
            recency_data.append({"bucket": row[0], "users": row[1]})
            total_users += row[1]

        for item in recency_data:
            item["percentage"] = round(item["users"] / total_users * 100, 2) if total_users > 0 else 0

        # 活跃用户定义：最近30天内访问过
        active_users = sum(
            item["users"] for item in recency_data
            if item["bucket"] in ["Today/Yesterday", "Last 7 days", "Last 14 days", "Last 30 days"]
        )

        return {
            "recency_distribution": recency_data,
            "total_users": total_users,
            "active_users_30d": active_users,
            "active_rate": round(active_users / total_users * 100, 2) if total_users > 0 else 0
        }

    def get_churn_analysis(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        churn_days: int = 30
    ) -> Dict[str, Any]:
        """
        用户流失分析
        分析在指定时间段内活跃但之后未再访问的用户
        """
        # 在分析期间活跃的用户
        active_query = """
        SELECT uniq(visitor_ip) as active_users
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        """

        active_result = self.client.execute(
            active_query,
            {"start_date": start_date, "end_date": end_date}
        )
        active_users = active_result[0][0] if active_result else 0

        # 在分析期间后一段时间内回访的用户
        churn_end = end_date + timedelta(days=churn_days)
        retained_query = """
        WITH period_visitors AS (
            SELECT DISTINCT visitor_ip
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
        )
        SELECT uniq(e.visitor_ip) as retained
        FROM link_events e
        INNER JOIN period_visitors pv ON e.visitor_ip = pv.visitor_ip
        WHERE e.timestamp > %(end_date)s
          AND e.timestamp <= %(churn_end)s
        """

        retained_result = self.client.execute(
            retained_query,
            {"start_date": start_date, "end_date": end_date, "churn_end": churn_end}
        )
        retained_users = retained_result[0][0] if retained_result else 0

        churned_users = active_users - retained_users
        churn_rate = (churned_users / active_users * 100) if active_users > 0 else 0

        # 按周计算流失趋势
        weekly_query = """
        WITH weekly_active AS (
            SELECT
                toStartOfWeek(timestamp) as week,
                visitor_ip
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY week, visitor_ip
        )
        SELECT
            week,
            uniq(visitor_ip) as active,
            uniqIf(visitor_ip, visitor_ip NOT IN (
                SELECT visitor_ip FROM weekly_active wa2
                WHERE wa2.week > weekly_active.week
            )) as churned
        FROM weekly_active
        GROUP BY week
        ORDER BY week
        """

        # 简化版周级别查询
        weekly_simple = """
        SELECT
            toStartOfWeek(timestamp) as week,
            uniq(visitor_ip) as active_users
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY week
        ORDER BY week
        """

        weekly_result = self.client.execute(
            weekly_simple,
            {"start_date": start_date, "end_date": end_date}
        )

        weekly_data = [
            {"week": str(row[0]), "active_users": row[1]}
            for row in weekly_result
        ]

        return {
            "analysis_period": {
                "start": str(start_date),
                "end": str(end_date)
            },
            "churn_window_days": churn_days,
            "active_users": active_users,
            "retained_users": retained_users,
            "churned_users": churned_users,
            "churn_rate": round(churn_rate, 2),
            "retention_rate": round(100 - churn_rate, 2),
            "weekly_trend": weekly_data
        }

    def get_lifecycle_stages(
        self,
        team_id: Optional[str],
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        用户生命周期阶段分析
        将用户分为：新用户、活跃用户、沉默用户、流失用户、回流用户
        """
        query = """
        WITH user_activity AS (
            SELECT
                visitor_ip,
                min(timestamp) as first_visit,
                max(timestamp) as last_visit,
                count() as total_visits
            FROM link_events
            WHERE timestamp <= %(end_date)s
            GROUP BY visitor_ip
        )
        SELECT
            CASE
                WHEN dateDiff('day', first_visit, %(end_date)s) <= 7 THEN 'New'
                WHEN dateDiff('day', last_visit, %(end_date)s) <= 7 THEN 'Active'
                WHEN dateDiff('day', last_visit, %(end_date)s) <= 30 THEN 'Engaged'
                WHEN dateDiff('day', last_visit, %(end_date)s) <= 60 THEN 'At Risk'
                WHEN dateDiff('day', last_visit, %(end_date)s) <= 90 THEN 'Dormant'
                ELSE 'Churned'
            END as lifecycle_stage,
            count() as user_count,
            avg(total_visits) as avg_visits
        FROM user_activity
        GROUP BY lifecycle_stage
        ORDER BY
            CASE lifecycle_stage
                WHEN 'New' THEN 1
                WHEN 'Active' THEN 2
                WHEN 'Engaged' THEN 3
                WHEN 'At Risk' THEN 4
                WHEN 'Dormant' THEN 5
                ELSE 6
            END
        """

        result = self.client.execute(query, {"end_date": end_date})

        stages = []
        total_users = 0
        for row in result:
            stages.append({
                "stage": row[0],
                "users": row[1],
                "avg_visits": round(row[2], 2)
            })
            total_users += row[1]

        for item in stages:
            item["percentage"] = round(item["users"] / total_users * 100, 2) if total_users > 0 else 0

        # 生命周期阶段定义
        stage_definitions = {
            "New": "首次访问在7天内",
            "Active": "最近7天内有访问",
            "Engaged": "最近30天内有访问",
            "At Risk": "31-60天未访问",
            "Dormant": "61-90天未访问",
            "Churned": "超过90天未访问"
        }

        return {
            "stages": stages,
            "total_users": total_users,
            "stage_definitions": stage_definitions,
            "health_score": self._calculate_health_score(stages, total_users)
        }

    def _calculate_health_score(self, stages: List[Dict], total_users: int) -> float:
        """计算用户健康度评分 (0-100)"""
        if total_users == 0:
            return 0

        # 权重：New=70, Active=100, Engaged=80, At Risk=40, Dormant=20, Churned=0
        weights = {
            "New": 70,
            "Active": 100,
            "Engaged": 80,
            "At Risk": 40,
            "Dormant": 20,
            "Churned": 0
        }

        weighted_sum = sum(
            weights.get(stage["stage"], 0) * stage["users"]
            for stage in stages
        )

        return round(weighted_sum / total_users, 2)


# 单例实例
retention_service = RetentionService()
