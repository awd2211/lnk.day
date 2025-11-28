import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Database,
  Cloud,
  Zap,
  Globe,
  Play,
  Pause,
  Trash2,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  Download,
  TestTube2,
  History,
  FileText,
} from 'lucide-react';
import {
  useDataStreams,
  useDataStream,
  useDataStreamStats,
  useCreateDataStream,
  useUpdateDataStream,
  useDeleteDataStream,
  usePauseDataStream,
  useResumeDataStream,
  useTestDataStream,
  useBackfillDataStream,
  useDataStreamLogs,
  destinationTypes,
  type DataStream,
  type CreateDataStreamDto,
  type DataStreamDestination,
  type BackfillRequest,
} from '@/hooks/useDataStreams';
import { useToast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const statusConfig = {
  active: { label: '运行中', color: 'bg-green-500', icon: CheckCircle },
  paused: { label: '已暂停', color: 'bg-yellow-500', icon: Pause },
  error: { label: '错误', color: 'bg-red-500', icon: XCircle },
  pending: { label: '待配置', color: 'bg-gray-500', icon: Clock },
};

const categoryIcons = {
  'data-warehouse': Database,
  storage: Cloud,
  streaming: Zap,
  custom: Globe,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function DataStreamsPage() {
  const { toast } = useToast();
  const { data: streams, isLoading } = useDataStreams();
  const { data: stats } = useDataStreamStats();
  const createStream = useCreateDataStream();
  const updateStream = useUpdateDataStream();
  const deleteStream = useDeleteDataStream();
  const pauseStream = usePauseDataStream();
  const resumeStream = useResumeDataStream();
  const testStream = useTestDataStream();
  const backfillStream = useBackfillDataStream();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<DataStream | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [backfillDialogOpen, setBackfillDialogOpen] = useState(false);
  const [testingStreamId, setTestingStreamId] = useState<string | null>(null);

  // Create form state
  const [formData, setFormData] = useState<Partial<CreateDataStreamDto>>({
    name: '',
    description: '',
    destination: { type: 'bigquery' },
    delivery: { mode: 'batch', batchSize: 1000, batchIntervalSeconds: 300 },
    filters: { excludeBots: true, excludeInternal: true },
  });

  // Backfill form state
  const [backfillData, setBackfillData] = useState<BackfillRequest>({
    startDate: '',
    endDate: '',
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.destination?.type) {
      toast({ title: '请填写必填字段', variant: 'destructive' });
      return;
    }

    try {
      await createStream.mutateAsync(formData as CreateDataStreamDto);
      toast({ title: '数据流创建成功' });
      setCreateDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此数据流吗？')) return;
    try {
      await deleteStream.mutateAsync(id);
      toast({ title: '数据流已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handlePauseResume = async (stream: DataStream) => {
    try {
      if (stream.status === 'active') {
        await pauseStream.mutateAsync(stream.id);
        toast({ title: '数据流已暂停' });
      } else {
        await resumeStream.mutateAsync(stream.id);
        toast({ title: '数据流已恢复' });
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleTest = async (id: string) => {
    setTestingStreamId(id);
    try {
      const result = await testStream.mutateAsync(id);
      if (result.success) {
        toast({ title: '连接测试成功', description: `延迟: ${result.latency}ms` });
      } else {
        toast({ title: '连接测试失败', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '测试失败', variant: 'destructive' });
    } finally {
      setTestingStreamId(null);
    }
  };

  const handleBackfill = async () => {
    if (!selectedStream || !backfillData.startDate || !backfillData.endDate) {
      toast({ title: '请选择日期范围', variant: 'destructive' });
      return;
    }

    try {
      const result = await backfillStream.mutateAsync({
        id: selectedStream.id,
        request: backfillData,
      });
      toast({
        title: '回填任务已创建',
        description: `预计处理 ${result.estimatedEvents.toLocaleString()} 条事件`,
      });
      setBackfillDialogOpen(false);
    } catch {
      toast({ title: '创建回填任务失败', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      destination: { type: 'bigquery' },
      delivery: { mode: 'batch', batchSize: 1000, batchIntervalSeconds: 300 },
      filters: { excludeBots: true, excludeInternal: true },
    });
  };

  const getDestinationIcon = (type: string) => {
    const dest = destinationTypes.find((d) => d.value === type);
    const category = dest?.category || 'custom';
    const Icon = categoryIcons[category as keyof typeof categoryIcons] || Globe;
    return <Icon className="h-4 w-4" />;
  };

  const getDestinationLabel = (type: string) => {
    return destinationTypes.find((d) => d.value === type)?.label || type;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">数据流管理</h1>
            <p className="text-muted-foreground">
              将点击数据实时导出到您的数据仓库或云存储
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                创建数据流
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建数据流</DialogTitle>
                <DialogDescription>配置数据导出目标和选项</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="destination" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="destination">目标配置</TabsTrigger>
                  <TabsTrigger value="filters">过滤器</TabsTrigger>
                  <TabsTrigger value="delivery">投递设置</TabsTrigger>
                  <TabsTrigger value="schema">数据结构</TabsTrigger>
                </TabsList>

                <TabsContent value="destination" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>数据流名称 *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如: 生产环境数据导出"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="数据流用途说明"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>目标类型 *</Label>
                    <Select
                      value={formData.destination?.type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          destination: { ...formData.destination, type: value as DataStreamDestination['type'] },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择目标类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinationTypes.map((dest) => (
                          <SelectItem key={dest.value} value={dest.value}>
                            <div className="flex items-center gap-2">
                              {getDestinationIcon(dest.value)}
                              {dest.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* BigQuery fields */}
                  {formData.destination?.type === 'bigquery' && (
                    <>
                      <div className="space-y-2">
                        <Label>项目 ID</Label>
                        <Input
                          value={formData.destination?.projectId || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              destination: { ...formData.destination!, projectId: e.target.value },
                            })
                          }
                          placeholder="your-project-id"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>数据集 ID</Label>
                          <Input
                            value={formData.destination?.datasetId || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                destination: { ...formData.destination!, datasetId: e.target.value },
                              })
                            }
                            placeholder="analytics"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>表 ID</Label>
                          <Input
                            value={formData.destination?.tableId || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                destination: { ...formData.destination!, tableId: e.target.value },
                              })
                            }
                            placeholder="click_events"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* S3/GCS fields */}
                  {['s3', 'gcs', 'azure_blob'].includes(formData.destination?.type || '') && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>存储桶名称</Label>
                          <Input
                            value={formData.destination?.bucket || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                destination: { ...formData.destination!, bucket: e.target.value },
                              })
                            }
                            placeholder="my-bucket"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>前缀路径</Label>
                          <Input
                            value={formData.destination?.prefix || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                destination: { ...formData.destination!, prefix: e.target.value },
                              })
                            }
                            placeholder="analytics/clicks/"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>文件格式</Label>
                          <Select
                            value={formData.destination?.fileFormat || 'parquet'}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                destination: { ...formData.destination!, fileFormat: value as 'parquet' | 'json' | 'csv' },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="parquet">Parquet</SelectItem>
                              <SelectItem value="json">JSON</SelectItem>
                              <SelectItem value="csv">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>压缩方式</Label>
                          <Select
                            value={formData.destination?.compression || 'gzip'}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                destination: { ...formData.destination!, compression: value as 'gzip' | 'snappy' | 'none' },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gzip">Gzip</SelectItem>
                              <SelectItem value="snappy">Snappy</SelectItem>
                              <SelectItem value="none">无压缩</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Kafka fields */}
                  {formData.destination?.type === 'kafka' && (
                    <>
                      <div className="space-y-2">
                        <Label>Broker 地址</Label>
                        <Input
                          value={formData.destination?.brokers?.join(',') || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              destination: { ...formData.destination!, brokers: e.target.value.split(',').map((b) => b.trim()) },
                            })
                          }
                          placeholder="broker1:9092, broker2:9092"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Topic</Label>
                        <Input
                          value={formData.destination?.topic || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              destination: { ...formData.destination!, topic: e.target.value },
                            })
                          }
                          placeholder="click-events"
                        />
                      </div>
                    </>
                  )}

                  {/* HTTP fields */}
                  {formData.destination?.type === 'http' && (
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        value={formData.destination?.url || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            destination: { ...formData.destination!, url: e.target.value },
                          })
                        }
                        placeholder="https://your-endpoint.com/webhook"
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="filters" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>过滤机器人流量</Label>
                      <p className="text-sm text-muted-foreground">排除已知的爬虫和机器人</p>
                    </div>
                    <Switch
                      checked={formData.filters?.excludeBots}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          filters: { ...formData.filters, excludeBots: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>过滤内部流量</Label>
                      <p className="text-sm text-muted-foreground">排除公司内部 IP 的访问</p>
                    </div>
                    <Switch
                      checked={formData.filters?.excludeInternal}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          filters: { ...formData.filters, excludeInternal: checked },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>链接标签过滤</Label>
                    <Input
                      value={formData.filters?.linkTags?.join(', ') || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          filters: {
                            ...formData.filters,
                            linkTags: e.target.value
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      placeholder="输入标签，逗号分隔"
                    />
                    <p className="text-sm text-muted-foreground">只导出包含这些标签的链接数据</p>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>投递模式</Label>
                    <Select
                      value={formData.delivery?.mode}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          delivery: { ...formData.delivery, mode: value as 'realtime' | 'batch' },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">实时推送</SelectItem>
                        <SelectItem value="batch">批量投递</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.delivery?.mode === 'batch' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>批次大小</Label>
                          <Input
                            type="number"
                            value={formData.delivery?.batchSize || 1000}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                delivery: { ...formData.delivery, batchSize: parseInt(e.target.value) },
                              })
                            }
                          />
                          <p className="text-sm text-muted-foreground">每批最大事件数</p>
                        </div>
                        <div className="space-y-2">
                          <Label>投递间隔 (秒)</Label>
                          <Input
                            type="number"
                            value={formData.delivery?.batchIntervalSeconds || 300}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                delivery: { ...formData.delivery, batchIntervalSeconds: parseInt(e.target.value) },
                              })
                            }
                          />
                          <p className="text-sm text-muted-foreground">最大等待时间</p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>启用分区</Label>
                      <p className="text-sm text-muted-foreground">按日期自动分区数据</p>
                    </div>
                    <Switch
                      checked={formData.partitioning?.enabled}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          partitioning: { enabled: checked, pattern: 'yyyy/MM/dd' },
                        })
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="schema" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>数据结构模式</Label>
                    <Select
                      value={formData.schema?.mode || 'auto'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          schema: { mode: value as 'auto' | 'custom' },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">自动检测</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      自动模式将导出所有标准字段
                    </p>
                  </div>

                  <div className="rounded-lg border p-4 bg-muted/50">
                    <h4 className="font-medium mb-2">标准字段</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>event_id</div>
                      <div className="text-muted-foreground">事件唯一ID</div>
                      <div>timestamp</div>
                      <div className="text-muted-foreground">事件时间</div>
                      <div>link_id</div>
                      <div className="text-muted-foreground">链接ID</div>
                      <div>short_url</div>
                      <div className="text-muted-foreground">短链接</div>
                      <div>destination_url</div>
                      <div className="text-muted-foreground">目标URL</div>
                      <div>ip_address</div>
                      <div className="text-muted-foreground">访客IP</div>
                      <div>user_agent</div>
                      <div className="text-muted-foreground">浏览器UA</div>
                      <div>referrer</div>
                      <div className="text-muted-foreground">来源页面</div>
                      <div>country</div>
                      <div className="text-muted-foreground">国家</div>
                      <div>city</div>
                      <div className="text-muted-foreground">城市</div>
                      <div>device_type</div>
                      <div className="text-muted-foreground">设备类型</div>
                      <div>browser</div>
                      <div className="text-muted-foreground">浏览器</div>
                      <div>os</div>
                      <div className="text-muted-foreground">操作系统</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createStream.isPending}>
                  {createStream.isPending ? '创建中...' : '创建数据流'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总数据流</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStreams || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">运行中</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeStreams || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日事件</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.eventsToday?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日数据量</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBytes(stats?.bytesToday || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h 失败</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats?.failuresLast24h || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Streams List */}
        <Card>
          <CardHeader>
            <CardTitle>数据流列表</CardTitle>
            <CardDescription>管理您的数据导出配置</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !streams?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">还没有数据流</h3>
                <p className="text-muted-foreground mt-1">
                  创建一个数据流，将点击数据导出到您的数据仓库
                </p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建第一个数据流
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>目标</TableHead>
                    <TableHead>模式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>已投递</TableHead>
                    <TableHead>最后同步</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream) => {
                    const StatusIcon = statusConfig[stream.status].icon;
                    return (
                      <TableRow key={stream.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stream.name}</div>
                            {stream.description && (
                              <div className="text-sm text-muted-foreground">
                                {stream.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDestinationIcon(stream.destination.type)}
                            <span>{getDestinationLabel(stream.destination.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {stream.delivery.mode === 'realtime' ? '实时' : '批量'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${
                                stream.status === 'active'
                                  ? 'text-green-500'
                                  : stream.status === 'error'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                              }`}
                            />
                            <span>{statusConfig[stream.status].label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{stream.stats?.eventsDelivered.toLocaleString() || 0} 事件</div>
                            <div className="text-muted-foreground">
                              {formatBytes(stream.stats?.bytesDelivered || 0)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {stream.lastSyncAt ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(stream.lastSyncAt), {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">从未</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTest(stream.id)}
                              disabled={testingStreamId === stream.id}
                            >
                              {testingStreamId === stream.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePauseResume(stream)}
                            >
                              {stream.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedStream(stream);
                                setBackfillDialogOpen(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedStream(stream);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(stream.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Backfill Dialog */}
        <Dialog open={backfillDialogOpen} onOpenChange={setBackfillDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>历史数据回填</DialogTitle>
              <DialogDescription>
                将指定日期范围内的历史数据重新投递到目标
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={backfillData.startDate}
                    onChange={(e) =>
                      setBackfillData({ ...backfillData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={backfillData.endDate}
                    onChange={(e) =>
                      setBackfillData({ ...backfillData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">
                      注意事项
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-500">
                      回填任务可能需要较长时间，期间会产生额外的数据传输费用。
                      如果目标已有数据，可能会产生重复记录。
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBackfillDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleBackfill} disabled={backfillStream.isPending}>
                {backfillStream.isPending ? '创建中...' : '开始回填'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stream Detail Dialog */}
        {selectedStream && (
          <StreamDetailDialog
            stream={selectedStream}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
        )}
      </div>
    </Layout>
  );
}

// Stream Detail Dialog Component
function StreamDetailDialog({
  stream,
  open,
  onOpenChange,
}: {
  stream: DataStream;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: logs } = useDataStreamLogs(stream.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stream.name}</DialogTitle>
          <DialogDescription>{stream.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="config" className="mt-4">
          <TabsList>
            <TabsTrigger value="config">配置详情</TabsTrigger>
            <TabsTrigger value="logs">投递日志</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">目标配置</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">类型</span>
                    <span>{stream.destination.type}</span>
                  </div>
                  {stream.destination.projectId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">项目</span>
                      <span>{stream.destination.projectId}</span>
                    </div>
                  )}
                  {stream.destination.bucket && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">存储桶</span>
                      <span>{stream.destination.bucket}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">投递统计</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">已投递事件</span>
                    <span>{stream.stats?.eventsDelivered.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">已投递数据</span>
                    <span>{formatBytes(stream.stats?.bytesDelivered || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">失败次数</span>
                    <span className="text-red-500">{stream.stats?.failedDeliveries || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">过滤器</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-wrap gap-2">
                  {stream.filters.excludeBots && <Badge variant="outline">排除机器人</Badge>}
                  {stream.filters.excludeInternal && <Badge variant="outline">排除内部流量</Badge>}
                  {stream.filters.linkTags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      标签: {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs?.length ? (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                      log.level === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : log.level === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                      <Badge
                        variant={
                          log.level === 'error'
                            ? 'destructive'
                            : log.level === 'warning'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {log.level}
                      </Badge>
                    </div>
                    <p>{log.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  暂无日志记录
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
