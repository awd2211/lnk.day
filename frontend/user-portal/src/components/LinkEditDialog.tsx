import { useState, useEffect } from 'react';
import { X, Plus, Calendar as CalendarIcon, Lock, Globe, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/hooks/useLinks';

interface LinkEditDialogProps {
  link: Link | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Link> & { settings?: LinkSettings }) => Promise<void>;
  saving?: boolean;
}

interface LinkSettings {
  passwordProtected?: boolean;
  password?: string;
  expiresAt?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export function LinkEditDialog({
  link,
  open,
  onOpenChange,
  onSave,
  saving,
}: LinkEditDialogProps) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Advanced settings
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  useEffect(() => {
    if (link) {
      setOriginalUrl(link.originalUrl);
      setShortCode(link.shortCode);
      setTitle(link.title || '');
      setTags(link.tags || []);
      // Reset advanced settings
      setPasswordProtected(false);
      setPassword('');
      setHasExpiry(false);
      setExpiryDate(undefined);
      setUtmSource('');
      setUtmMedium('');
      setUtmCampaign('');
    }
  }, [link]);

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const settings: LinkSettings = {};
    if (passwordProtected && password) {
      settings.passwordProtected = true;
      settings.password = password;
    }
    if (hasExpiry && expiryDate) {
      settings.expiresAt = expiryDate.toISOString();
    }
    if (utmSource || utmMedium || utmCampaign) {
      settings.utmParams = {
        source: utmSource || undefined,
        medium: utmMedium || undefined,
        campaign: utmCampaign || undefined,
      };
    }

    await onSave({
      originalUrl,
      title: title || undefined,
      tags,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
    });
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑链接</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="protection">保护设置</TabsTrigger>
              <TabsTrigger value="utm">UTM 参数</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="originalUrl">原链接</Label>
                <Input
                  id="originalUrl"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="shortCode">短码</Label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                    lnk.day/
                  </span>
                  <Input
                    id="shortCode"
                    value={shortCode}
                    disabled
                    className="rounded-l-none bg-muted"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">短码创建后无法修改</p>
              </div>

              <div>
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="链接标题（可选）"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>标签</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="添加标签"
                      className="h-7 w-24"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTag}
                      className="h-7"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="protection" className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">密码保护</p>
                    <p className="text-sm text-muted-foreground">访问链接时需要输入密码</p>
                  </div>
                </div>
                <Switch checked={passwordProtected} onCheckedChange={setPasswordProtected} />
              </div>

              {passwordProtected && (
                <div className="pl-12">
                  <Label htmlFor="password">访问密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="设置访问密码"
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">过期时间</p>
                    <p className="text-sm text-muted-foreground">链接将在指定日期后失效</p>
                  </div>
                </div>
                <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
              </div>

              {hasExpiry && (
                <div className="pl-12">
                  <Label>选择过期日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="mt-1 w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate
                          ? format(expiryDate, 'PPP', { locale: zhCN })
                          : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </TabsContent>

            <TabsContent value="utm" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                UTM 参数用于追踪营销活动效果，参数将自动附加到目标 URL
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="utmSource">utm_source</Label>
                  <Input
                    id="utmSource"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    placeholder="例如：google, newsletter"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="utmMedium">utm_medium</Label>
                  <Input
                    id="utmMedium"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                    placeholder="例如：cpc, email"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="utmCampaign">utm_campaign</Label>
                  <Input
                    id="utmCampaign"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="例如：spring_sale"
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
