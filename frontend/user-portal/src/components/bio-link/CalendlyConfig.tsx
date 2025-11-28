import { Calendar, ExternalLink, HelpCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CalendlySettings {
  enabled: boolean;
  url: string;
  embedType: 'inline' | 'popup' | 'button';
  buttonText?: string;
  buttonColor?: string;
  hideDetails?: boolean;
  hideEventType?: boolean;
  hideLandingPage?: boolean;
  hideCookieBanner?: boolean;
  height?: number;
}

interface CalendlyConfigProps {
  settings: CalendlySettings | undefined;
  onChange: (settings: CalendlySettings) => void;
}

const DEFAULT_SETTINGS: CalendlySettings = {
  enabled: false,
  url: '',
  embedType: 'inline',
  buttonText: '预约会议',
  buttonColor: '#0069ff',
  hideDetails: false,
  hideEventType: false,
  hideLandingPage: false,
  hideCookieBanner: true,
  height: 630,
};

export default function CalendlyConfig({ settings, onChange }: CalendlyConfigProps) {
  const config = { ...DEFAULT_SETTINGS, ...settings };

  const updateConfig = (updates: Partial<CalendlySettings>) => {
    onChange({ ...config, ...updates });
  };

  const isValidUrl = (url: string) => {
    return url.includes('calendly.com/');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Calendly 预约
            </CardTitle>
            <CardDescription>
              让访客直接在页面上预约会议
            </CardDescription>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </CardHeader>

      {config.enabled && (
        <CardContent className="space-y-6">
          {/* Calendly URL */}
          <div>
            <Label className="flex items-center gap-2">
              Calendly 链接
              <a
                href="https://calendly.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Label>
            <Input
              value={config.url}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://calendly.com/your-username/30min"
              className="mt-1"
            />
            {config.url && !isValidUrl(config.url) && (
              <p className="mt-1 text-xs text-destructive">
                请输入有效的 Calendly 链接
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              从 Calendly 获取你的预约链接
            </p>
          </div>

          {/* Embed Type */}
          <div>
            <Label>嵌入方式</Label>
            <Select
              value={config.embedType}
              onValueChange={(value: 'inline' | 'popup' | 'button') =>
                updateConfig({ embedType: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inline">内嵌日历</SelectItem>
                <SelectItem value="popup">弹窗日历</SelectItem>
                <SelectItem value="button">仅按钮</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {config.embedType === 'inline' && '日历直接显示在页面中'}
              {config.embedType === 'popup' && '点击按钮后弹出日历窗口'}
              {config.embedType === 'button' && '点击按钮跳转到 Calendly 页面'}
            </p>
          </div>

          {/* Button Settings (for popup and button modes) */}
          {(config.embedType === 'popup' || config.embedType === 'button') && (
            <>
              <div>
                <Label>按钮文字</Label>
                <Input
                  value={config.buttonText || ''}
                  onChange={(e) => updateConfig({ buttonText: e.target.value })}
                  placeholder="预约会议"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>按钮颜色</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="color"
                    value={config.buttonColor || '#0069ff'}
                    onChange={(e) => updateConfig({ buttonColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={config.buttonColor || '#0069ff'}
                    onChange={(e) => updateConfig({ buttonColor: e.target.value })}
                    placeholder="#0069ff"
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}

          {/* Inline Height */}
          {config.embedType === 'inline' && (
            <div>
              <Label>嵌入高度: {config.height}px</Label>
              <Slider
                min={400}
                max={900}
                step={30}
                value={[config.height || 630]}
                onValueChange={(values) => {
                  const v = values[0];
                  if (v !== undefined) {
                    updateConfig({ height: v });
                  }
                }}
                className="mt-2"
              />
            </div>
          )}

          {/* Advanced Options */}
          <div className="space-y-3">
            <Label>高级选项</Label>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="text-sm">隐藏详情</span>
                <p className="text-xs text-muted-foreground">
                  隐藏事件描述信息
                </p>
              </div>
              <Switch
                checked={config.hideDetails}
                onCheckedChange={(hideDetails) => updateConfig({ hideDetails })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="text-sm">隐藏事件类型</span>
                <p className="text-xs text-muted-foreground">
                  不显示事件类型选择器
                </p>
              </div>
              <Switch
                checked={config.hideEventType}
                onCheckedChange={(hideEventType) => updateConfig({ hideEventType })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="text-sm">隐藏首页</span>
                <p className="text-xs text-muted-foreground">
                  直接进入日历选择
                </p>
              </div>
              <Switch
                checked={config.hideLandingPage}
                onCheckedChange={(hideLandingPage) => updateConfig({ hideLandingPage })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <span className="text-sm">隐藏 Cookie 提示</span>
                <p className="text-xs text-muted-foreground">
                  不显示 Calendly Cookie 横幅
                </p>
              </div>
              <Switch
                checked={config.hideCookieBanner}
                onCheckedChange={(hideCookieBanner) => updateConfig({ hideCookieBanner })}
              />
            </div>
          </div>

          {/* Preview hint */}
          {config.url && isValidUrl(config.url) && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {config.embedType === 'inline'
                    ? '日历将直接嵌入到页面中'
                    : config.embedType === 'popup'
                      ? `点击"${config.buttonText}"按钮将弹出预约窗口`
                      : `点击"${config.buttonText}"按钮将跳转到 Calendly`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
