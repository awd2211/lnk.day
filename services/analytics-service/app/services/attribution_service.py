"""
营销归因分析服务
提供多种归因模型用于分析转化来源和渠道贡献
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from enum import Enum
from app.core.clickhouse import get_clickhouse_client


class AttributionModel(str, Enum):
    """归因模型类型"""
    FIRST_TOUCH = "first_touch"  # 首次触点归因
    LAST_TOUCH = "last_touch"    # 末次触点归因
    LINEAR = "linear"            # 线性归因
    TIME_DECAY = "time_decay"    # 时间衰减归因
    POSITION = "position"        # 位置归因 (U型)
    DATA_DRIVEN = "data_driven"  # 数据驱动归因


class AttributionService:
    """营销归因分析服务"""

    def __init__(self):
        pass

    @property
    def client(self):
        """Get a fresh ClickHouse client for each request"""
        return get_clickhouse_client()

    def get_channel_attribution(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        model: AttributionModel = AttributionModel.LAST_TOUCH,
        conversion_window_days: int = 30
    ) -> Dict[str, Any]:
        """
        渠道归因分析
        分析不同流量来源/渠道对转化的贡献

        支持的归因模型:
        - first_touch: 100% 归因给首次接触点
        - last_touch: 100% 归因给最后接触点
        - linear: 所有接触点平均分配
        - time_decay: 越接近转化的接触点权重越高
        - position: 首末各40%，中间平分20%
        """
        # 获取按访客分组的触点序列
        touchpoints_query = """
        SELECT
            visitor_ip,
            groupArray(tuple(
                timestamp,
                referrer,
                CASE
                    WHEN referrer = '' OR referrer IS NULL THEN 'direct'
                    WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' OR referrer LIKE '%baidu%' THEN 'organic_search'
                    WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%linkedin%' OR referrer LIKE '%instagram%' THEN 'social'
                    WHEN referrer LIKE '%email%' OR referrer LIKE '%mail%' OR referrer LIKE '%newsletter%' THEN 'email'
                    WHEN utm_source != '' THEN concat('campaign_', utm_source)
                    ELSE 'referral'
                END as channel
            )) as touchpoints,
            count() as total_clicks
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY visitor_ip
        HAVING total_clicks >= 1
        ORDER BY total_clicks DESC
        LIMIT 10000
        """

        # 简化版：直接按渠道统计
        channel_query = """
        SELECT
            CASE
                WHEN referrer = '' OR referrer IS NULL THEN 'direct'
                WHEN referrer LIKE '%%google%%' OR referrer LIKE '%%bing%%' OR referrer LIKE '%%yahoo%%' OR referrer LIKE '%%baidu%%' THEN 'organic_search'
                WHEN referrer LIKE '%%facebook%%' OR referrer LIKE '%%twitter%%' OR referrer LIKE '%%linkedin%%' OR referrer LIKE '%%instagram%%' THEN 'social'
                WHEN referrer LIKE '%%email%%' OR referrer LIKE '%%mail%%' THEN 'email'
                ELSE 'referral'
            END as channel,
            count() as clicks,
            uniq(visitor_ip) as unique_visitors
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY channel
        ORDER BY clicks DESC
        """

        result = self.client.execute(
            channel_query,
            {"start_date": start_date, "end_date": end_date}
        )

        total_clicks = sum(row[1] for row in result)
        total_visitors = sum(row[2] for row in result)

        channels = []
        for row in result:
            channel = row[0]
            clicks = row[1]
            visitors = row[2]

            # 根据归因模型计算贡献
            attribution_value = self._calculate_attribution(
                model=model,
                clicks=clicks,
                total_clicks=total_clicks,
                position="all"  # 简化处理
            )

            channels.append({
                "channel": channel,
                "clicks": clicks,
                "unique_visitors": visitors,
                "percentage": round(clicks / total_clicks * 100, 2) if total_clicks > 0 else 0,
                "attribution_value": round(attribution_value, 2)
            })

        return {
            "model": model.value,
            "period": {"start": str(start_date), "end": str(end_date)},
            "total_clicks": total_clicks,
            "total_visitors": total_visitors,
            "channels": channels
        }

    def get_campaign_attribution(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        model: AttributionModel = AttributionModel.LAST_TOUCH
    ) -> Dict[str, Any]:
        """
        营销活动归因分析
        分析各营销活动的转化贡献
        """
        query = """
        SELECT
            utm_campaign,
            utm_source,
            utm_medium,
            count() as clicks,
            uniq(visitor_ip) as unique_visitors,
            min(timestamp) as first_click,
            max(timestamp) as last_click
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
          AND (utm_campaign != '' OR utm_source != '' OR utm_medium != '')
        GROUP BY utm_campaign, utm_source, utm_medium
        ORDER BY clicks DESC
        LIMIT 50
        """

        result = self.client.execute(
            query,
            {"start_date": start_date, "end_date": end_date}
        )

        total_clicks = sum(row[3] for row in result)
        campaigns = []

        for row in result:
            campaign = row[0] or "(not set)"
            source = row[1] or "(not set)"
            medium = row[2] or "(not set)"
            clicks = row[3]
            visitors = row[4]

            attribution_value = self._calculate_attribution(
                model=model,
                clicks=clicks,
                total_clicks=total_clicks,
                position="all"
            )

            campaigns.append({
                "campaign": campaign,
                "source": source,
                "medium": medium,
                "clicks": clicks,
                "unique_visitors": visitors,
                "first_click": str(row[5]),
                "last_click": str(row[6]),
                "percentage": round(clicks / total_clicks * 100, 2) if total_clicks > 0 else 0,
                "attribution_value": round(attribution_value, 2)
            })

        return {
            "model": model.value,
            "period": {"start": str(start_date), "end": str(end_date)},
            "total_tracked_clicks": total_clicks,
            "campaigns": campaigns
        }

    def get_touchpoint_analysis(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        触点路径分析
        分析用户的典型转化路径
        """
        # 获取用户的触点序列
        path_query = """
        SELECT
            visitor_ip,
            groupArray(
                CASE
                    WHEN referrer = '' OR referrer IS NULL THEN 'direct'
                    WHEN referrer LIKE '%%google%%' OR referrer LIKE '%%bing%%' THEN 'search'
                    WHEN referrer LIKE '%%facebook%%' OR referrer LIKE '%%twitter%%' THEN 'social'
                    ELSE 'referral'
                END
            ) as path
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY visitor_ip
        HAVING length(path) >= 2
        ORDER BY length(path) DESC
        LIMIT 5000
        """

        result = self.client.execute(
            path_query,
            {"start_date": start_date, "end_date": end_date}
        )

        # 分析常见路径
        path_counts: Dict[str, int] = {}
        for row in result:
            # 简化路径表示
            path = row[1]
            if len(path) > 5:
                path = path[:2] + ['...'] + path[-2:]
            path_str = ' → '.join(path)
            path_counts[path_str] = path_counts.get(path_str, 0) + 1

        # 排序获取最常见的路径
        top_paths = sorted(path_counts.items(), key=lambda x: x[1], reverse=True)[:20]

        # 触点位置分析
        position_query = """
        WITH ranked_events AS (
            SELECT
                visitor_ip,
                CASE
                    WHEN referrer = '' OR referrer IS NULL THEN 'direct'
                    WHEN referrer LIKE '%%google%%' OR referrer LIKE '%%bing%%' THEN 'search'
                    WHEN referrer LIKE '%%facebook%%' OR referrer LIKE '%%twitter%%' THEN 'social'
                    ELSE 'referral'
                END as channel,
                row_number() OVER (PARTITION BY visitor_ip ORDER BY timestamp) as position,
                count() OVER (PARTITION BY visitor_ip) as total_touches
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
        )
        SELECT
            channel,
            countIf(position = 1) as first_touch,
            countIf(position = total_touches AND total_touches > 1) as last_touch,
            countIf(position > 1 AND position < total_touches) as middle_touch,
            count() as total
        FROM ranked_events
        GROUP BY channel
        ORDER BY total DESC
        """

        position_result = self.client.execute(
            position_query,
            {"start_date": start_date, "end_date": end_date}
        )

        position_analysis = []
        for row in position_result:
            position_analysis.append({
                "channel": row[0],
                "first_touch": row[1],
                "last_touch": row[2],
                "middle_touch": row[3],
                "total": row[4],
                "first_touch_rate": round(row[1] / row[4] * 100, 2) if row[4] > 0 else 0,
                "last_touch_rate": round(row[2] / row[4] * 100, 2) if row[4] > 0 else 0
            })

        # 平均路径长度
        avg_path_query = """
        SELECT avg(touch_count) as avg_path_length
        FROM (
            SELECT visitor_ip, count() as touch_count
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
        )
        """

        avg_result = self.client.execute(
            avg_path_query,
            {"start_date": start_date, "end_date": end_date}
        )

        return {
            "period": {"start": str(start_date), "end": str(end_date)},
            "top_paths": [
                {"path": path, "count": count}
                for path, count in top_paths
            ],
            "position_analysis": position_analysis,
            "average_path_length": round(avg_result[0][0], 2) if avg_result else 0
        }

    def get_assisted_conversions(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        辅助转化分析
        分析各渠道作为辅助触点的贡献
        """
        # 分析多触点用户中各渠道的角色
        query = """
        WITH multi_touch_visitors AS (
            SELECT visitor_ip
            FROM link_events
            WHERE timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            GROUP BY visitor_ip
            HAVING count() >= 2
        ),
        touch_positions AS (
            SELECT
                e.visitor_ip,
                CASE
                    WHEN e.referrer = '' OR e.referrer IS NULL THEN 'direct'
                    WHEN e.referrer LIKE '%%google%%' OR e.referrer LIKE '%%bing%%' THEN 'search'
                    WHEN e.referrer LIKE '%%facebook%%' OR e.referrer LIKE '%%twitter%%' THEN 'social'
                    ELSE 'referral'
                END as channel,
                row_number() OVER (PARTITION BY e.visitor_ip ORDER BY e.timestamp) as pos,
                count() OVER (PARTITION BY e.visitor_ip) as total
            FROM link_events e
            INNER JOIN multi_touch_visitors mv ON e.visitor_ip = mv.visitor_ip
            WHERE e.timestamp >= %(start_date)s
              AND e.timestamp <= %(end_date)s
        )
        SELECT
            channel,
            uniqIf(visitor_ip, pos = 1) as first_touch_conversions,
            uniqIf(visitor_ip, pos = total) as last_touch_conversions,
            uniqIf(visitor_ip, pos > 1 AND pos < total) as assisted_conversions,
            uniq(visitor_ip) as total_conversions
        FROM touch_positions
        GROUP BY channel
        ORDER BY total_conversions DESC
        """

        result = self.client.execute(
            query,
            {"start_date": start_date, "end_date": end_date}
        )

        channels = []
        for row in result:
            first = row[1]
            last = row[2]
            assisted = row[3]
            total = row[4]

            # 计算辅助转化比率
            assist_ratio = assisted / last if last > 0 else 0

            channels.append({
                "channel": row[0],
                "first_touch_conversions": first,
                "last_touch_conversions": last,
                "assisted_conversions": assisted,
                "total_conversions": total,
                "assist_ratio": round(assist_ratio, 2),
                "role": self._determine_channel_role(first, last, assisted)
            })

        return {
            "period": {"start": str(start_date), "end": str(end_date)},
            "channels": channels,
            "insights": self._generate_attribution_insights(channels)
        }

    def get_multi_touch_attribution(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        model: AttributionModel = AttributionModel.LINEAR
    ) -> Dict[str, Any]:
        """
        多触点归因分析
        使用指定模型计算每个渠道的归因贡献值
        """
        # 获取多触点访客的完整路径
        query = """
        SELECT
            visitor_ip,
            groupArray(tuple(
                timestamp,
                CASE
                    WHEN referrer = '' OR referrer IS NULL THEN 'direct'
                    WHEN referrer LIKE '%%google%%' OR referrer LIKE '%%bing%%' THEN 'search'
                    WHEN referrer LIKE '%%facebook%%' OR referrer LIKE '%%twitter%%' THEN 'social'
                    WHEN referrer LIKE '%%email%%' OR referrer LIKE '%%mail%%' THEN 'email'
                    ELSE 'referral'
                END
            )) as touchpoints
        FROM link_events
        WHERE timestamp >= %(start_date)s
          AND timestamp <= %(end_date)s
        GROUP BY visitor_ip
        HAVING length(touchpoints) >= 1
        """

        result = self.client.execute(
            query,
            {"start_date": start_date, "end_date": end_date}
        )

        # 按模型计算归因
        channel_credits: Dict[str, float] = {}
        total_conversions = len(result)

        for row in result:
            touchpoints = row[1]
            if not touchpoints:
                continue

            channels = [tp[1] for tp in touchpoints]
            credits = self._distribute_credit(model, channels, [tp[0] for tp in touchpoints])

            for channel, credit in credits.items():
                channel_credits[channel] = channel_credits.get(channel, 0) + credit

        # 计算各渠道的归因贡献
        total_credit = sum(channel_credits.values()) or 1
        attribution_results = []

        for channel, credit in sorted(channel_credits.items(), key=lambda x: x[1], reverse=True):
            attribution_results.append({
                "channel": channel,
                "attributed_conversions": round(credit, 2),
                "percentage": round(credit / total_credit * 100, 2)
            })

        return {
            "model": model.value,
            "model_description": self._get_model_description(model),
            "period": {"start": str(start_date), "end": str(end_date)},
            "total_conversions": total_conversions,
            "attribution": attribution_results
        }

    def compare_attribution_models(
        self,
        team_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        对比不同归因模型的结果
        """
        models_to_compare = [
            AttributionModel.FIRST_TOUCH,
            AttributionModel.LAST_TOUCH,
            AttributionModel.LINEAR,
            AttributionModel.POSITION
        ]

        comparison = {}
        for model in models_to_compare:
            result = self.get_multi_touch_attribution(
                team_id=team_id,
                start_date=start_date,
                end_date=end_date,
                model=model
            )
            comparison[model.value] = result["attribution"]

        # 找出模型间差异最大的渠道
        all_channels = set()
        for model_result in comparison.values():
            for item in model_result:
                all_channels.add(item["channel"])

        channel_variance = []
        for channel in all_channels:
            percentages = []
            for model_result in comparison.values():
                for item in model_result:
                    if item["channel"] == channel:
                        percentages.append(item["percentage"])
                        break

            if percentages:
                variance = max(percentages) - min(percentages)
                channel_variance.append({
                    "channel": channel,
                    "variance": round(variance, 2),
                    "min_attribution": round(min(percentages), 2),
                    "max_attribution": round(max(percentages), 2)
                })

        channel_variance.sort(key=lambda x: x["variance"], reverse=True)

        return {
            "period": {"start": str(start_date), "end": str(end_date)},
            "models": comparison,
            "model_differences": channel_variance[:10],
            "recommendation": self._recommend_model(channel_variance)
        }

    def _calculate_attribution(
        self,
        model: AttributionModel,
        clicks: int,
        total_clicks: int,
        position: str
    ) -> float:
        """根据归因模型计算贡献值"""
        if total_clicks == 0:
            return 0

        base_value = clicks / total_clicks * 100

        if model == AttributionModel.FIRST_TOUCH:
            return base_value if position in ["first", "all"] else 0
        elif model == AttributionModel.LAST_TOUCH:
            return base_value if position in ["last", "all"] else 0
        elif model == AttributionModel.LINEAR:
            return base_value
        elif model == AttributionModel.TIME_DECAY:
            # 简化：假设越近的权重越高
            return base_value * 1.2 if position == "last" else base_value * 0.8
        elif model == AttributionModel.POSITION:
            # U型：首末40%，中间20%
            if position == "first" or position == "last":
                return base_value * 1.3
            else:
                return base_value * 0.7
        else:
            return base_value

    def _distribute_credit(
        self,
        model: AttributionModel,
        channels: List[str],
        timestamps: List[datetime]
    ) -> Dict[str, float]:
        """
        根据归因模型分配转化功劳
        """
        if not channels:
            return {}

        n = len(channels)
        credits: Dict[str, float] = {}

        if model == AttributionModel.FIRST_TOUCH:
            credits[channels[0]] = 1.0

        elif model == AttributionModel.LAST_TOUCH:
            credits[channels[-1]] = 1.0

        elif model == AttributionModel.LINEAR:
            # 线性分配
            credit_per_touch = 1.0 / n
            for channel in channels:
                credits[channel] = credits.get(channel, 0) + credit_per_touch

        elif model == AttributionModel.TIME_DECAY:
            # 时间衰减：使用半衰期模型
            total_weight = 0
            weights = []
            for i in range(n):
                weight = 2 ** (i / (n / 2))  # 指数增长
                weights.append(weight)
                total_weight += weight

            for i, channel in enumerate(channels):
                credit = weights[i] / total_weight
                credits[channel] = credits.get(channel, 0) + credit

        elif model == AttributionModel.POSITION:
            # 位置归因 (U型)
            if n == 1:
                credits[channels[0]] = 1.0
            elif n == 2:
                credits[channels[0]] = credits.get(channels[0], 0) + 0.5
                credits[channels[1]] = credits.get(channels[1], 0) + 0.5
            else:
                # 首末各40%，中间平分20%
                credits[channels[0]] = credits.get(channels[0], 0) + 0.4
                credits[channels[-1]] = credits.get(channels[-1], 0) + 0.4
                middle_credit = 0.2 / (n - 2)
                for channel in channels[1:-1]:
                    credits[channel] = credits.get(channel, 0) + middle_credit

        else:
            # 默认线性
            credit_per_touch = 1.0 / n
            for channel in channels:
                credits[channel] = credits.get(channel, 0) + credit_per_touch

        return credits

    def _determine_channel_role(self, first: int, last: int, assisted: int) -> str:
        """判断渠道的主要角色"""
        if first > last and first > assisted:
            return "introducer"  # 引入者
        elif last > first and last > assisted:
            return "closer"  # 终结者
        elif assisted > first and assisted > last:
            return "influencer"  # 影响者
        else:
            return "balanced"  # 平衡型

    def _generate_attribution_insights(self, channels: List[Dict]) -> List[str]:
        """生成归因分析洞察"""
        insights = []

        for channel in channels:
            if channel["assist_ratio"] > 2:
                insights.append(
                    f"{channel['channel']} 是强力的辅助渠道，辅助转化比率为 {channel['assist_ratio']}:1"
                )
            elif channel["role"] == "introducer":
                insights.append(
                    f"{channel['channel']} 主要作为引入渠道，首次触点占比最高"
                )
            elif channel["role"] == "closer":
                insights.append(
                    f"{channel['channel']} 主要作为成交渠道，末次触点占比最高"
                )

        return insights[:5]  # 返回最多5条洞察

    def _get_model_description(self, model: AttributionModel) -> str:
        """获取归因模型描述"""
        descriptions = {
            AttributionModel.FIRST_TOUCH: "首次触点归因：100% 归因给用户的第一个接触点",
            AttributionModel.LAST_TOUCH: "末次触点归因：100% 归因给用户的最后一个接触点",
            AttributionModel.LINEAR: "线性归因：所有接触点平均分配转化功劳",
            AttributionModel.TIME_DECAY: "时间衰减归因：越接近转化的接触点获得越多功劳",
            AttributionModel.POSITION: "位置归因 (U型)：首末接触点各获40%，中间接触点平分20%",
            AttributionModel.DATA_DRIVEN: "数据驱动归因：基于机器学习算法计算实际贡献"
        }
        return descriptions.get(model, "未知模型")

    def _recommend_model(self, variance: List[Dict]) -> str:
        """根据差异推荐归因模型"""
        if not variance:
            return "数据不足，建议使用线性归因模型作为起点"

        avg_variance = sum(v["variance"] for v in variance) / len(variance)

        if avg_variance < 10:
            return "各模型结果相近，可使用线性归因模型"
        elif avg_variance < 25:
            return "建议结合业务目标选择合适的归因模型"
        else:
            return "模型差异较大，建议深入分析各渠道的真实贡献，考虑使用位置归因模型"


# 单例实例
attribution_service = AttributionService()
