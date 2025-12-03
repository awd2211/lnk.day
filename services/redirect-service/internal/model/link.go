package model

import "time"

type Link struct {
	ID          string                 `json:"id"`
	ShortCode   string                 `json:"shortCode"`
	OriginalURL string                 `json:"originalUrl"`
	Domain      string                 `json:"domain"`
	TeamID      string                 `json:"teamId"`
	UserID      string                 `json:"userId"`
	Status      string                 `json:"status"`
	Settings    LinkSettings           `json:"settings"`
	ExpiresAt   *time.Time             `json:"expiresAt"`
}

type LinkSettings struct {
	PasswordProtected bool           `json:"passwordProtected"`
	Password          string         `json:"password,omitempty"`
	GeoTargeting      []GeoTarget    `json:"geoTargeting"`
	DeviceTargeting   []DeviceTarget `json:"deviceTargeting"`
	TimeTargeting     []TimeTarget   `json:"timeTargeting"`
	Cloaking          bool           `json:"cloaking"`
}

type GeoTarget struct {
	Country   string `json:"country"`
	Region    string `json:"region,omitempty"`
	City      string `json:"city,omitempty"`
	TargetURL string `json:"targetUrl"`
}

type DeviceTarget struct {
	DeviceType string `json:"deviceType"`
	TargetURL  string `json:"targetUrl"`
}

type TimeTarget struct {
	StartDate string `json:"startDate"` // YYYY-MM-DD
	EndDate   string `json:"endDate"`   // YYYY-MM-DD
	StartTime string `json:"startTime"` // HH:MM (optional, for daily time range)
	EndTime   string `json:"endTime"`   // HH:MM (optional)
	Timezone  string `json:"timezone"`  // e.g. "Asia/Shanghai"
	TargetURL string `json:"targetUrl"`
}

type ClickEvent struct {
	ID           string    `json:"id"`
	LinkID       string    `json:"linkId"`
	TeamID       string    `json:"teamId"`
	ShortCode    string    `json:"shortCode"`
	Timestamp    time.Time `json:"timestamp"`
	IP           string    `json:"ip"`
	UserAgent    string    `json:"userAgent"`
	Referer      string    `json:"referer"`
	Country      string    `json:"country"`
	Region       string    `json:"region"`
	City         string    `json:"city"`
	DeviceType   string    `json:"deviceType"`
	Device       string    `json:"device"`
	Browser      string    `json:"browser"`
	OS           string    `json:"os"`
	Language     string    `json:"language"`
	UTMSource    string    `json:"utmSource"`
	UTMMedium    string    `json:"utmMedium"`
	UTMCampaign  string    `json:"utmCampaign"`
	TargetURL    string    `json:"targetUrl"`
	RuleMatched  bool      `json:"ruleMatched"`
}
