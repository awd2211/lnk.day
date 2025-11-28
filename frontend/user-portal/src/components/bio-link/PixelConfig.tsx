import { BarChart3, Facebook, Play, Linkedin, Image, Ghost, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BioLinkPixelSettings } from '@/hooks/useBioLinks';

interface PixelConfigProps {
  pixels: BioLinkPixelSettings;
  onChange: (pixels: BioLinkPixelSettings) => void;
}

interface PixelField {
  key: keyof BioLinkPixelSettings;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  helpText: string;
}

const PIXEL_FIELDS: PixelField[] = [
  {
    key: 'googleAnalyticsId',
    label: 'Google Analytics',
    placeholder: 'G-XXXXXXXXXX',
    icon: <BarChart3 className="h-4 w-4" />,
    helpText: 'GA4 测量 ID，用于追踪网站流量',
  },
  {
    key: 'facebookPixelId',
    label: 'Facebook Pixel',
    placeholder: '1234567890123456',
    icon: <Facebook className="h-4 w-4" />,
    helpText: '用于 Facebook 广告转化追踪',
  },
  {
    key: 'tiktokPixelId',
    label: 'TikTok Pixel',
    placeholder: 'XXXXXXXXXXXXXXX',
    icon: <Play className="h-4 w-4" />,
    helpText: '用于 TikTok 广告转化追踪',
  },
  {
    key: 'linkedinInsightTag',
    label: 'LinkedIn Insight Tag',
    placeholder: '123456',
    icon: <Linkedin className="h-4 w-4" />,
    helpText: '用于 LinkedIn 广告转化追踪',
  },
  {
    key: 'pinterestTag',
    label: 'Pinterest Tag',
    placeholder: '1234567890123',
    icon: <Image className="h-4 w-4" />,
    helpText: '用于 Pinterest 广告转化追踪',
  },
  {
    key: 'snapchatPixelId',
    label: 'Snapchat Pixel',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    icon: <Ghost className="h-4 w-4" />,
    helpText: '用于 Snapchat 广告转化追踪',
  },
];

export default function PixelConfig({ pixels, onChange }: PixelConfigProps) {
  const updatePixel = (key: keyof BioLinkPixelSettings, value: string) => {
    onChange({
      ...pixels,
      [key]: value || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          第三方追踪像素
        </CardTitle>
        <CardDescription>
          添加追踪像素以监测广告效果和用户行为
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PIXEL_FIELDS.map((field) => (
          <div key={field.key}>
            <Label className="flex items-center gap-2 text-sm">
              {field.icon}
              {field.label}
            </Label>
            <Input
              value={pixels[field.key] || ''}
              onChange={(e) => updatePixel(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="mt-1"
            />
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              {field.helpText}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
