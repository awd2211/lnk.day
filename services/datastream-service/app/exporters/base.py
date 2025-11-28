from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    PARQUET = "parquet"
    AVRO = "avro"


@dataclass
class ExportResult:
    success: bool
    destination: str
    records_exported: int
    bytes_written: int
    started_at: datetime
    completed_at: datetime
    error: Optional[str] = None

    @property
    def duration_seconds(self) -> float:
        return (self.completed_at - self.started_at).total_seconds()


class BaseExporter(ABC):
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"exporter.{name}")

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the export destination"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the export destination"""
        pass

    @abstractmethod
    async def export(
        self,
        data: List[Dict[str, Any]],
        table_name: str,
        format: ExportFormat = ExportFormat.JSON,
    ) -> ExportResult:
        """Export data to the destination"""
        pass

    @abstractmethod
    async def export_query(
        self,
        query: str,
        table_name: str,
        format: ExportFormat = ExportFormat.JSON,
    ) -> ExportResult:
        """Export data from a ClickHouse query to the destination"""
        pass

    async def health_check(self) -> bool:
        """Check if the exporter is healthy and connected"""
        try:
            return await self.connect()
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return False

    def _log_export_start(self, table_name: str, record_count: int):
        self.logger.info(f"Starting export to {table_name}: {record_count} records")

    def _log_export_complete(self, result: ExportResult):
        if result.success:
            self.logger.info(
                f"Export complete: {result.records_exported} records in {result.duration_seconds:.2f}s"
            )
        else:
            self.logger.error(f"Export failed: {result.error}")
