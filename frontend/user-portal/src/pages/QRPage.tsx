import { useState, useRef } from 'react';
import {
  Download,
  Palette,
  RefreshCw,
  Upload,
  X,
  Settings,
  Square,
  Circle,
  Hexagon,
  QrCode,
  Layers,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { qrService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// QR 类型组件
import QRTypeSelector from '@/components/qr/QRTypeSelector';
import BatchQRGenerator from '@/components/qr/BatchQRGenerator';
import {
  QRContentType,
  PhoneContent,
  SMSContent,
  EmailContent,
  WiFiContent,
  VCardContent,
  CalendarContent,
  GeoContent,
  URLContent,
} from '@/components/qr/qr-types';
import {
  PhoneForm,
  SMSForm,
  EmailForm,
  WiFiForm,
  VCardForm,
  CalendarForm,
  GeoForm,
} from '@/components/qr/forms';

const presetColors = [
  { name: '经典黑', fg: '#000000', bg: '#FFFFFF' },
  { name: '深蓝', fg: '#1E40AF', bg: '#FFFFFF' },
  { name: '翠绿', fg: '#059669', bg: '#FFFFFF' },
  { name: '酒红', fg: '#991B1B', bg: '#FFFFFF' },
  { name: '紫罗兰', fg: '#7C3AED', bg: '#FFFFFF' },
  { name: '橙黄渐变', fg: '#F97316', bg: '#FEF3C7' },
  { name: '蓝紫渐变', fg: '#6366F1', bg: '#EDE9FE' },
  { name: '暗黑模式', fg: '#FFFFFF', bg: '#1F2937' },
];

const dotStyles = [
  { value: 'square', label: '方形', icon: Square },
  { value: 'rounded', label: '圆角', icon: Square },
  { value: 'dots', label: '圆点', icon: Circle },
  { value: 'classy', label: '优雅', icon: Hexagon },
];

const cornerStyles = [
  { value: 'square', label: '方形' },
  { value: 'dot', label: '圆点' },
  { value: 'extra-rounded', label: '大圆角' },
];

const errorCorrectionLevels = [
  { value: 'L', label: '低 (7%)', description: '小尺寸，轻微损坏可读' },
  { value: 'M', label: '中 (15%)', description: '平衡尺寸和容错' },
  { value: 'Q', label: '较高 (25%)', description: '适合带 Logo' },
  { value: 'H', label: '高 (30%)', description: '适合复杂背景' },
];

// 默认内容
const getDefaultContent = (type: QRContentType) => {
  switch (type) {
    case QRContentType.URL:
      return { url: '' };
    case QRContentType.PHONE:
      return { phone: '' };
    case QRContentType.SMS:
      return { phone: '', message: '' };
    case QRContentType.EMAIL:
      return { to: '', subject: '', body: '' };
    case QRContentType.WIFI:
      return { ssid: '', password: '', encryption: 'WPA' as const, hidden: false };
    case QRContentType.VCARD:
      return { firstName: '' };
    case QRContentType.CALENDAR:
      return { title: '', startTime: '', endTime: '', allDay: false };
    case QRContentType.GEO:
      return { latitude: 0, longitude: 0, query: '' };
    default:
      return { url: '' };
  }
};

export default function QRPage() {
  // 内容类型
  const [contentType, setContentType] = useState<QRContentType>(QRContentType.URL);
  const [urlContent, setUrlContent] = useState<URLContent>({ url: '' });
  const [phoneContent, setPhoneContent] = useState<PhoneContent>({ phone: '' });
  const [smsContent, setSmsContent] = useState<SMSContent>({ phone: '', message: '' });
  const [emailContent, setEmailContent] = useState<EmailContent>({ to: '', subject: '', body: '' });
  const [wifiContent, setWifiContent] = useState<WiFiContent>({ ssid: '', password: '', encryption: 'WPA', hidden: false });
  const [vcardContent, setVcardContent] = useState<VCardContent>({ firstName: '' });
  const [calendarContent, setCalendarContent] = useState<CalendarContent>({ title: '', startTime: '', endTime: '', allDay: false });
  const [geoContent, setGeoContent] = useState<GeoContent>({ latitude: 0, longitude: 0, query: '' });

  // 样式设置
  const [size, setSize] = useState(300);
  const [margin, setMargin] = useState(2);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [dotStyle, setDotStyle] = useState('square');
  const [cornerStyle, setCornerStyle] = useState('square');
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Logo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(20);

  const { toast } = useToast();

  // 获取当前内容
  const getCurrentContent = () => {
    switch (contentType) {
      case QRContentType.URL:
        return urlContent;
      case QRContentType.PHONE:
        return phoneContent;
      case QRContentType.SMS:
        return smsContent;
      case QRContentType.EMAIL:
        return emailContent;
      case QRContentType.WIFI:
        return wifiContent;
      case QRContentType.VCARD:
        return vcardContent;
      case QRContentType.CALENDAR:
        return calendarContent;
      case QRContentType.GEO:
        return geoContent;
      default:
        return urlContent;
    }
  };

  // 验证内容是否完整
  const validateContent = (): boolean => {
    switch (contentType) {
      case QRContentType.URL:
        return !!urlContent.url;
      case QRContentType.PHONE:
        return !!phoneContent.phone;
      case QRContentType.SMS:
        return !!smsContent.phone;
      case QRContentType.EMAIL:
        return !!emailContent.to;
      case QRContentType.WIFI:
        return !!wifiContent.ssid;
      case QRContentType.VCARD:
        return !!vcardContent.firstName;
      case QRContentType.CALENDAR:
        return !!calendarContent.title && !!calendarContent.startTime && !!calendarContent.endTime;
      case QRContentType.GEO:
        return geoContent.latitude !== 0 || geoContent.longitude !== 0;
      default:
        return false;
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: '请上传图片文件', variant: 'destructive' });
        return;
      }
      if (file.size > 500 * 1024) {
        toast({ title: 'Logo 文件不能超过 500KB', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);

      if (errorCorrection === 'L' || errorCorrection === 'M') {
        setErrorCorrection('Q');
        toast({ title: '已自动调高纠错级别', description: '添加 Logo 时建议使用较高纠错' });
      }
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateQR = async () => {
    if (!validateContent()) {
      toast({ title: '请填写必填字段', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await qrService.generateTyped({
        contentType,
        content: getCurrentContent(),
        options: {
          size,
          foregroundColor: fgColor,
          backgroundColor: bgColor,
          margin,
          errorCorrectionLevel: errorCorrection as 'L' | 'M' | 'Q' | 'H',
        },
      });

      const url = URL.createObjectURL(response.data);
      setQrImage(url);
    } catch (error) {
      toast({ title: '生成失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = (format: 'png' | 'svg' | 'jpg') => {
    if (!qrImage) return;

    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `qrcode-${contentType}-${Date.now()}.${format}`;
    link.click();
  };

  const applyPreset = (preset: typeof presetColors[0]) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  // 获取内容类型的中文名
  const getContentTypeName = (type: QRContentType) => {
    const names: Record<QRContentType, string> = {
      [QRContentType.URL]: 'URL 链接',
      [QRContentType.PHONE]: '电话',
      [QRContentType.SMS]: '短信',
      [QRContentType.EMAIL]: '邮件',
      [QRContentType.WIFI]: 'WiFi',
      [QRContentType.VCARD]: '电子名片',
      [QRContentType.CALENDAR]: '日历事件',
      [QRContentType.GEO]: '地理位置',
    };
    return names[type] || type;
  };

  // 渲染内容表单
  const renderContentForm = () => {
    switch (contentType) {
      case QRContentType.URL:
        return (
          <div>
            <Label htmlFor="url">URL / 内容 *</Label>
            <Input
              id="url"
              value={urlContent.url}
              onChange={(e) => setUrlContent({ url: e.target.value })}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
        );
      case QRContentType.PHONE:
        return <PhoneForm value={phoneContent} onChange={setPhoneContent} />;
      case QRContentType.SMS:
        return <SMSForm value={smsContent} onChange={setSmsContent} />;
      case QRContentType.EMAIL:
        return <EmailForm value={emailContent} onChange={setEmailContent} />;
      case QRContentType.WIFI:
        return <WiFiForm value={wifiContent} onChange={setWifiContent} />;
      case QRContentType.VCARD:
        return <VCardForm value={vcardContent} onChange={setVcardContent} />;
      case QRContentType.CALENDAR:
        return <CalendarForm value={calendarContent} onChange={setCalendarContent} />;
      case QRContentType.GEO:
        return <GeoForm value={geoContent} onChange={setGeoContent} />;
      default:
        return null;
    }
  };

  // 页面模式：单个 / 批量
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">二维码生成器</h1>
        <p className="text-gray-500">支持多种内容类型，自定义样式，批量生成</p>
      </div>

      {/* 模式切换 */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border bg-white p-1">
          <button
            onClick={() => setMode('single')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'single'
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <QrCode className="h-4 w-4" />
            单个生成
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'batch'
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            批量生成
          </button>
        </div>
      </div>

      {/* 批量生成模式 */}
      {mode === 'batch' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <BatchQRGenerator />
        </div>
      )}

      {/* 单个生成模式 */}
      {mode === 'single' && (
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* 类型选择器 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <Label className="mb-3 block font-medium">选择内容类型</Label>
            <QRTypeSelector value={contentType} onChange={setContentType} />
          </div>

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">
                内容设置
              </TabsTrigger>
              <TabsTrigger value="style" className="flex-1">
                样式定制
              </TabsTrigger>
              <TabsTrigger value="logo" className="flex-1">
                Logo
              </TabsTrigger>
            </TabsList>

            {/* Content Settings */}
            <TabsContent value="content" className="mt-4 space-y-4">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {getContentTypeName(contentType)}
                  </span>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {renderContentForm()}
                </div>
              </div>

              {/* 尺寸和基本设置 */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="size">尺寸</Label>
                      <span className="text-sm text-gray-500">{size}px</span>
                    </div>
                    <Slider
                      id="size"
                      min={100}
                      max={1000}
                      step={50}
                      value={[size]}
                      onValueChange={(values) => values[0] !== undefined && setSize(values[0])}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="margin">边距</Label>
                      <span className="text-sm text-gray-500">{margin} 模块</span>
                    </div>
                    <Slider
                      id="margin"
                      min={0}
                      max={10}
                      step={1}
                      value={[margin]}
                      onValueChange={(values) => values[0] !== undefined && setMargin(values[0])}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>纠错级别</Label>
                    <Select value={errorCorrection} onValueChange={setErrorCorrection}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {errorCorrectionLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div>
                              <span className="font-medium">{level.label}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {level.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Style Settings */}
            <TabsContent value="style" className="mt-4 space-y-4">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="space-y-4">
                  {/* Preset Colors */}
                  <div>
                    <Label className="mb-2 block">预设配色</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {presetColors.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(preset)}
                          className="flex flex-col items-center gap-1 rounded border p-2 text-xs hover:bg-gray-50 transition-colors"
                          style={{
                            borderColor:
                              fgColor === preset.fg && bgColor === preset.bg
                                ? '#3b82f6'
                                : undefined,
                          }}
                        >
                          <div className="flex gap-1">
                            <div
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: preset.fg }}
                            />
                            <div
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: preset.bg }}
                            />
                          </div>
                          <span className="truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="fgColor">前景色</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="fgColor"
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="h-10 w-10 cursor-pointer rounded border"
                        />
                        <Input
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bgColor">背景色</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="bgColor"
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-10 w-10 cursor-pointer rounded border"
                        />
                        <Input
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dot Style */}
                  <div>
                    <Label className="mb-2 block">点阵样式</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {dotStyles.map((style) => {
                        const Icon = style.icon;
                        return (
                          <button
                            key={style.value}
                            onClick={() => setDotStyle(style.value)}
                            className={`flex flex-col items-center gap-1 rounded border p-3 text-xs transition-colors ${
                              dotStyle === style.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{style.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Corner Style */}
                  <div>
                    <Label className="mb-2 block">定位角样式</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {cornerStyles.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setCornerStyle(style.value)}
                          className={`rounded border px-3 py-2 text-sm transition-colors ${
                            cornerStyle === style.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Logo Settings */}
            <TabsContent value="logo" className="mt-4 space-y-4">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <Label className="mb-2 block">上传 Logo</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />

                    {logoPreview ? (
                      <div className="relative inline-block">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-24 w-24 rounded-lg border object-contain"
                        />
                        <button
                          onClick={removeLogo}
                          className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-1 text-sm text-gray-500">点击上传 Logo</p>
                          <p className="text-xs text-gray-400">PNG, JPG, SVG (最大 500KB)</p>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Logo Size */}
                  {logoPreview && (
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Logo 大小</Label>
                        <span className="text-sm text-gray-500">{logoSize}%</span>
                      </div>
                      <Slider
                        min={10}
                        max={40}
                        step={5}
                        value={[logoSize]}
                        onValueChange={(values) => values[0] !== undefined && setLogoSize(values[0])}
                        className="mt-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Logo 过大可能影响扫码识别
                      </p>
                    </div>
                  )}

                  {/* Tips */}
                  <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                    <Settings className="mb-2 h-5 w-5" />
                    <p className="font-medium">添加 Logo 提示</p>
                    <ul className="mt-2 space-y-1 text-xs text-blue-600">
                      <li>建议使用方形或圆形 Logo</li>
                      <li>推荐使用透明背景 PNG</li>
                      <li>Logo 大小建议 15-25%</li>
                      <li>已自动提高纠错级别以确保可读性</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={generateQR} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              '生成二维码'
            )}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">预览</h2>
          <div
            className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed"
            style={{ backgroundColor: bgColor }}
          >
            {qrImage ? (
              <img
                src={qrImage}
                alt="QR Code"
                className="max-w-full"
                style={{ maxHeight: '350px' }}
              />
            ) : (
              <div className="text-center text-gray-400">
                <Palette className="mx-auto mb-2 h-12 w-12" />
                <p>填写内容后点击生成</p>
                <p className="mt-1 text-sm">支持 URL、电话、WiFi、名片等多种类型</p>
              </div>
            )}
          </div>

          {qrImage && (
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <Button onClick={() => downloadQR('png')} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadQR('svg')}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  SVG
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadQR('jpg')}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  JPG
                </Button>
              </div>
              <Button variant="ghost" onClick={generateQR} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                重新生成
              </Button>
            </div>
          )}

          {/* Current Settings Summary */}
          {qrImage && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
              <p className="font-medium text-gray-700">当前设置</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-gray-600">
                <div>类型: {getContentTypeName(contentType)}</div>
                <div>尺寸: {size}px</div>
                <div>边距: {margin}</div>
                <div>纠错: {errorCorrection}</div>
                <div className="flex items-center gap-1">
                  前景:
                  <span
                    className="inline-block h-4 w-4 rounded border"
                    style={{ backgroundColor: fgColor }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  背景:
                  <span
                    className="inline-block h-4 w-4 rounded border"
                    style={{ backgroundColor: bgColor }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </Layout>
  );
}
