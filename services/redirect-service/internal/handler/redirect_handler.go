package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"github.com/lnkday/redirect-service/internal/model"
	"github.com/lnkday/redirect-service/internal/service"
)

type RedirectHandler struct {
	linkService      *service.LinkService
	analyticsService *service.AnalyticsService
	ruleService      *service.RuleService
}

func NewRedirectHandler(ls *service.LinkService, as *service.AnalyticsService, rs *service.RuleService) *RedirectHandler {
	return &RedirectHandler{
		linkService:      ls,
		analyticsService: as,
		ruleService:      rs,
	}
}

func (h *RedirectHandler) Redirect(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Short code is required",
		})
	}

	// Get link from service
	link, err := h.linkService.GetByShortCode(c.Context(), code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Internal server error",
		})
	}

	if link == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Link not found",
		})
	}

	// Check if link is active
	if link.Status != "ACTIVE" {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"error": "Link is not active",
		})
	}

	// Check if link is expired
	if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"error": "Link has expired",
		})
	}

	// Check password protection
	if link.Settings.PasswordProtected && link.Settings.Password != "" {
		password := c.Query("p")
		if password == "" {
			// Return password required page
			return h.renderPasswordPage(c, code)
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(link.Settings.Password), []byte(password)); err != nil {
			return h.renderPasswordPage(c, code)
		}
	}

	// Build visitor context for rule matching
	queryParams := make(map[string]string)
	c.Request().URI().QueryArgs().VisitAll(func(key, value []byte) {
		queryParams[string(key)] = string(value)
	})

	// Parse geo and device info
	country, region, city := h.analyticsService.ParseGeoIP(c.IP())
	geoInfo := &service.GeoInfo{
		Country: country,
		Region:  region,
		City:    city,
	}
	deviceInfo := service.ParseUserAgent(c.Get("User-Agent"))

	visitorCtx := h.ruleService.BuildVisitorContext(
		c.IP(),
		c.Get("User-Agent"),
		c.Get("Referer"),
		c.Get("Accept-Language"),
		queryParams,
		geoInfo,
		deviceInfo,
	)

	// Determine redirect URL based on targeting rules
	redirectURL := h.ruleService.ResolveTargetURL(c.Context(), link, visitorCtx)

	// Track click asynchronously
	go func() {
		event := &model.ClickEvent{
			LinkID:       link.ID,
			ShortCode:    code,
			IP:           c.IP(),
			UserAgent:    c.Get("User-Agent"),
			Referer:      c.Get("Referer"),
			Country:      geoInfo.Country,
			Region:       geoInfo.Region,
			City:         geoInfo.City,
			DeviceType:   deviceInfo.DeviceType,
			OS:           deviceInfo.OS,
			Browser:      deviceInfo.Browser,
			Language:     visitorCtx.Language,
			UTMSource:    visitorCtx.UTMSource,
			UTMMedium:    visitorCtx.UTMMedium,
			UTMCampaign:  visitorCtx.UTMCampaign,
			TargetURL:    redirectURL,
			RuleMatched:  redirectURL != link.OriginalURL,
		}

		h.analyticsService.TrackClick(event)
		h.linkService.IncrementClicks(c.Context(), link.ID)
	}()

	// Perform redirect
	return c.Redirect(redirectURL, fiber.StatusFound)
}

func (h *RedirectHandler) VerifyPassword(c *fiber.Ctx) error {
	code := c.Params("code")
	password := c.FormValue("password")

	if code == "" || password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Code and password are required",
		})
	}

	link, err := h.linkService.GetByShortCode(c.Context(), code)
	if err != nil || link == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Link not found",
		})
	}

	if !link.Settings.PasswordProtected {
		return c.Redirect("/"+code, fiber.StatusFound)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(link.Settings.Password), []byte(password)); err != nil {
		return h.renderPasswordPage(c, code)
	}

	// Redirect with password in query param (short-lived)
	return c.Redirect("/"+code+"?p="+password, fiber.StatusFound)
}

func (h *RedirectHandler) renderPasswordPage(c *fiber.Ctx, code string) error {
	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Required</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 90%;
        }
        h1 { color: #333; margin-bottom: 0.5rem; font-size: 1.5rem; }
        p { color: #666; margin-bottom: 1.5rem; }
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e1e1;
            border-radius: 8px;
            font-size: 1rem;
            margin-bottom: 1rem;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
        }
        button:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Password Required</h1>
        <p>This link is protected. Please enter the password to continue.</p>
        <form method="POST" action="/` + code + `/verify">
            <input type="password" name="password" placeholder="Enter password" required autofocus>
            <button type="submit">Continue</button>
        </form>
    </div>
</body>
</html>`

	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(html)
}
