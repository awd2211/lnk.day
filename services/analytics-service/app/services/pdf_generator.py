"""PDF Report Generator Service"""
import io
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


class PDFReportGenerator:
    """Generate PDF analytics reports"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1a1a2e'),
        ))
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#16213e'),
        ))
        self.styles.add(ParagraphStyle(
            name='MetricValue',
            parent=self.styles['Normal'],
            fontSize=28,
            textColor=colors.HexColor('#0f3460'),
            alignment=1,  # Center
        ))
        self.styles.add(ParagraphStyle(
            name='MetricLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            alignment=1,
        ))

    def generate_report(
        self,
        report_data: Dict[str, Any],
        output_path: Optional[str] = None,
    ) -> bytes:
        """Generate PDF report from analytics data"""
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        elements = []

        # Title
        elements.append(Paragraph(
            f"Analytics Report",
            self.styles['ReportTitle']
        ))

        # Report period
        period = report_data.get('period', {})
        period_text = f"Report Period: {period.get('start', 'N/A')} - {period.get('end', 'N/A')}"
        elements.append(Paragraph(period_text, self.styles['Normal']))
        elements.append(Paragraph(
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            self.styles['Normal']
        ))
        elements.append(Spacer(1, 30))

        # Overview Section
        elements.extend(self._create_overview_section(report_data.get('overview', {})))

        # Traffic Section
        if 'traffic' in report_data:
            elements.append(PageBreak())
            elements.extend(self._create_traffic_section(report_data['traffic']))

        # Geographic Section
        if 'geographic' in report_data:
            elements.extend(self._create_geographic_section(report_data['geographic']))

        # Device Section
        if 'devices' in report_data:
            elements.extend(self._create_device_section(report_data['devices']))

        # Top Links Section
        if 'top_links' in report_data:
            elements.extend(self._create_top_links_section(report_data['top_links']))

        # Referrers Section
        if 'referrers' in report_data:
            elements.extend(self._create_referrers_section(report_data['referrers']))

        doc.build(elements)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        if output_path:
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)

        return pdf_bytes

    def _create_overview_section(self, overview: Dict[str, Any]) -> List:
        """Create overview metrics section"""
        elements = []
        elements.append(Paragraph("Overview", self.styles['SectionTitle']))

        # Create metrics table
        metrics = [
            ('Total Clicks', overview.get('total_clicks', 0)),
            ('Unique Visitors', overview.get('unique_visitors', 0)),
            ('Total Links', overview.get('total_links', 0)),
            ('Active Links', overview.get('active_links', 0)),
        ]

        data = [
            [
                Paragraph(str(v), self.styles['MetricValue'])
                for _, v in metrics[:2]
            ],
            [
                Paragraph(label, self.styles['MetricLabel'])
                for label, _ in metrics[:2]
            ],
            [Spacer(1, 10), Spacer(1, 10)],
            [
                Paragraph(str(v), self.styles['MetricValue'])
                for _, v in metrics[2:]
            ],
            [
                Paragraph(label, self.styles['MetricLabel'])
                for label, _ in metrics[2:]
            ],
        ]

        table = Table(data, colWidths=[200, 200])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 20))

        return elements

    def _create_traffic_section(self, traffic_data: List[Dict]) -> List:
        """Create traffic chart section"""
        elements = []
        elements.append(Paragraph("Traffic Trends", self.styles['SectionTitle']))

        if traffic_data:
            # Create line chart using matplotlib
            chart_image = self._create_traffic_chart(traffic_data)
            if chart_image:
                elements.append(Image(chart_image, width=450, height=200))

        elements.append(Spacer(1, 20))
        return elements

    def _create_traffic_chart(self, traffic_data: List[Dict]) -> Optional[io.BytesIO]:
        """Generate traffic trend chart"""
        try:
            dates = [d.get('date', '') for d in traffic_data]
            clicks = [d.get('clicks', 0) for d in traffic_data]

            fig, ax = plt.subplots(figsize=(8, 3))
            ax.plot(dates, clicks, color='#0f3460', linewidth=2)
            ax.fill_between(dates, clicks, alpha=0.3, color='#0f3460')
            ax.set_xlabel('Date')
            ax.set_ylabel('Clicks')
            ax.tick_params(axis='x', rotation=45)
            plt.tight_layout()

            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100)
            plt.close(fig)
            buf.seek(0)
            return buf
        except Exception:
            return None

    def _create_geographic_section(self, geo_data: List[Dict]) -> List:
        """Create geographic distribution section"""
        elements = []
        elements.append(Paragraph("Geographic Distribution", self.styles['SectionTitle']))

        if geo_data:
            # Top 10 countries table
            table_data = [['Country', 'Clicks', 'Percentage']]
            total_clicks = sum(d.get('clicks', 0) for d in geo_data)

            for item in geo_data[:10]:
                clicks = item.get('clicks', 0)
                pct = (clicks / total_clicks * 100) if total_clicks > 0 else 0
                table_data.append([
                    item.get('country', 'Unknown'),
                    str(clicks),
                    f"{pct:.1f}%"
                ])

            table = Table(table_data, colWidths=[200, 100, 100])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ]))

            elements.append(table)

        elements.append(Spacer(1, 20))
        return elements

    def _create_device_section(self, device_data: Dict[str, Any]) -> List:
        """Create device distribution section"""
        elements = []
        elements.append(Paragraph("Device & Browser Distribution", self.styles['SectionTitle']))

        # Devices table
        if 'devices' in device_data:
            elements.append(Paragraph("Devices", self.styles['Normal']))
            table_data = [['Device', 'Clicks', 'Percentage']]
            total = sum(d.get('clicks', 0) for d in device_data['devices'])

            for item in device_data['devices']:
                clicks = item.get('clicks', 0)
                pct = (clicks / total * 100) if total > 0 else 0
                table_data.append([
                    item.get('device', 'Unknown'),
                    str(clicks),
                    f"{pct:.1f}%"
                ])

            table = Table(table_data, colWidths=[150, 100, 100])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 10))

        # Browsers table
        if 'browsers' in device_data:
            elements.append(Paragraph("Browsers", self.styles['Normal']))
            table_data = [['Browser', 'Clicks', 'Percentage']]
            total = sum(d.get('clicks', 0) for d in device_data['browsers'])

            for item in device_data['browsers'][:5]:
                clicks = item.get('clicks', 0)
                pct = (clicks / total * 100) if total > 0 else 0
                table_data.append([
                    item.get('browser', 'Unknown'),
                    str(clicks),
                    f"{pct:.1f}%"
                ])

            table = Table(table_data, colWidths=[150, 100, 100])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))
            elements.append(table)

        elements.append(Spacer(1, 20))
        return elements

    def _create_top_links_section(self, top_links: List[Dict]) -> List:
        """Create top performing links section"""
        elements = []
        elements.append(Paragraph("Top Performing Links", self.styles['SectionTitle']))

        if top_links:
            table_data = [['Short URL', 'Original URL', 'Clicks']]

            for link in top_links[:10]:
                short_url = link.get('short_url', 'N/A')
                original_url = link.get('original_url', 'N/A')
                # Truncate long URLs
                if len(original_url) > 40:
                    original_url = original_url[:37] + '...'
                clicks = str(link.get('clicks', 0))
                table_data.append([short_url, original_url, clicks])

            table = Table(table_data, colWidths=[120, 230, 60])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'CENTER'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ]))

            elements.append(table)

        elements.append(Spacer(1, 20))
        return elements

    def _create_referrers_section(self, referrers: List[Dict]) -> List:
        """Create referrers section"""
        elements = []
        elements.append(Paragraph("Top Referrers", self.styles['SectionTitle']))

        if referrers:
            table_data = [['Referrer', 'Clicks', 'Percentage']]
            total = sum(r.get('clicks', 0) for r in referrers)

            for ref in referrers[:10]:
                clicks = ref.get('clicks', 0)
                pct = (clicks / total * 100) if total > 0 else 0
                referrer = ref.get('referrer', 'Direct')
                if len(referrer) > 40:
                    referrer = referrer[:37] + '...'
                table_data.append([referrer, str(clicks), f"{pct:.1f}%"])

            table = Table(table_data, colWidths=[250, 80, 80])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))

            elements.append(table)

        return elements


# Singleton instance
pdf_generator = PDFReportGenerator()
