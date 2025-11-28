package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/lnkday/redirect-service/internal/model"
)

// VisitorContext represents all information about a visitor for rule matching
type VisitorContext struct {
	Country        string            `json:"country,omitempty"`
	Region         string            `json:"region,omitempty"`
	City           string            `json:"city,omitempty"`
	Continent      string            `json:"continent,omitempty"`
	DeviceType     string            `json:"deviceType,omitempty"`
	OS             string            `json:"os,omitempty"`
	OSVersion      string            `json:"osVersion,omitempty"`
	Browser        string            `json:"browser,omitempty"`
	BrowserVersion string            `json:"browserVersion,omitempty"`
	Language       string            `json:"language,omitempty"`
	Referrer       string            `json:"referrer,omitempty"`
	ReferrerDomain string            `json:"referrerDomain,omitempty"`
	UTMSource      string            `json:"utmSource,omitempty"`
	UTMMedium      string            `json:"utmMedium,omitempty"`
	UTMCampaign    string            `json:"utmCampaign,omitempty"`
	QueryParams    map[string]string `json:"queryParams,omitempty"`
	Timestamp      time.Time         `json:"timestamp,omitempty"`
}

// RuleMatchResult represents the result of rule evaluation
type RuleMatchResult struct {
	Matched           bool     `json:"matched"`
	TargetURL         string   `json:"targetUrl,omitempty"`
	MatchedConditions []string `json:"matchedConditions,omitempty"`
	RuleID            string   `json:"ruleId,omitempty"`
	RuleName          string   `json:"ruleName,omitempty"`
}

// RuleService handles redirect rule evaluation
type RuleService struct {
	linkServiceURL string
	httpClient     *http.Client
}

// NewRuleService creates a new rule service
func NewRuleService() *RuleService {
	linkServiceURL := os.Getenv("LINK_SERVICE_URL")
	if linkServiceURL == "" {
		linkServiceURL = "http://localhost:60003"
	}

	return &RuleService{
		linkServiceURL: linkServiceURL,
		httpClient: &http.Client{
			Timeout: 2 * time.Second, // Fast timeout for redirect performance
		},
	}
}

// EvaluateRules calls the link-service to evaluate redirect rules
func (s *RuleService) EvaluateRules(ctx context.Context, linkID string, visitorCtx *VisitorContext) (*RuleMatchResult, error) {
	url := fmt.Sprintf("%s/internal/redirect-rules/evaluate/%s", s.linkServiceURL, linkID)

	body, err := json.Marshal(visitorCtx)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal visitor context: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call link-service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("link-service returned status %d", resp.StatusCode)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result RuleMatchResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

// BuildVisitorContext constructs a visitor context from request information
func (s *RuleService) BuildVisitorContext(
	ip, userAgent, referer, acceptLanguage string,
	queryParams map[string]string,
	geoInfo *GeoInfo,
	deviceInfo *DeviceInfo,
) *VisitorContext {
	ctx := &VisitorContext{
		QueryParams: queryParams,
		Timestamp:   time.Now(),
	}

	// Geo info
	if geoInfo != nil {
		ctx.Country = geoInfo.Country
		ctx.Region = geoInfo.Region
		ctx.City = geoInfo.City
		ctx.Continent = geoInfo.Continent
	}

	// Device info
	if deviceInfo != nil {
		ctx.DeviceType = deviceInfo.DeviceType
		ctx.OS = deviceInfo.OS
		ctx.OSVersion = deviceInfo.OSVersion
		ctx.Browser = deviceInfo.Browser
		ctx.BrowserVersion = deviceInfo.BrowserVersion
	}

	// Referrer
	if referer != "" {
		ctx.Referrer = referer
		ctx.ReferrerDomain = extractDomain(referer)
	}

	// Language
	if acceptLanguage != "" {
		ctx.Language = parseAcceptLanguage(acceptLanguage)
	}

	// UTM parameters
	if queryParams != nil {
		ctx.UTMSource = queryParams["utm_source"]
		ctx.UTMMedium = queryParams["utm_medium"]
		ctx.UTMCampaign = queryParams["utm_campaign"]
	}

	return ctx
}

// GeoInfo holds geographic information about a visitor
type GeoInfo struct {
	Country   string
	Region    string
	City      string
	Continent string
}

// DeviceInfo holds device information about a visitor
type DeviceInfo struct {
	DeviceType     string // desktop, mobile, tablet
	OS             string // iOS, Android, Windows, macOS, Linux
	OSVersion      string
	Browser        string // Chrome, Safari, Firefox, Edge
	BrowserVersion string
}

// ParseUserAgent parses user agent string into device info
func ParseUserAgent(userAgent string) *DeviceInfo {
	ua := strings.ToLower(userAgent)
	info := &DeviceInfo{}

	// Detect device type
	if strings.Contains(ua, "mobile") {
		info.DeviceType = "mobile"
	} else if strings.Contains(ua, "tablet") || strings.Contains(ua, "ipad") {
		info.DeviceType = "tablet"
	} else {
		info.DeviceType = "desktop"
	}

	// Detect OS
	switch {
	case strings.Contains(ua, "iphone"):
		info.OS = "iOS"
		info.DeviceType = "mobile"
	case strings.Contains(ua, "ipad"):
		info.OS = "iOS"
		info.DeviceType = "tablet"
	case strings.Contains(ua, "android"):
		info.OS = "Android"
		if !strings.Contains(ua, "mobile") {
			info.DeviceType = "tablet"
		} else {
			info.DeviceType = "mobile"
		}
	case strings.Contains(ua, "windows"):
		info.OS = "Windows"
	case strings.Contains(ua, "macintosh") || strings.Contains(ua, "mac os"):
		info.OS = "macOS"
	case strings.Contains(ua, "linux"):
		info.OS = "Linux"
	}

	// Detect browser
	switch {
	case strings.Contains(ua, "edg/"):
		info.Browser = "Edge"
	case strings.Contains(ua, "chrome"):
		info.Browser = "Chrome"
	case strings.Contains(ua, "safari") && !strings.Contains(ua, "chrome"):
		info.Browser = "Safari"
	case strings.Contains(ua, "firefox"):
		info.Browser = "Firefox"
	case strings.Contains(ua, "opera") || strings.Contains(ua, "opr/"):
		info.Browser = "Opera"
	}

	return info
}

// ResolveTargetURL determines the final redirect URL based on all rules
func (s *RuleService) ResolveTargetURL(
	ctx context.Context,
	link *model.Link,
	visitorCtx *VisitorContext,
) string {
	// First, try advanced rules from link-service API
	result, err := s.EvaluateRules(ctx, link.ID, visitorCtx)
	if err == nil && result.Matched {
		return result.TargetURL
	}

	// Fall back to inline rules in link settings

	// Check time targeting first (highest priority for time-sensitive campaigns)
	if len(link.Settings.TimeTargeting) > 0 {
		for _, target := range link.Settings.TimeTargeting {
			if isTimeTargetActive(target, visitorCtx.Timestamp) {
				return target.TargetURL
			}
		}
	}

	// Check device targeting
	if len(link.Settings.DeviceTargeting) > 0 && visitorCtx.DeviceType != "" {
		for _, target := range link.Settings.DeviceTargeting {
			if strings.EqualFold(target.DeviceType, visitorCtx.DeviceType) {
				return target.TargetURL
			}
			// Also check OS
			if strings.EqualFold(target.DeviceType, visitorCtx.OS) {
				return target.TargetURL
			}
		}
	}

	// Check geo targeting
	if len(link.Settings.GeoTargeting) > 0 && visitorCtx.Country != "" {
		for _, target := range link.Settings.GeoTargeting {
			// Match country (required)
			if !strings.EqualFold(target.Country, visitorCtx.Country) {
				continue
			}
			// Match region (optional)
			if target.Region != "" && !strings.EqualFold(target.Region, visitorCtx.Region) {
				continue
			}
			// Match city (optional)
			if target.City != "" && !strings.EqualFold(target.City, visitorCtx.City) {
				continue
			}
			return target.TargetURL
		}
	}

	return link.OriginalURL
}

// Helper functions

func extractDomain(urlStr string) string {
	if urlStr == "" {
		return ""
	}
	u, err := url.Parse(urlStr)
	if err != nil {
		return ""
	}
	return strings.ToLower(u.Hostname())
}

func parseAcceptLanguage(acceptLanguage string) string {
	// Parse Accept-Language header, return primary language
	// Example: "zh-CN,zh;q=0.9,en;q=0.8" -> "zh"
	parts := strings.Split(acceptLanguage, ",")
	if len(parts) == 0 {
		return ""
	}
	lang := strings.TrimSpace(parts[0])
	langParts := strings.Split(lang, ";")
	if len(langParts) == 0 {
		return ""
	}
	return strings.TrimSpace(langParts[0])
}

func isTimeTargetActive(target model.TimeTarget, now time.Time) bool {
	// Get current time in target timezone
	loc := time.UTC
	if target.Timezone != "" {
		if tz, err := time.LoadLocation(target.Timezone); err == nil {
			loc = tz
		}
	}
	nowInTz := now.In(loc)

	// Check date range
	if target.StartDate != "" {
		startDate, err := time.ParseInLocation("2006-01-02", target.StartDate, loc)
		if err == nil && nowInTz.Before(startDate) {
			return false
		}
	}

	if target.EndDate != "" {
		endDate, err := time.ParseInLocation("2006-01-02", target.EndDate, loc)
		if err == nil {
			// End date is inclusive, so add one day
			endDate = endDate.Add(24 * time.Hour)
			if nowInTz.After(endDate) {
				return false
			}
		}
	}

	// Check daily time range (optional)
	if target.StartTime != "" && target.EndTime != "" {
		currentTime := nowInTz.Format("15:04")
		if currentTime < target.StartTime || currentTime > target.EndTime {
			return false
		}
	}

	return true
}
