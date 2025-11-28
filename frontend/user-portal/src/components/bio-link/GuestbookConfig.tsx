import { useState } from 'react';
import {
  MessageSquare,
  Settings,
  Shield,
  Bell,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface GuestbookSettings {
  enabled: boolean;
  requireApproval: boolean;
  requireEmail: boolean;
  allowAnonymous: boolean;
  allowReplies: boolean;
  maxLength: number;
  placeholder?: string;
  title?: string;
  emptyMessage?: string;
  successMessage?: string;
  enableLikes: boolean;
  enableEmojis: boolean;
  sortOrder: 'newest' | 'oldest' | 'popular';
  displayCount: number;
  showAvatars: boolean;
  enableNotifications: boolean;
  notificationEmail?: string;
  blockedWords?: string[];
  blockedIps?: string[];
}

interface GuestbookConfigProps {
  settings: GuestbookSettings | undefined;
  onChange: (settings: GuestbookSettings) => void;
}

const DEFAULT_SETTINGS: GuestbookSettings = {
  enabled: false,
  requireApproval: true,
  requireEmail: false,
  allowAnonymous: true,
  allowReplies: true,
  maxLength: 500,
  placeholder: '写下你的留言...',
  title: '访客留言',
  emptyMessage: '还没有留言，来第一个留言吧！',
  successMessage: '感谢你的留言！',
  enableLikes: true,
  enableEmojis: true,
  sortOrder: 'newest',
  displayCount: 20,
  showAvatars: true,
  enableNotifications: false,
  blockedWords: [],
  blockedIps: [],
};

export default function GuestbookConfig({ settings, onChange }: GuestbookConfigProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [blockedWordsText, setBlockedWordsText] = useState(
    (settings?.blockedWords || []).join('\n')
  );

  const config = { ...DEFAULT_SETTINGS, ...settings };

  const updateConfig = (updates: Partial<GuestbookSettings>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              访客留言
            </CardTitle>
            <CardDescription>
              让访客在你的页面留言互动
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
          {/* 基本设置 */}
          <div className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                placeholder="访客留言"
                className="mt-1"
              />
            </div>

            <div>
              <Label>输入框占位文字</Label>
              <Input
                value={config.placeholder || ''}
                onChange={(e) => updateConfig({ placeholder: e.target.value })}
                placeholder="写下你的留言..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>空状态提示</Label>
              <Input
                value={config.emptyMessage || ''}
                onChange={(e) => updateConfig({ emptyMessage: e.target.value })}
                placeholder="还没有留言，来第一个留言吧！"
                className="mt-1"
              />
            </div>

            <div>
              <Label>成功提示</Label>
              <Input
                value={config.successMessage || ''}
                onChange={(e) => updateConfig({ successMessage: e.target.value })}
                placeholder="感谢你的留言！"
                className="mt-1"
              />
            </div>
          </div>

          {/* 显示设置 */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4" />
              显示设置
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>显示头像</Label>
                <Switch
                  checked={config.showAvatars}
                  onCheckedChange={(showAvatars) => updateConfig({ showAvatars })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>启用点赞</Label>
                <Switch
                  checked={config.enableLikes}
                  onCheckedChange={(enableLikes) => updateConfig({ enableLikes })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>启用表情</Label>
                <Switch
                  checked={config.enableEmojis}
                  onCheckedChange={(enableEmojis) => updateConfig({ enableEmojis })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>允许回复</Label>
                <Switch
                  checked={config.allowReplies}
                  onCheckedChange={(allowReplies) => updateConfig({ allowReplies })}
                />
              </div>
            </div>

            <div>
              <Label>排序方式</Label>
              <Select
                value={config.sortOrder}
                onValueChange={(value: 'newest' | 'oldest' | 'popular') =>
                  updateConfig({ sortOrder: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新优先</SelectItem>
                  <SelectItem value="oldest">最早优先</SelectItem>
                  <SelectItem value="popular">最热门</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>显示数量: {config.displayCount} 条</Label>
              <Slider
                min={5}
                max={50}
                step={5}
                value={[config.displayCount]}
                onValueChange={(values) => {
                  const v = values[0];
                  if (v !== undefined) {
                    updateConfig({ displayCount: v });
                  }
                }}
                className="mt-2"
              />
            </div>

            <div>
              <Label>字数限制: {config.maxLength} 字</Label>
              <Slider
                min={100}
                max={2000}
                step={100}
                value={[config.maxLength]}
                onValueChange={(values) => {
                  const v = values[0];
                  if (v !== undefined) {
                    updateConfig({ maxLength: v });
                  }
                }}
                className="mt-2"
              />
            </div>
          </div>

          {/* 审核设置 */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" />
              审核设置
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>需要审核</Label>
                  <p className="text-xs text-muted-foreground">
                    留言需经过审核后才会显示
                  </p>
                </div>
                <Switch
                  checked={config.requireApproval}
                  onCheckedChange={(requireApproval) => updateConfig({ requireApproval })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>要求填写邮箱</Label>
                  <p className="text-xs text-muted-foreground">
                    访客必须填写邮箱才能留言
                  </p>
                </div>
                <Switch
                  checked={config.requireEmail}
                  onCheckedChange={(requireEmail) => updateConfig({ requireEmail })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>允许匿名</Label>
                  <p className="text-xs text-muted-foreground">
                    允许访客不填写姓名留言
                  </p>
                </div>
                <Switch
                  checked={config.allowAnonymous}
                  onCheckedChange={(allowAnonymous) => updateConfig({ allowAnonymous })}
                />
              </div>
            </div>
          </div>

          {/* 通知设置 */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" />
              通知设置
            </h4>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>新留言通知</Label>
                <p className="text-xs text-muted-foreground">
                  有新留言时发送邮件通知
                </p>
              </div>
              <Switch
                checked={config.enableNotifications}
                onCheckedChange={(enableNotifications) => updateConfig({ enableNotifications })}
              />
            </div>

            {config.enableNotifications && (
              <div>
                <Label>通知邮箱</Label>
                <Input
                  type="email"
                  value={config.notificationEmail || ''}
                  onChange={(e) => updateConfig({ notificationEmail: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* 高级设置 */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  高级设置
                </span>
                {isAdvancedOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div>
                <Label>屏蔽词 (每行一个)</Label>
                <Textarea
                  value={blockedWordsText}
                  onChange={(e) => {
                    setBlockedWordsText(e.target.value);
                    const words = e.target.value
                      .split('\n')
                      .map((w) => w.trim())
                      .filter(Boolean);
                    updateConfig({ blockedWords: words });
                  }}
                  placeholder="spam&#10;广告&#10;..."
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  包含这些词的留言将被自动拦截
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 状态指示 */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={config.requireApproval ? 'secondary' : 'outline'}>
                {config.requireApproval ? '需审核' : '自动发布'}
              </Badge>
              {config.requireEmail && (
                <Badge variant="secondary">需邮箱</Badge>
              )}
              {config.allowReplies && (
                <Badge variant="outline">允许回复</Badge>
              )}
              {config.enableLikes && (
                <Badge variant="outline">可点赞</Badge>
              )}
              {config.enableNotifications && (
                <Badge variant="secondary">邮件通知</Badge>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
