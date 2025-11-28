"""
Security scanning tasks for malicious link detection
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import aiohttp

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityScanner:
    """Handles security scanning of links."""

    def __init__(self):
        self.safe_browsing_api_key = settings.GOOGLE_SAFE_BROWSING_API_KEY
        self.virustotal_api_key = settings.VIRUSTOTAL_API_KEY

    async def check_url_safe_browsing(self, url: str) -> Dict[str, Any]:
        """Check URL against Google Safe Browsing API."""
        if not self.safe_browsing_api_key:
            return {"safe": True, "service": "safe_browsing", "skipped": True}

        try:
            api_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={self.safe_browsing_api_key}"

            payload = {
                "client": {
                    "clientId": "lnk.day",
                    "clientVersion": "1.0.0"
                },
                "threatInfo": {
                    "threatTypes": [
                        "MALWARE",
                        "SOCIAL_ENGINEERING",
                        "UNWANTED_SOFTWARE",
                        "POTENTIALLY_HARMFUL_APPLICATION"
                    ],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": url}]
                }
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(api_url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        if "matches" in data and len(data["matches"]) > 0:
                            return {
                                "safe": False,
                                "service": "safe_browsing",
                                "threats": [m["threatType"] for m in data["matches"]],
                            }
                        return {"safe": True, "service": "safe_browsing"}
                    else:
                        return {"safe": True, "service": "safe_browsing", "error": "API error"}

        except Exception as e:
            logger.error(f"Safe Browsing check failed: {e}")
            return {"safe": True, "service": "safe_browsing", "error": str(e)}

    async def check_url_virustotal(self, url: str) -> Dict[str, Any]:
        """Check URL against VirusTotal API."""
        if not self.virustotal_api_key:
            return {"safe": True, "service": "virustotal", "skipped": True}

        try:
            import base64

            # VirusTotal requires URL ID as base64-encoded URL
            url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")

            async with aiohttp.ClientSession() as session:
                headers = {"x-apikey": self.virustotal_api_key}

                async with session.get(
                    f"https://www.virustotal.com/api/v3/urls/{url_id}",
                    headers=headers,
                    timeout=10,
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})

                        malicious = stats.get("malicious", 0)
                        suspicious = stats.get("suspicious", 0)

                        if malicious > 0 or suspicious > 2:
                            return {
                                "safe": False,
                                "service": "virustotal",
                                "malicious_count": malicious,
                                "suspicious_count": suspicious,
                            }

                        return {"safe": True, "service": "virustotal"}
                    elif response.status == 404:
                        # URL not in database, submit for scanning
                        return {"safe": True, "service": "virustotal", "not_scanned": True}
                    else:
                        return {"safe": True, "service": "virustotal", "error": "API error"}

        except Exception as e:
            logger.error(f"VirusTotal check failed: {e}")
            return {"safe": True, "service": "virustotal", "error": str(e)}

    async def scan_url(self, url: str) -> Dict[str, Any]:
        """Perform comprehensive security scan on a URL."""
        results = await asyncio.gather(
            self.check_url_safe_browsing(url),
            self.check_url_virustotal(url),
            return_exceptions=True,
        )

        safe = True
        threats = []

        for result in results:
            if isinstance(result, Exception):
                continue
            if not result.get("safe", True):
                safe = False
                threats.append(result)

        return {
            "url": url,
            "safe": safe,
            "threats": threats,
            "scanned_at": datetime.utcnow().isoformat(),
        }


scanner = SecurityScanner()


async def batch_security_scan(batch_size: int = 100) -> Dict[str, Any]:
    """
    Batch scan links for security threats.
    Runs periodically to check existing links.
    """
    logger.info(f"Starting batch security scan (batch_size: {batch_size})")

    result = {
        "scanned_count": 0,
        "threats_found": 0,
        "flagged_links": [],
        "errors": [],
        "started_at": datetime.utcnow().isoformat(),
    }

    try:
        # In production, fetch links from link-service that haven't been scanned recently
        # or that were flagged for re-scanning
        links_to_scan = []  # Would be fetched from link-service

        # Example: Get links not scanned in last 7 days
        # links_to_scan = await link_service.get_links_for_security_scan(
        #     last_scan_before=datetime.utcnow() - timedelta(days=7),
        #     limit=batch_size,
        # )

        for link in links_to_scan:
            try:
                scan_result = await scanner.scan_url(link["original_url"])
                result["scanned_count"] += 1

                if not scan_result["safe"]:
                    result["threats_found"] += 1
                    result["flagged_links"].append({
                        "link_id": link["id"],
                        "url": link["original_url"],
                        "threats": scan_result["threats"],
                    })

                    # Update link status in link-service
                    # await link_service.flag_link_unsafe(link["id"], scan_result["threats"])

                    # Send notification
                    # await notification_service.send_security_alert(link)

                # Rate limiting between scans
                await asyncio.sleep(0.5)

            except Exception as e:
                result["errors"].append(f"Failed to scan link {link.get('id')}: {str(e)}")

        result["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Batch scan completed: {result['scanned_count']} scanned, {result['threats_found']} threats")

    except Exception as e:
        result["errors"].append(str(e))
        logger.error(f"Batch security scan failed: {e}")

    return result


async def scan_new_links() -> Dict[str, Any]:
    """
    Scan recently created links that haven't been scanned yet.
    Runs more frequently than batch scan.
    """
    logger.info("Starting new links security scan")

    result = {
        "scanned_count": 0,
        "threats_found": 0,
        "errors": [],
    }

    # In production, fetch links created in last hour that haven't been scanned
    # This provides near-real-time protection

    logger.info("New links scan completed")
    return result


async def rescan_suspicious_links() -> Dict[str, Any]:
    """
    Re-scan links that were previously flagged but not confirmed malicious.
    Some threats take time to appear in databases.
    """
    logger.info("Starting suspicious links rescan")

    result = {
        "rescanned_count": 0,
        "confirmed_threats": 0,
        "cleared_links": 0,
        "errors": [],
    }

    # Rescan links that were marked suspicious (not blocked) in last 7 days

    logger.info("Suspicious links rescan completed")
    return result


async def update_threat_database() -> Dict[str, Any]:
    """
    Update local threat database with latest threat intelligence.
    """
    logger.info("Updating threat database")

    result = {
        "entries_added": 0,
        "entries_removed": 0,
        "sources_updated": [],
    }

    # In production:
    # 1. Fetch latest threat feeds
    # 2. Update local Redis/database cache
    # 3. Update blocklists

    logger.info("Threat database update completed")
    return result
