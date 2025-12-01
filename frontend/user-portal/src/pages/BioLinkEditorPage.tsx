import { useState, useCallback, useEffect, useRef } from 'react';
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
  Clock,
  ShoppingBag,
  MessageSquare,
  Grid,
  ImagePlus,
  Code,
  Mic,
  Hexagon,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  BLOCK_CATEGORIES,
  getBlocksByCategory,
  createDefaultBlockContent,
  DEFAULT_THEMES,
  SOCIAL_PLATFORMS,
} from '@/hooks/useBioLinks';
import PixelConfig from '@/components/bio-link/PixelConfig';
import ABTestConfig from '@/components/bio-link/ABTestConfig';
import GuestbookConfig from '@/components/bio-link/GuestbookConfig';
import CalendlyConfig from '@/components/bio-link/CalendlyConfig';
import { cn } from '@/lib/utils';
import { getBioLinkPublicUrl } from '@/lib/api';

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
    case 'subscribe':
      return <Mail className={iconClass} />;
    case 'contact':
      return <Phone className={iconClass} />;
    case 'map':
      return <MapPin className={iconClass} />;
    case 'spotify':
    case 'music':
      return <Music className={iconClass} />;
    case 'youtube':
      return <Youtube className={iconClass} />;
    case 'countdown':
      return <Clock className={iconClass} />;
    case 'product':
      return <ShoppingBag className={iconClass} />;
    case 'contact_form':
      return <MessageSquare className={iconClass} />;
    case 'carousel':
      return <ImagePlus className={iconClass} />;
    case 'embed':
      return <Code className={iconClass} />;
    case 'podcast':
      return <Mic className={iconClass} />;
    case 'nft':
      return <Hexagon className={iconClass} />;
    case 'collection':
      return <Grid className={iconClass} />;
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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isBlockSheetOpen, setIsBlockSheetOpen] = useState(false);
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 实时预览弹窗状态
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  // Local state for editing
  const [localBioLink, setLocalBioLink] = useState<BioLink | null>(null);

  // Derive editingBlock from localBioLink.blocks to ensure synchronization
  const editingBlock = editingBlockId
    ? localBioLink?.blocks?.find(b => b.id === editingBlockId) || null
    : null;

  // Queries
  const { data: bioLink, isLoading } = useBioLink(id || null);

  // Mutation
  const updateBioLink = useUpdateBioLink();

  // Initialize local state when data loads
  useEffect(() => {
    if (bioLink && !localBioLink) {
      // Ensure blocks is always an array
      setLocalBioLink({
        ...bioLink,
        blocks: bioLink.blocks || [],
      });
    }
  }, [bioLink, localBioLink]);

  // 发送预览数据到 iframe
  const sendPreviewData = useCallback(() => {
    if (previewIframeRef.current?.contentWindow && localBioLink) {
      console.log('Sending preview data:', localBioLink);
      previewIframeRef.current.contentWindow.postMessage({
        type: 'BIO_LINK_PREVIEW_UPDATE',
        payload: {
          bioLink: localBioLink,
        },
      }, '*');
    }
  }, [localBioLink]);

  // 监听 iframe 准备好的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BIO_LINK_PREVIEW_READY') {
        console.log('Preview iframe is ready');
        setIsPreviewReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 当 isPreviewReady 变为 true 或 localBioLink 变化时，发送更新到预览 iframe
  useEffect(() => {
    if (isLivePreviewOpen && isPreviewReady && localBioLink) {
      // 使用 setTimeout 确保 iframe 完全准备好
      const timer = setTimeout(() => {
        sendPreviewData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localBioLink, isLivePreviewOpen, isPreviewReady, sendPreviewData]);

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

  // State for block picker dialog
  const [isBlockPickerOpen, setIsBlockPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('basic');

  const addBlock = (type: BlockType) => {
    if (!localBioLink) return;

    const defaultContent = createDefaultBlockContent(type);
    const newBlock: BioLinkBlock = {
      id: `block-${Date.now()}`,
      type,
      isVisible: true,
      sortOrder: localBioLink.blocks.length,
      content: getDefaultContent(type),
      ...defaultContent,
    };

    updateLocalBioLink({
      blocks: [...localBioLink.blocks, newBlock],
    });

    setEditingBlockId(newBlock.id);
    setIsBlockSheetOpen(true);
    setIsBlockPickerOpen(false);
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
      case 'subscribe':
        return { placeholder: '输入邮箱订阅', buttonText: '订阅' };
      case 'contact':
        return { phone: '', email: '', address: '' };
      case 'map':
        return { address: '', zoom: 15 };
      case 'spotify':
        return { embedUrl: '' };
      case 'youtube':
        return { videoId: '' };
      case 'countdown':
        return { targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
      case 'carousel':
        return { images: [] };
      case 'product':
        return { price: 0, currency: 'CNY', name: '产品名称' };
      case 'contact_form':
        return {
          fields: [
            { name: 'name', type: 'text', label: '姓名', required: true },
            { name: 'email', type: 'email', label: '邮箱', required: true },
            { name: 'message', type: 'textarea', label: '留言', required: true },
          ],
        };
      case 'embed':
        return { type: 'youtube', embedId: '' };
      case 'music':
        return { provider: 'spotify', trackUrl: '' };
      case 'podcast':
        return { provider: 'spotify', showUrl: '' };
      case 'nft':
        return { platform: 'opensea' };
      default:
        return {};
    }
  };

  const updateBlock = (blockId: string, updates: Partial<BioLinkBlock>) => {
    if (!localBioLink) return;

    const updatedBlocks = localBioLink.blocks.map((b) =>
      b.id === blockId ? { ...b, ...updates } : b
    );

    // Debug log to verify updates
    console.log('updateBlock called:', { blockId, updates, updatedBlocks });

    updateLocalBioLink({
      blocks: updatedBlocks,
    });
    // editingBlock is now derived from localBioLink.blocks, so no separate update needed
  };

  const deleteBlock = (blockId: string) => {
    if (!localBioLink) return;

    updateLocalBioLink({
      blocks: localBioLink.blocks.filter((b) => b.id !== blockId),
    });

    if (editingBlockId === blockId) {
      setEditingBlockId(null);
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
              {/* Add block button */}
              <Button
                variant="outline"
                className="mb-4 w-full"
                onClick={() => setIsBlockPickerOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加区块
              </Button>

              {/* Quick add - common blocks */}
              <div className="mb-4 grid grid-cols-4 gap-1">
                {(['link', 'header', 'text', 'image', 'social', 'divider', 'subscribe', 'contact_form'] as BlockType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors hover:border-primary hover:bg-primary/5"
                      title={BLOCK_TYPE_LABELS[type]?.description || ''}
                    >
                      <BlockIcon type={type} />
                      <span className="truncate w-full text-center">{BLOCK_TYPE_LABELS[type]?.label || type}</span>
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
                      editingBlockId === block.id && 'border-primary',
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
                          setEditingBlockId(block.id);
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
                onClick={() => {
                  setIsPreviewReady(false);
                  setIsLivePreviewOpen(true);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                实时预览
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(getBioLinkPublicUrl(localBioLink.username, true), '_blank')
                }
              >
                <ExternalLink className="h-4 w-4" />
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
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((block) => (
                      <div key={block.id}>
                        {/* Link block */}
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

                        {/* Header block */}
                        {block.type === 'header' && (
                          <h2
                            className="text-center text-lg font-bold"
                            style={{ color: localBioLink.theme.textColor }}
                          >
                            {block.content?.text || '标题'}
                          </h2>
                        )}

                        {/* Text block */}
                        {block.type === 'text' && (
                          <p
                            className="text-center text-sm"
                            style={{ color: localBioLink.theme.textColor }}
                          >
                            {block.content?.text || block.text?.content || '描述文字'}
                          </p>
                        )}

                        {/* Divider block */}
                        {block.type === 'divider' && (
                          <hr
                            className="my-4 opacity-30"
                            style={{ borderColor: localBioLink.theme.textColor }}
                          />
                        )}

                        {/* Social block */}
                        {block.type === 'social' && (
                          <div className="flex justify-center gap-3">
                            {(block.content?.platforms?.length > 0
                              ? SOCIAL_PLATFORMS.filter((p) =>
                                  block.content?.platforms?.includes(p.id)
                                )
                              : SOCIAL_PLATFORMS.slice(0, 5)
                            ).map((platform) => (
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

                        {/* Image block */}
                        {block.type === 'image' && (
                          <div className="rounded-lg overflow-hidden">
                            {(block.content?.url || block.image?.url) ? (
                              <img
                                src={block.content?.url || block.image?.url}
                                alt={block.content?.alt || block.image?.alt || ''}
                                className="w-full h-auto object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-32 flex items-center justify-center bg-gray-200"
                                style={{ opacity: 0.5 }}
                              >
                                <Image className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Video/YouTube block */}
                        {(block.type === 'video' || block.type === 'youtube') && (
                          <div className="rounded-lg overflow-hidden aspect-video bg-black flex items-center justify-center">
                            {block.content?.videoId ? (
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${block.content.videoId}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="text-white/50 flex flex-col items-center gap-2">
                                <Video className="h-8 w-8" />
                                <span className="text-sm">视频预览</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Subscribe/Email block */}
                        {(block.type === 'subscribe' || block.type === 'email') && (
                          <div className="rounded-lg p-4" style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                placeholder={block.content?.placeholder || block.subscribe?.placeholder || '请输入邮箱'}
                                className="flex-1 px-3 py-2 rounded-md border text-sm"
                                style={{ borderColor: localBioLink.theme.buttonColor }}
                                disabled
                              />
                              <button
                                className="px-4 py-2 rounded-md text-sm font-medium"
                                style={{
                                  backgroundColor: localBioLink.theme.buttonColor,
                                  color: localBioLink.theme.buttonTextColor,
                                }}
                              >
                                {block.content?.buttonText || block.subscribe?.buttonText || '订阅'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Contact Form block */}
                        {block.type === 'contact_form' && (
                          <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}>
                            <div className="text-sm font-medium" style={{ color: localBioLink.theme.textColor }}>
                              联系表单
                            </div>
                            {(block.contactForm?.fields || [
                              { label: '姓名', type: 'text' },
                              { label: '邮箱', type: 'email' },
                              { label: '留言', type: 'textarea' },
                            ]).map((field: any, i: number) => (
                              <div key={i}>
                                {field.type === 'textarea' ? (
                                  <textarea
                                    placeholder={field.label}
                                    className="w-full px-3 py-2 rounded-md border text-sm resize-none"
                                    style={{ borderColor: localBioLink.theme.buttonColor }}
                                    rows={3}
                                    disabled
                                  />
                                ) : (
                                  <input
                                    type={field.type}
                                    placeholder={field.label}
                                    className="w-full px-3 py-2 rounded-md border text-sm"
                                    style={{ borderColor: localBioLink.theme.buttonColor }}
                                    disabled
                                  />
                                )}
                              </div>
                            ))}
                            <button
                              className="w-full px-4 py-2 rounded-md text-sm font-medium"
                              style={{
                                backgroundColor: localBioLink.theme.buttonColor,
                                color: localBioLink.theme.buttonTextColor,
                              }}
                            >
                              {block.contactForm?.submitButtonText || '发送消息'}
                            </button>
                          </div>
                        )}

                        {/* Countdown block */}
                        {block.type === 'countdown' && (
                          <div
                            className="rounded-lg p-4 text-center"
                            style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}
                          >
                            <div className="flex justify-center gap-4">
                              {(block.countdown?.showDays !== false) && (
                                <div>
                                  <div className="text-2xl font-bold" style={{ color: localBioLink.theme.textColor }}>00</div>
                                  <div className="text-xs opacity-70" style={{ color: localBioLink.theme.textColor }}>天</div>
                                </div>
                              )}
                              {(block.countdown?.showHours !== false) && (
                                <div>
                                  <div className="text-2xl font-bold" style={{ color: localBioLink.theme.textColor }}>00</div>
                                  <div className="text-xs opacity-70" style={{ color: localBioLink.theme.textColor }}>时</div>
                                </div>
                              )}
                              {(block.countdown?.showMinutes !== false) && (
                                <div>
                                  <div className="text-2xl font-bold" style={{ color: localBioLink.theme.textColor }}>00</div>
                                  <div className="text-xs opacity-70" style={{ color: localBioLink.theme.textColor }}>分</div>
                                </div>
                              )}
                              {(block.countdown?.showSeconds !== false) && (
                                <div>
                                  <div className="text-2xl font-bold" style={{ color: localBioLink.theme.textColor }}>00</div>
                                  <div className="text-xs opacity-70" style={{ color: localBioLink.theme.textColor }}>秒</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Product block */}
                        {block.type === 'product' && (
                          <div
                            className="rounded-lg p-4"
                            style={{
                              backgroundColor: localBioLink.theme.buttonStyle === 'soft'
                                ? `${localBioLink.theme.buttonColor}20`
                                : 'white',
                              border: `1px solid ${localBioLink.theme.buttonColor}30`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium" style={{ color: localBioLink.theme.textColor }}>
                                  {block.title || block.content?.name || '产品名称'}
                                </div>
                                {block.product?.badge && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: localBioLink.theme.buttonColor,
                                      color: localBioLink.theme.buttonTextColor,
                                    }}
                                  >
                                    {block.product.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold" style={{ color: localBioLink.theme.buttonColor }}>
                                  {block.product?.currency === 'USD' ? '$' : block.product?.currency === 'EUR' ? '€' : '¥'}
                                  {block.product?.price || block.content?.price || 0}
                                </div>
                              </div>
                            </div>
                            <button
                              className="w-full mt-3 px-4 py-2 rounded-md text-sm font-medium"
                              style={{
                                backgroundColor: localBioLink.theme.buttonColor,
                                color: localBioLink.theme.buttonTextColor,
                              }}
                            >
                              立即购买
                            </button>
                          </div>
                        )}

                        {/* Map block */}
                        {block.type === 'map' && (
                          <div
                            className="rounded-lg h-40 flex items-center justify-center"
                            style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}
                          >
                            <div className="text-center">
                              <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: localBioLink.theme.buttonColor }} />
                              <p className="text-sm" style={{ color: localBioLink.theme.textColor }}>
                                {block.map?.address || block.content?.address || '地图位置'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Embed block */}
                        {block.type === 'embed' && (
                          <div
                            className="rounded-lg aspect-video flex items-center justify-center"
                            style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}
                          >
                            <div className="text-center">
                              <Code className="h-8 w-8 mx-auto mb-2" style={{ color: localBioLink.theme.buttonColor }} />
                              <p className="text-sm" style={{ color: localBioLink.theme.textColor }}>
                                {block.embed?.type || '嵌入内容'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Music/Spotify block */}
                        {(block.type === 'music' || block.type === 'spotify') && (
                          <div
                            className="rounded-lg p-4 flex items-center gap-3"
                            style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}
                          >
                            <div
                              className="h-12 w-12 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: localBioLink.theme.buttonColor }}
                            >
                              <Music className="h-6 w-6" style={{ color: localBioLink.theme.buttonTextColor }} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: localBioLink.theme.textColor }}>
                                {block.music?.provider || 'Spotify'}
                              </div>
                              <div className="text-xs opacity-70" style={{ color: localBioLink.theme.textColor }}>
                                音乐播放器
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Podcast block */}
                        {block.type === 'podcast' && (
                          <div
                            className="rounded-lg p-4 flex items-center gap-3"
                            style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}
                          >
                            <div
                              className="h-12 w-12 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: localBioLink.theme.buttonColor }}
                            >
                              <Mic className="h-6 w-6" style={{ color: localBioLink.theme.buttonTextColor }} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: localBioLink.theme.textColor }}>
                                {block.podcast?.showName || '播客节目'}
                              </div>
                              <div className="text-xs opacity-70" style={{ color: localBioLink.theme.textColor }}>
                                {block.podcast?.provider || 'Spotify'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Contact block */}
                        {block.type === 'contact' && (
                          <div
                            className="rounded-lg p-4 space-y-2"
                            style={{ backgroundColor: `${localBioLink.theme.buttonColor}15` }}
                          >
                            {block.content?.phone && (
                              <div className="flex items-center gap-2 text-sm" style={{ color: localBioLink.theme.textColor }}>
                                <Phone className="h-4 w-4" />
                                {block.content.phone}
                              </div>
                            )}
                            {block.content?.email && (
                              <div className="flex items-center gap-2 text-sm" style={{ color: localBioLink.theme.textColor }}>
                                <Mail className="h-4 w-4" />
                                {block.content.email}
                              </div>
                            )}
                            {block.content?.address && (
                              <div className="flex items-center gap-2 text-sm" style={{ color: localBioLink.theme.textColor }}>
                                <MapPin className="h-4 w-4" />
                                {block.content.address}
                              </div>
                            )}
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

                {/* Subscribe block */}
                {(editingBlock.type === 'subscribe' || editingBlock.type === 'email') && (
                  <>
                    <div>
                      <Label>占位符文本</Label>
                      <Input
                        value={editingBlock.content?.placeholder || editingBlock.subscribe?.placeholder || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), placeholder: e.target.value },
                            subscribe: { ...(editingBlock.subscribe || {}), placeholder: e.target.value },
                          })
                        }
                        placeholder="请输入邮箱"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>按钮文字</Label>
                      <Input
                        value={editingBlock.content?.buttonText || editingBlock.subscribe?.buttonText || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            content: { ...(editingBlock.content || {}), buttonText: e.target.value },
                            subscribe: { ...(editingBlock.subscribe || {}), buttonText: e.target.value },
                          })
                        }
                        placeholder="订阅"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>成功提示</Label>
                      <Input
                        value={editingBlock.subscribe?.successMessage || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            subscribe: { ...(editingBlock.subscribe || {}), successMessage: e.target.value },
                          })
                        }
                        placeholder="订阅成功！"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>收集姓名</Label>
                      <Switch
                        checked={editingBlock.subscribe?.collectName || false}
                        onCheckedChange={(checked) =>
                          updateBlock(editingBlock.id, {
                            subscribe: { ...(editingBlock.subscribe || {}), collectName: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>收集电话</Label>
                      <Switch
                        checked={editingBlock.subscribe?.collectPhone || false}
                        onCheckedChange={(checked) =>
                          updateBlock(editingBlock.id, {
                            subscribe: { ...(editingBlock.subscribe || {}), collectPhone: checked },
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {/* Contact Form block */}
                {editingBlock.type === 'contact_form' && (
                  <>
                    <div>
                      <Label>提交按钮文字</Label>
                      <Input
                        value={editingBlock.contactForm?.submitButtonText || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            contactForm: { ...(editingBlock.contactForm || { fields: [] }), submitButtonText: e.target.value },
                          })
                        }
                        placeholder="发送消息"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>成功提示</Label>
                      <Input
                        value={editingBlock.contactForm?.successMessage || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            contactForm: { ...(editingBlock.contactForm || { fields: [] }), successMessage: e.target.value },
                          })
                        }
                        placeholder="感谢您的留言！"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>通知邮箱</Label>
                      <Input
                        value={editingBlock.contactForm?.notificationEmail || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            contactForm: { ...(editingBlock.contactForm || { fields: [] }), notificationEmail: e.target.value },
                          })
                        }
                        placeholder="收到表单后发送通知到此邮箱"
                        className="mt-1"
                      />
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-sm font-medium">表单字段</Label>
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        默认包含: 姓名、邮箱、留言字段
                      </p>
                    </div>
                  </>
                )}

                {/* Countdown block */}
                {editingBlock.type === 'countdown' && (
                  <>
                    <div>
                      <Label>目标日期时间</Label>
                      <Input
                        type="datetime-local"
                        value={editingBlock.countdown?.targetDate?.slice(0, 16) || editingBlock.content?.targetDate?.slice(0, 16) || ''}
                        onChange={(e) => {
                          const targetDate = new Date(e.target.value).toISOString();
                          updateBlock(editingBlock.id, {
                            countdown: { targetDate, ...(editingBlock.countdown || {}) },
                            content: { ...(editingBlock.content || {}), targetDate },
                          });
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">显示天</Label>
                        <Switch
                          checked={editingBlock.countdown?.showDays !== false}
                          onCheckedChange={(checked) => {
                            const currentCountdown = editingBlock.countdown || { targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
                            updateBlock(editingBlock.id, {
                              countdown: { ...currentCountdown, showDays: checked },
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">显示时</Label>
                        <Switch
                          checked={editingBlock.countdown?.showHours !== false}
                          onCheckedChange={(checked) => {
                            const currentCountdown = editingBlock.countdown || { targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
                            updateBlock(editingBlock.id, {
                              countdown: { ...currentCountdown, showHours: checked },
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">显示分</Label>
                        <Switch
                          checked={editingBlock.countdown?.showMinutes !== false}
                          onCheckedChange={(checked) => {
                            const currentCountdown = editingBlock.countdown || { targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
                            updateBlock(editingBlock.id, {
                              countdown: { ...currentCountdown, showMinutes: checked },
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">显示秒</Label>
                        <Switch
                          checked={editingBlock.countdown?.showSeconds !== false}
                          onCheckedChange={(checked) => {
                            const currentCountdown = editingBlock.countdown || { targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
                            updateBlock(editingBlock.id, {
                              countdown: { ...currentCountdown, showSeconds: checked },
                            });
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Product block */}
                {editingBlock.type === 'product' && (
                  <>
                    <div>
                      <Label>产品名称</Label>
                      <Input
                        value={editingBlock.title || editingBlock.content?.name || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            title: e.target.value,
                            content: { ...(editingBlock.content || {}), name: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>价格</Label>
                        <Input
                          type="number"
                          value={editingBlock.product?.price || editingBlock.content?.price || 0}
                          onChange={(e) =>
                            updateBlock(editingBlock.id, {
                              product: { ...(editingBlock.product || { price: 0, currency: 'CNY' }), price: parseFloat(e.target.value) },
                              content: { ...(editingBlock.content || {}), price: parseFloat(e.target.value) },
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>货币</Label>
                        <Select
                          value={editingBlock.product?.currency || 'CNY'}
                          onValueChange={(v) =>
                            updateBlock(editingBlock.id, {
                              product: { ...(editingBlock.product || { price: 0, currency: 'CNY' }), currency: v },
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CNY">¥ CNY</SelectItem>
                            <SelectItem value="USD">$ USD</SelectItem>
                            <SelectItem value="EUR">€ EUR</SelectItem>
                            <SelectItem value="GBP">£ GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>购买链接</Label>
                      <Input
                        value={editingBlock.product?.paymentUrl || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            product: { ...(editingBlock.product || { price: 0, currency: 'CNY' }), paymentUrl: e.target.value },
                          })
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>徽章文字</Label>
                      <Input
                        value={editingBlock.product?.badge || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            product: { ...(editingBlock.product || { price: 0, currency: 'CNY' }), badge: e.target.value },
                          })
                        }
                        placeholder="例如: 热卖、限时优惠"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* Map block */}
                {editingBlock.type === 'map' && (
                  <>
                    <div>
                      <Label>地址</Label>
                      <Input
                        value={editingBlock.map?.address || editingBlock.content?.address || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            map: { ...(editingBlock.map || { provider: 'google', latitude: 0, longitude: 0 }), address: e.target.value },
                            content: { ...(editingBlock.content || {}), address: e.target.value },
                          })
                        }
                        placeholder="输入完整地址"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>地图缩放级别</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={editingBlock.map?.zoom || editingBlock.content?.zoom || 14}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            map: { ...(editingBlock.map || { provider: 'google', latitude: 0, longitude: 0 }), zoom: parseInt(e.target.value) },
                            content: { ...(editingBlock.content || {}), zoom: parseInt(e.target.value) },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>显示导航链接</Label>
                      <Switch
                        checked={editingBlock.map?.showDirectionsLink || false}
                        onCheckedChange={(checked) =>
                          updateBlock(editingBlock.id, {
                            map: { ...(editingBlock.map || { provider: 'google', latitude: 0, longitude: 0 }), showDirectionsLink: checked },
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {/* Embed block */}
                {editingBlock.type === 'embed' && (
                  <>
                    <div>
                      <Label>嵌入类型</Label>
                      <Select
                        value={editingBlock.embed?.type || 'youtube'}
                        onValueChange={(v: any) =>
                          updateBlock(editingBlock.id, {
                            embed: { ...(editingBlock.embed || { type: 'youtube', embedId: '' }), type: v },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="spotify">Spotify</SelectItem>
                          <SelectItem value="soundcloud">SoundCloud</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="vimeo">Vimeo</SelectItem>
                          <SelectItem value="bilibili">Bilibili</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>嵌入 ID / URL</Label>
                      <Input
                        value={editingBlock.embed?.embedId || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            embed: { ...(editingBlock.embed || { type: 'youtube', embedId: '' }), embedId: e.target.value },
                          })
                        }
                        placeholder="视频ID或完整URL"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* Music block */}
                {(editingBlock.type === 'music' || editingBlock.type === 'spotify') && (
                  <>
                    <div>
                      <Label>音乐平台</Label>
                      <Select
                        value={editingBlock.music?.provider || 'spotify'}
                        onValueChange={(v: any) =>
                          updateBlock(editingBlock.id, {
                            music: { ...(editingBlock.music || { provider: 'spotify' }), provider: v },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spotify">Spotify</SelectItem>
                          <SelectItem value="apple_music">Apple Music</SelectItem>
                          <SelectItem value="soundcloud">SoundCloud</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>曲目/专辑链接</Label>
                      <Input
                        value={editingBlock.music?.trackUrl || editingBlock.content?.embedUrl || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            music: { ...(editingBlock.music || { provider: 'spotify' }), trackUrl: e.target.value },
                            content: { ...(editingBlock.content || {}), embedUrl: e.target.value },
                          })
                        }
                        placeholder="https://open.spotify.com/..."
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* Podcast block */}
                {editingBlock.type === 'podcast' && (
                  <>
                    <div>
                      <Label>播客平台</Label>
                      <Select
                        value={editingBlock.podcast?.provider || 'spotify'}
                        onValueChange={(v: any) =>
                          updateBlock(editingBlock.id, {
                            podcast: { ...(editingBlock.podcast || { provider: 'spotify' }), provider: v },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spotify">Spotify</SelectItem>
                          <SelectItem value="apple_podcasts">Apple Podcasts</SelectItem>
                          <SelectItem value="google_podcasts">Google Podcasts</SelectItem>
                          <SelectItem value="anchor">Anchor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>播客链接</Label>
                      <Input
                        value={editingBlock.podcast?.showUrl || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            podcast: { ...(editingBlock.podcast || { provider: 'spotify' }), showUrl: e.target.value },
                          })
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>节目名称</Label>
                      <Input
                        value={editingBlock.podcast?.showName || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            podcast: { ...(editingBlock.podcast || { provider: 'spotify' }), showName: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* Social block */}
                {editingBlock.type === 'social' && (
                  <div className="space-y-2">
                    <Label>选择要显示的社交平台</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {SOCIAL_PLATFORMS.slice(0, 10).map((platform) => (
                        <div key={platform.id} className="flex items-center gap-2">
                          <Switch
                            id={`social-${platform.id}`}
                            checked={(editingBlock.content?.platforms || []).includes(platform.id)}
                            onCheckedChange={(checked) => {
                              const current = editingBlock.content?.platforms || [];
                              const updated = checked
                                ? [...current, platform.id]
                                : current.filter((p: string) => p !== platform.id);
                              updateBlock(editingBlock.id, {
                                content: { ...(editingBlock.content || {}), platforms: updated },
                              });
                            }}
                          />
                          <Label htmlFor={`social-${platform.id}`} className="text-xs">{platform.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video block */}
                {editingBlock.type === 'video' && (
                  <>
                    <div>
                      <Label>视频 URL</Label>
                      <Input
                        value={editingBlock.video?.url || editingBlock.content?.url || ''}
                        onChange={(e) =>
                          updateBlock(editingBlock.id, {
                            video: { ...(editingBlock.video || { url: '' }), url: e.target.value },
                            content: { ...(editingBlock.content || {}), url: e.target.value },
                          })
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>自动播放</Label>
                      <Switch
                        checked={editingBlock.video?.autoplay || editingBlock.content?.autoplay || false}
                        onCheckedChange={(checked) =>
                          updateBlock(editingBlock.id, {
                            video: { ...(editingBlock.video || { url: '' }), autoplay: checked },
                            content: { ...(editingBlock.content || {}), autoplay: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>循环播放</Label>
                      <Switch
                        checked={editingBlock.video?.loop || false}
                        onCheckedChange={(checked) =>
                          updateBlock(editingBlock.id, {
                            video: { ...(editingBlock.video || { url: '' }), loop: checked },
                          })
                        }
                      />
                    </div>
                  </>
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

        {/* Block Picker Sheet */}
        <Sheet open={isBlockPickerOpen} onOpenChange={setIsBlockPickerOpen}>
          <SheetContent side="left" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>添加区块</SheetTitle>
              <SheetDescription>
                选择要添加到页面的区块类型
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              {/* Category tabs */}
              <div className="flex gap-2 flex-wrap mb-4">
                {BLOCK_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Blocks grid */}
              <div className="grid grid-cols-2 gap-2">
                {getBlocksByCategory(selectedCategory).map((type) => {
                  const blockInfo = BLOCK_TYPE_LABELS[type];
                  if (!blockInfo) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="mt-0.5">
                        <BlockIcon type={type} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{blockInfo.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {blockInfo.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Live Preview Dialog */}
        <Dialog open={isLivePreviewOpen} onOpenChange={setIsLivePreviewOpen}>
          <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span>实时预览</span>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(getBioLinkPublicUrl(localBioLink.username, true), '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-4">
              <div
                className={cn(
                  'bg-white rounded-2xl shadow-lg overflow-hidden transition-all',
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
                )}
                style={{ minHeight: previewDevice === 'mobile' ? 667 : 'auto' }}
              >
                {!isPreviewReady && (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">加载预览中...</p>
                    </div>
                  </div>
                )}
                <iframe
                  ref={previewIframeRef}
                  src={`/u/${localBioLink.username}?live=true`}
                  className={cn(
                    'w-full border-0',
                    !isPreviewReady && 'hidden'
                  )}
                  style={{ height: previewDevice === 'mobile' ? 667 : 800 }}
                  title="Bio Link 实时预览"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
