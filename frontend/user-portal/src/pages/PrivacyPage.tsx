import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  usePrivacySettings,
  useUpdatePrivacySettings,
  useDataExportRequests,
  useRequestDataExport,
  useDataDeletionRequests,
  useRequestDataDeletion,
  useCancelDataDeletion,
  useUsageQuota,
} from '@/hooks/usePrivacy';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Link,
  MousePointerClick,
  Globe,
  Users,
  Zap,
  QrCode,
  FileText,
  Target,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

const dataTypesForDeletion = [
  { id: 'links', label: '短链接数据', description: '所有创建的短链接' },
  { id: 'analytics', label: '分析数据', description: '点击统计和访问记录' },
  { id: 'campaigns', label: '活动数据', description: '营销活动和A/B测试' },
  { id: 'qr_codes', label: 'QR码数据', description: '生成的二维码' },
  { id: 'bio_links', label: 'Bio链接', description: 'Bio页面和内容' },
  { id: 'exports', label: '导出历史', description: '数据导出记录' },
];

function QuotaCard({
  icon: Icon,
  label,
  used,
  limit,
  unlimited,
  unit = ''
}: {
  icon: any;
  label: string;
  used: number;
  limit: number;
  unlimited: boolean;
  unit?: string;
}) {
  const percentage = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !unlimited && percentage >= 80;
  const isAtLimit = !unlimited && percentage >= 100;

  const formatValue = (val: number) => {
    if (unit === 'MB' || unit === 'GB') {
      return `${val.toFixed(1)} ${unit}`;
    }
    return val.toLocaleString();
  };

  return (
    <Card className={isAtLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${isAtLimit ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : 'bg-muted'}`}>
            <Icon className={`h-5 w-5 ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {unlimited ? (
                <span className="text-green-600 font-medium">无限制</span>
              ) : (
                <>
                  {formatValue(used)} / {formatValue(limit)}
                </>
              )}
            </p>
          </div>
          {!unlimited && (
            <Badge variant={isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}>
              {percentage.toFixed(0)}%
            </Badge>
          )}
        </div>
        {!unlimited && (
          <Progress
            value={percentage}
            className={`h-2 ${isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function PrivacyPage() {
  const { toast } = useToast();
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);

  const { data: settings, isLoading: settingsLoading } = usePrivacySettings();
  const { data: quota, isLoading: quotaLoading, refetch: refetchQuota } = useUsageQuota();
  const { data: exports, isLoading: exportsLoading } = useDataExportRequests();
  const { data: deletions, isLoading: deletionsLoading } = useDataDeletionRequests();

  const updateSettings = useUpdatePrivacySettings();
  const requestExport = useRequestDataExport();
  const requestDeletion = useRequestDataDeletion();
  const cancelDeletion = useCancelDataDeletion();

  const handleConsentChange = (key: keyof NonNullable<typeof settings>['consentSettings'], value: boolean) => {
    if (!settings) return;
    updateSettings.mutate({
      consentSettings: {
        ...settings.consentSettings,
        [key]: value,
      },
    }, {
      onSuccess: () => {
        toast({ title: '设置已更新' });
      },
    });
  };

  const handleExportRequest = (format: 'json' | 'csv') => {
    requestExport.mutate(format, {
      onSuccess: () => {
        toast({ title: '导出请求已提交', description: '我们将在准备好后通过邮件通知您' });
      },
    });
  };

  const handleDeletionRequest = () => {
    if (selectedDataTypes.length === 0) {
      toast({ title: '请选择要删除的数据类型', variant: 'destructive' });
      return;
    }
    requestDeletion.mutate(selectedDataTypes, {
      onSuccess: () => {
        toast({ title: '删除请求已提交', description: '数据将在30天后被永久删除' });
        setSelectedDataTypes([]);
      },
    });
  };

  const handleCancelDeletion = (id: string) => {
    cancelDeletion.mutate(id, {
      onSuccess: () => {
        toast({ title: '删除请求已取消' });
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />已完成</Badge>;
      case 'processing':
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />处理中</Badge>;
      case 'scheduled':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />已计划</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失败</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (settingsLoading || quotaLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">隐私与配额</h1>
          <p className="text-muted-foreground mt-1">管理您的隐私设置和查看使用配额</p>
        </div>

        <Tabs defaultValue="quota" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quota">使用配额</TabsTrigger>
            <TabsTrigger value="privacy">隐私设置</TabsTrigger>
            <TabsTrigger value="data">数据管理</TabsTrigger>
          </TabsList>

          {/* 使用配额 */}
          <TabsContent value="quota" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">当前使用量</h2>
              <Button variant="outline" size="sm" onClick={() => refetchQuota()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>

            {quota && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <QuotaCard icon={Link} label="短链接" {...quota.links} />
                <QuotaCard icon={MousePointerClick} label="月点击量" {...quota.clicks} />
                <QuotaCard icon={Globe} label="自定义域名" {...quota.domains} />
                <QuotaCard icon={Users} label="团队成员" {...quota.teamMembers} />
                <QuotaCard icon={Zap} label="API调用/月" {...quota.apiCalls} />
                <QuotaCard icon={QrCode} label="QR码" {...quota.qrCodes} />
                <QuotaCard icon={FileText} label="Bio链接" {...quota.bioLinks} />
                <QuotaCard icon={Target} label="活动" {...quota.campaigns} />
                <QuotaCard icon={HardDrive} label="存储空间" used={quota.storage.used} limit={quota.storage.limit} unlimited={quota.storage.unlimited} unit={quota.storage.unit} />
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>需要更多配额？</CardTitle>
                <CardDescription>升级您的计划以获取更多资源</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => window.location.href = '/billing'}>
                  查看升级选项
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 隐私设置 */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  数据收集偏好
                </CardTitle>
                <CardDescription>控制我们如何收集和使用您的数据</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>分析数据</Label>
                    <p className="text-sm text-muted-foreground">允许收集点击分析和性能数据</p>
                  </div>
                  <Switch
                    checked={settings?.consentSettings?.analytics ?? true}
                    onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>营销通信</Label>
                    <p className="text-sm text-muted-foreground">接收产品更新和促销信息</p>
                  </div>
                  <Switch
                    checked={settings?.consentSettings?.marketing ?? false}
                    onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>第三方共享</Label>
                    <p className="text-sm text-muted-foreground">与合作伙伴共享匿名数据以改进服务</p>
                  </div>
                  <Switch
                    checked={settings?.consentSettings?.thirdParty ?? false}
                    onCheckedChange={(checked) => handleConsentChange('thirdParty', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>个性化</Label>
                    <p className="text-sm text-muted-foreground">根据使用习惯提供个性化推荐</p>
                  </div>
                  <Switch
                    checked={settings?.consentSettings?.personalization ?? true}
                    onCheckedChange={(checked) => handleConsentChange('personalization', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  隐私控制
                </CardTitle>
                <CardDescription>额外的隐私保护选项</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP地址匿名化</Label>
                    <p className="text-sm text-muted-foreground">在分析中隐藏访客的完整IP地址</p>
                  </div>
                  <Switch
                    checked={settings?.anonymizeIp ?? false}
                    onCheckedChange={(checked) => updateSettings.mutate({ anonymizeIp: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>遵守Do Not Track</Label>
                    <p className="text-sm text-muted-foreground">尊重浏览器的DNT设置</p>
                  </div>
                  <Switch
                    checked={settings?.doNotTrack ?? false}
                    onCheckedChange={(checked) => updateSettings.mutate({ doNotTrack: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>数据保留期限</Label>
                    <p className="text-sm text-muted-foreground">分析数据保留天数</p>
                  </div>
                  <Select
                    value={String(settings?.dataRetentionDays ?? 365)}
                    onValueChange={(value) => updateSettings.mutate({ dataRetentionDays: parseInt(value) })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30天</SelectItem>
                      <SelectItem value="90">90天</SelectItem>
                      <SelectItem value="180">180天</SelectItem>
                      <SelectItem value="365">1年</SelectItem>
                      <SelectItem value="730">2年</SelectItem>
                      <SelectItem value="0">永久</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 数据管理 */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  导出数据
                </CardTitle>
                <CardDescription>下载您的所有数据副本</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportRequest('json')}
                    disabled={requestExport.isPending}
                  >
                    {requestExport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    导出为 JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportRequest('csv')}
                    disabled={requestExport.isPending}
                  >
                    导出为 CSV
                  </Button>
                </div>

                {exports && exports.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">导出历史</h4>
                    <div className="space-y-2">
                      {exports.slice(0, 5).map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getStatusBadge(exp.status)}
                            <span className="text-sm text-muted-foreground">
                              {new Date(exp.requestedAt).toLocaleString()}
                            </span>
                          </div>
                          {exp.status === 'completed' && exp.downloadUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={exp.downloadUrl} download>下载</a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  删除数据
                </CardTitle>
                <CardDescription>永久删除您的数据（此操作不可撤销）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">警告</p>
                      <p>删除的数据将在30天后永久移除，期间可以取消。超过30天后将无法恢复。</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>选择要删除的数据类型</Label>
                  {dataTypesForDeletion.map((type) => (
                    <div key={type.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={type.id}
                        checked={selectedDataTypes.includes(type.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDataTypes([...selectedDataTypes, type.id]);
                          } else {
                            setSelectedDataTypes(selectedDataTypes.filter(id => id !== type.id));
                          }
                        }}
                      />
                      <div>
                        <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedDataTypes.length === 0}>
                      请求删除选中的数据
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除数据？</AlertDialogTitle>
                      <AlertDialogDescription>
                        您选择了 {selectedDataTypes.length} 种数据类型进行删除。数据将在30天后永久删除，届时将无法恢复。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeletionRequest}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {deletions && deletions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">删除请求</h4>
                    <div className="space-y-2">
                      {deletions.map((del) => (
                        <div key={del.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(del.status)}
                              <span className="text-sm">
                                {del.dataTypes.join(', ')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              请求时间: {new Date(del.requestedAt).toLocaleString()}
                              {del.scheduledFor && ` | 计划删除: ${new Date(del.scheduledFor).toLocaleString()}`}
                            </p>
                          </div>
                          {(del.status === 'pending' || del.status === 'scheduled') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelDeletion(del.id)}
                            >
                              取消
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
