import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Palette,
  Link2,
  Type,
  Image,
  Video,
  Share2,
  Minus,
  Mail,
  Phone,
  MapPin,
  Music,
  Youtube,
  ExternalLink,
  Smartphone,
  Monitor,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  useBioLink,
  useUpdateBioLink,
  BioLink,
  BioLinkBlock,
  BioLinkTheme,
  BioLinkPixelSettings,
  ABTestConfig as ABTestConfigType,
  GuestbookSettings,
  CalendlySettings,
  BlockType,
  BLOCK_TYPE_LABELS,
  DEFAULT_THEMES,
  SOCIAL_PLATFORMS,
} from '@/hooks/useBioLinks';
import PixelConfig from '@/components/bio-link/PixelConfig';
import ABTestConfig from '@/components/bio-link/ABTestConfig';
import GuestbookConfig from '@/components/bio-link/GuestbookConfig';
import CalendlyConfig from '@/components/bio-link/CalendlyConfig';
import { cn } from '@/lib/utils';

const BlockIcon = ({ type }: { type: BlockType }) => {
  const iconClass = 'h-4 w-4';
  switch (type) {
    case 'link':
      return <Link2 className={iconClass} />;
    case 'header':
    case 'text':
      return <Type className={iconClass} />;
    case 'image':
      return <Image className={iconClass} />;
    case 'video':
      return <Video className={iconClass} />;
    case 'social':
      return <Share2 className={iconClass} />;
    case 'divider':
      return <Minus className={iconClass} />;
    case 'email':
      return <Mail className={iconClass} />;
    case 'contact':
      return <Phone className={iconClass} />;
    case 'map':
      return <MapPin className={iconClass} />;
    case 'spotify':
      return <Music className={iconClass} />;
    case 'youtube':
      return <Youtube className={iconClass} />;
    default:
      return <Settings className={iconClass} />;
  }
};

export default function BioLinkEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [editingBlock, setEditingBlock] = useState<BioLinkBlock | null>(null);
  const [isBlockSheetOpen, setIsBlockSheetOpen] = useState(false);
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for editing
  const [localBioLink, setLocalBioLink] = useState<BioLink | null>(null);

  // Queries
  const { data: bioLink, isLoading } = useBioLink(id || null);

  // Initialize local state
  useState(() => {
    if (bioLink && !localBioLink) {
      setLocalBioLink(bioLink);
    }
  });

  // Mutation
  const updateBioLink = useUpdateBioLink();

  // Update local state when data loads
  if (bioLink && !localBioLink) {
    setLocalBioLink(bioLink);
  }

  const updateLocalBioLink = useCallback((updates: Partial<BioLink>) => {
    setLocalBioLink((prev) => (prev ? { ...prev, ...updates } : null));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!localBioLink || !id) return;

    try {
      await updateBioLink.mutateAsync({
        id,
        data: {
          title: localBioLink.title,
          description: localBioLink.description,
          avatarUrl: localBioLink.avatarUrl,
          blocks: localBioLink.blocks,
          theme: localBioLink.theme,
          seo: localBioLink.seo,
          pixels: localBioLink.pixels,
          abTest: localBioLink.abTest,
          guestbook: localBioLink.guestbook,
          calendly: localBioLink.calendly,
        },
      });
      setHasChanges(false);
      toast({ title: '保存成功' });
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    }
  };

  const addBlock = (type: BlockType) => {
    if (!localBioLink) return;

    const newBlock: BioLinkBlock = {
      id: `block-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      isVisible: true,
      sortOrder: localBioLink.blocks.length,
    };

    updateLocalBioLink({
      blocks: [...localBioLink.blocks, newBlock],
    });

    setEditingBlock(newBlock);
    setIsBlockSheetOpen(true);
  };

  const getDefaultContent = (type: BlockType): Record<string, any> => {
    switch (type) {
      case 'link':
        return { url: '', title: '新链接', icon: '' };
      case 'header':
        return { text: '标题' };
      case 'text':
        return { text: '描述文字' };
      case 'image':
        return { url: '', alt: '' };
      case 'video':
        return { url: '', autoplay: false };
      case 'social':
        return { platforms: [] };
      case 'divider':
        return { style: 'line' };
      case 'email':
        return { placeholder: '输入邮箱订阅', buttonText: '订阅' };
      case 'contact':
        return { phone: '', email: '', address: '' };
      case 'map':
        return { address: '', zoom: 15 };
      case 'spotify':
        return { embedUrl: '' };
      case 'youtube':
        return { videoId: '' };
      default:
        return {};
    }
  };

  const updateBlock = (blockId: string, updates: Partial<BioLinkBlock>) => {
    if (!localBioLink) return;

    updateLocalBioLink({
      blocks: localBioLink.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    });
  };

  const deleteBlock = (blockId: string) => {
    if (!localBioLink) return;

    updateLocalBioLink({
      blocks: localBioLink.blocks.filter((b) => b.id !== blockId),
    });

    if (editingBlock?.id === blockId) {
      setEditingBlock(null);
      setIsBlockSheetOpen(false);
    }
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!localBioLink) return;

    const blocks = [...localBioLink.blocks];
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const currentBlock = blocks[index];
    const targetBlock = blocks[newIndex];
    if (!currentBlock || !targetBlock) return;

    blocks[index] = targetBlock;
    blocks[newIndex] = currentBlock;

    updateLocalBioLink({
      blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
    });
  };

  const applyTheme = (theme: BioLinkTheme) => {
    updateLocalBioLink({ theme });
  };

  if (isLoading || !localBioLink) {
    return (
      <Layout>
        <div className="flex h-full">
          <div className="w-80 border-r p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-4 h-64 w-full" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="mx-auto h-[600px] w-[375px]" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Editor */}
        <div className="flex w-80 flex-col border-r bg-muted/30">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/bio-links')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">编辑页面</span>
            </div>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateBioLink.isPending}>
              {updateBioLink.isPending ? (
                '保存中...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="blocks" className="flex-1 overflow-hidden">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="blocks" className="flex-1">
                区块
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                设置
              </TabsTrigger>
              <TabsTrigger value="theme" className="flex-1">
                主题
              </TabsTrigger>
            </TabsList>

            {/* Blocks Tab */}
            <TabsContent value="blocks" className="m-0 flex-1 overflow-y-auto p-4">
              {/* Add block buttons */}
              <div className="mb-4 grid grid-cols-3 gap-2">
                {(['link', 'header', 'text', 'image', 'social', 'divider'] as BlockType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <BlockIcon type={type} />
                      {BLOCK_TYPE_LABELS[type].label}
                    </button>
                  )
                )}
              </div>

              {/* Blocks list */}
              <div className="space-y-2">
                {localBioLink.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg border bg-background p-2 transition-colors',
                      editingBlock?.id === block.id && 'border-primary',
                      !block.isVisible && 'opacity-50'
                    )}
                  >
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BlockIcon type={block.type} />
                        <span className="text-sm font-medium">
                          {BLOCK_TYPE_LABELS[block.type].label}
                        </span>
                        {!block.isVisible && (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {block.content?.title && (
                        <p className="truncate text-xs text-muted-foreground">
                          {block.content?.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={index === localBioLink.blocks.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingBlock(block);
                          setIsBlockSheetOpen(true);
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteBlock(block.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {localBioLink.blocks.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    点击上方按钮添加区块
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="m-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <Label>页面标题</Label>
                  <Input
                    value={localBioLink.title}
                    onChange={(e) => updateLocalBioLink({ title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>简介</Label>
                  <Textarea
                    value={localBioLink.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateLocalBioLink({ description: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>头像 URL</Label>
                  <Input
                    value={localBioLink.avatarUrl || ''}
                    onChange={(e) => updateLocalBioLink({ avatarUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-medium">SEO 设置</Label>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label className="text-xs">页面标题</Label>
                      <Input
                        value={localBioLink.seo?.title || ''}
                        onChange={(e) =>
                          updateLocalBioLink({
                            seo: { ...localBioLink.seo, title: e.target.value },
                          })
                        }
                        placeholder={localBioLink.title}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">描述</Label>
                      <Textarea
                        value={localBioLink.seo?.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          updateLocalBioLink({
                            seo: { ...localBioLink.seo, description: e.target.value },
                          })
                        }
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <PixelConfig
                    pixels={localBioLink.pixels || {}}
                    onChange={(pixels) => updateLocalBioLink({ pixels })}
                  />
                </div>

                <div className="border-t pt-4">
                  <ABTestConfig
                    abTest={localBioLink.abTest}
                    currentTheme={localBioLink.theme}
                    onChange={(abTest) => updateLocalBioLink({ abTest })}
                  />
                </div>

                <div className="border-t pt-4">
                  <GuestbookConfig
                    settings={localBioLink.guestbook}
                    onChange={(guestbook) => updateLocalBioLink({ guestbook })}
                  />
                </div>

                <div className="border-t pt-4">
                  <CalendlyConfig
                    settings={localBioLink.calendly}
                    onChange={(calendly) => updateLocalBioLink({ calendly })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Theme Tab */}
            <TabsContent value="theme" className="m-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <Label className="text-base font-medium">预设主题</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_THEMES.map((theme, i) => (
                    <button
                      key={i}
                      onClick={() => applyTheme(theme)}
                      className="rounded-lg border p-3 text-left transition-colors hover:border-primary"
                      style={{
                        background: theme.backgroundGradient || theme.backgroundColor,
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: theme.textColor }}
                      >
                        {theme.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-medium">自定义样式</Label>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label className="text-xs">背景色</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          type="color"
                          value={localBioLink.theme.backgroundColor}
                          onChange={(e) =>
                            updateLocalBioLink({
                              theme: {
                                ...localBioLink.theme,
                                backgroundColor: e.target.value,
                              },
                            })
                          }
                          className="h-9 w-12 cursor-pointer p-1"
                        />
                        <Input
                          value={localBioLink.theme.backgroundColor}
                          onChange={(e) =>
                            updateLocalBioLink({
                              theme: {
                                ...localBioLink.theme,
                                backgroundColor: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">文字颜色</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          type="color"
                          value={localBioLink.theme.textColor}
                          onChange={(e) =>
                            updateLocalBioLink({
                              theme: {
                                ...localBioLink.theme,
                                textColor: e.target.value,
                              },
                            })
                          }
                          className="h-9 w-12 cursor-pointer p-1"
                        />
                        <Input
                          value={localBioLink.theme.textColor}
                          onChange={(e) =>
                            updateLocalBioLink({
                              theme: {
                                ...localBioLink.theme,
                                textColor: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">按钮颜色</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          type="color"
                          value={localBioLink.theme.buttonColor}
                          onChange={(e) =>
                            updateLocalBioLink({
                              theme: {
                                ...localBioLink.theme,
                                buttonColor: e.target.value,
                              },
                            })
                          }
                          className="h-9 w-12 cursor-pointer p-1"
                        />
                        <Input
                          value={localBioLink.theme.buttonColor}
                          onChange={(e) =>
                            updateLocalBioLink({
                              theme: {
                                ...localBioLink.theme,
                                buttonColor: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">按钮样式</Label>
                      <Select
                        value={localBioLink.theme.buttonStyle}
                        onValueChange={(v: 'solid' | 'outline' | 'soft') =>
                          updateLocalBioLink({
                            theme: { ...localBioLink.theme, buttonStyle: v },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">实心</SelectItem>
                          <SelectItem value="outline">描边</SelectItem>
                          <SelectItem value="soft">柔和</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">按钮圆角</Label>
                      <Select
                        value={localBioLink.theme.buttonRadius}
                        onValueChange={(v: 'none' | 'sm' | 'md' | 'lg' | 'full') =>
                          updateLocalBioLink({
                            theme: { ...localBioLink.theme, buttonRadius: v },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无</SelectItem>
                          <SelectItem value="sm">小</SelectItem>
                          <SelectItem value="md">中</SelectItem>
                          <SelectItem value="lg">大</SelectItem>
                          <SelectItem value="full">圆形</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex flex-1 flex-col bg-gray-100">
          {/* Preview header */}
          <div className="flex items-center justify-between border-b bg-background px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={localBioLink.isPublished ? 'default' : 'secondary'}>
                {localBioLink.isPublished ? '已发布' : '草稿'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`https://lnk.day/b/${localBioLink.slug}`, '_blank')
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                预览
              </Button>
            </div>
          </div>

          {/* Preview content */}
          <div className="flex flex-1 items-start justify-center overflow-auto p-8">
            <div
              className={cn(
                'rounded-2xl shadow-lg transition-all',
                previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
              )}
              style={{
                background:
                  localBioLink.theme.backgroundGradient ||
                  localBioLink.theme.backgroundColor,
                minHeight: previewDevice === 'mobile' ? 667 : 'auto',
              }}
            >
              <div className="p-6">
                {/* Profile */}
                <div className="mb-6 text-center">
                  {localBioLink.avatarUrl ? (
                    <img
                      src={localBioLink.avatarUrl}
                      alt={localBioLink.title}
                      className="mx-auto mb-3 h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
                      style={{
                        backgroundColor: localBioLink.theme.buttonColor,
                        color: localBioLink.theme.buttonTextColor,
                      }}
                    >
                      {localBioLink.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h1
                    className="text-xl font-bold"
                    style={{ color: localBioLink.theme.textColor }}
                  >
                    {localBioLink.title}
                  </h1>
                  {localBioLink.description && (
                    <p
                      className="mt-1 text-sm opacity-80"
                      style={{ color: localBioLink.theme.textColor }}
                    >
                      {localBioLink.description}
                    </p>
                  )}
                </div>

                {/* Blocks preview */}
                <div className="space-y-3">
                  {localBioLink.blocks
                    .filter((b) => b.isVisible)
                    .map((block) => (
                      <div key={block.id}>
                        {block.type === 'link' && (
                          <button
                            className={cn(
                              'w-full py-3 px-4 text-center font-medium transition-transform hover:scale-[1.02]',
                              localBioLink.theme.buttonStyle === 'solid' &&
                                'border-none',
                              localBioLink.theme.buttonStyle === 'outline' &&
                                'border-2 bg-transparent',
                              localBioLink.theme.buttonStyle === 'soft' &&
                                'border-none opacity-90',
                              {
                                'rounded-none': localBioLink.theme.buttonRadius === 'none',
                                'rounded': localBioLink.theme.buttonRadius === 'sm',
                                'rounded-md': localBioLink.theme.buttonRadius === 'md',
                                'rounded-lg': localBioLink.theme.buttonRadius === 'lg',
                                'rounded-full': localBioLink.theme.buttonRadius === 'full',
                              }
                            )}
                            style={{
                              backgroundColor:
                                localBioLink.theme.buttonStyle !== 'outline'
                                  ? localBioLink.theme.buttonColor
                                  : 'transparent',
                              color:
                                localBioLink.theme.buttonStyle === 'outline'
                                  ? localBioLink.theme.buttonColor
                                  : localBioLink.theme.buttonTextColor,
                              borderColor: localBioLink.theme.buttonColor,
                            }}
                          >
                            {block.content?.title || '链接'}
                          </button>
                        )}

                        {block.type === 'header' && (
                          <h2
                            className="text-center text-lg font-bold"
                            style={{ color: localBioLink.theme.textColor }}
                          >
                            {block.content?.text}
                          </h2>
                        )}

                        {block.type === 'text' && (
                          <p
                            className="text-center text-sm"
                            style={{ color: localBioLink.theme.textColor }}
                          >
                            {block.content?.text}
                          </p>
                        )}

                        {block.type === 'divider' && (
                          <hr
                            className="my-4 opacity-30"
                            style={{ borderColor: localBioLink.theme.textColor }}
                          />
                        )}

                        {block.type === 'social' && (
                          <div className="flex justify-center gap-3">
                            {SOCIAL_PLATFORMS.slice(0, 5).map((platform) => (
                              <div
                                key={platform.id}
                                className="flex h-10 w-10 items-center justify-center rounded-full"
                                style={{
                                  backgroundColor: localBioLink.theme.buttonColor,
                                }}
                              >
                                <Share2
                                  className="h-5 w-5"
                                  style={{ color: localBioLink.theme.buttonTextColor }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Block Edit Sheet */}
        <Sheet open={isBlockSheetOpen} onOpenChange={setIsBlockSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                编辑{editingBlock && BLOCK_TYPE_LABELS[editingBlock.type].label}
              </SheetTitle>
              <SheetDescription>
                {editingBlock && BLOCK_TYPE_LABELS[editingBlock.type].description}
              </SheetDescription>
            </SheetHeader>

            {editingBlock && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>可见</Label>
                  <Switch
                    checked={editingBlock.isVisible}
                    onCheckedChange={(checked) =>
                      updateBlock(editingBlock.id, { isVisible: checked })
                    }
                  />
                </div>

                {editingBlock.type === 'link' && (
                  <>
                    <div>
                      <Label>标题</Label>
                      <Input
                        value={editingBlock.content?.title || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), title: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>链接 URL</Label>
                      <Input
                        value={editingBlock.content?.url || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), url: e.target.value },
                          })
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {(editingBlock.type === 'header' || editingBlock.type === 'text') && (
                  <div>
                    <Label>文本</Label>
                    {editingBlock.type === 'text' ? (
                      <Textarea
                        value={editingBlock.content?.text || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), text: e.target.value },
                          })
                        }
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <Input
                        value={editingBlock.content?.text || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), text: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    )}
                  </div>
                )}

                {editingBlock.type === 'image' && (
                  <>
                    <div>
                      <Label>图片 URL</Label>
                      <Input
                        value={editingBlock.content?.url || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), url: e.target.value },
                          })
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>替代文字</Label>
                      <Input
                        value={editingBlock.content?.alt || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), alt: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {editingBlock.type === 'youtube' && (
                  <div>
                    <Label>YouTube 视频 ID</Label>
                    <Input
                      value={editingBlock.content?.videoId || ''}
                      onChange={(e) =>
                        updateBlock(editingBlock.id, {
                          content: { ...(editingBlock.content || {}), videoId: e.target.value },
                        })
                      }
                      placeholder="例如: dQw4w9WgXcQ"
                      className="mt-1"
                    />
                  </div>
                )}

                <Button
                  variant="destructive"
                  className="mt-6 w-full"
                  onClick={() => {
                    deleteBlock(editingBlock.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除此区块
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
