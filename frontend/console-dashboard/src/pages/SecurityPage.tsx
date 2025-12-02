import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Key,
  UserX,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Eye,
  RefreshCcw,
  Plus,
  Trash2,
  Settings,
  Activity,
  Search,
  Download,
  MoreHorizontal,
  Fingerprint,
  Smartphone,
  MapPin,
  Wifi,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface SecuritySettings {
  id?: string;
  // 密码策略
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpiryDays: number;
  preventPasswordReuse: number;
  // 登录安全
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireMfa: boolean;
  // IP 限制
  ipWhitelistEnabled: boolean;
  ipBlacklistEnabled: boolean;
  rateLimit: number;
  // 其他
  auditLogRetentionDays: number;
  sensitiveDataMasking: boolean;
  forceHttps: boolean;
  // 元数据
  updatedById?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SecurityEvent {
  id: string;
  type: string; // login_success, login_failed, logout, password_changed, two_factor_enabled, etc.
  userId: string;
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  location?: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
  createdAt: string;
}

interface BlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  blockedById: string;
  blockedByName: string;
  createdAt: string;
  expiresAt?: string;
  permanent: boolean;
}

interface ActiveSession {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  ipAddress: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  lastActivityAt: string;
  createdAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

interface SecurityStats {
  securityScore: number;
  loginStats: {
    successfulLogins24h: number;
    failedLogins24h: number;
    totalActiveSessions: number;
  };
  mfaStats: {
    mfaEnabled: number;
    mfaDisabled: number;
    mfaRate: number;
  };
  blockedIps: number;
  recentThreats: any[];
}

export default function SecurityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddIpDialog, setShowAddIpDialog] = useState(false);
  const [newBlockedIp, setNewBlockedIp] = useState({ ip: '', reason: '', permanent: false });

  // 获取安全统计（平台级）
  const { data: stats } = useQuery<SecurityStats>({
    queryKey: ['security-stats'],
    queryFn: () => api.get('/proxy/security/platform-stats').then((r) => r.data),
  });

  // 获取安全设置
  const { data: settings } = useQuery<SecuritySettings>({
    queryKey: ['security-settings'],
    queryFn: () => api.get('/proxy/security/settings').then((r) => r.data),
  });

  // 获取安全事件（平台级）
  const { data: eventsData } = useQuery({
    queryKey: ['security-events', searchQuery],
    queryFn: () =>
      api.get('/proxy/security/platform-events', {
        params: { search: searchQuery || undefined, limit: 50 },
      }).then((r) => r.data),
  });

  // 获取封禁 IP 列表
  const { data: blockedIpsData } = useQuery({
    queryKey: ['security-blocked-ips'],
    queryFn: () => api.get('/proxy/security/blocked-ips').then((r) => r.data),
  });

  // 获取活跃会话
  const { data: sessionsData } = useQuery({
    queryKey: ['security-sessions'],
    queryFn: () => api.get('/proxy/security/sessions').then((r) => r.data),
  });

  const events: SecurityEvent[] = eventsData?.items || eventsData?.events || [];
  const blockedIps: BlockedIP[] = blockedIpsData?.items || blockedIpsData?.ips || [];
  const sessions: ActiveSession[] = sessionsData?.items || sessionsData?.sessions || [];

  // 设置表单状态
  const [settingsForm, setSettingsForm] = useState<Partial<SecuritySettings>>({});

  // 保存设置
  const saveSettingsMutation = useMutation({
    mutationFn: (data: Partial<SecuritySettings>) => api.put('/proxy/security/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
      toast({ title: '成功', description: '安全设置已保存' });
    },
    onError: () => {
      toast({ title: '错误', description: '保存失败', variant: 'destructive' });
    },
  });

  // 添加封禁 IP
  const addBlockedIpMutation = useMutation({
    mutationFn: (data: { ip: string; reason: string; permanent: boolean }) =>
      api.post('/proxy/security/blocked-ips', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast({ title: '成功', description: 'IP 已封禁' });
      setShowAddIpDialog(false);
      setNewBlockedIp({ ip: '', reason: '', permanent: false });
    },
    onError: () => {
      toast({ title: '错误', description: '操作失败', variant: 'destructive' });
    },
  });

  // 解封 IP
  const unblockIpMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proxy/security/blocked-ips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast({ title: '成功', description: 'IP 已解封' });
    },
    onError: () => {
      toast({ title: '错误', description: '操作失败', variant: 'destructive' });
    },
  });

  // 终止会话
  const terminateSessionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proxy/security/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-sessions'] });
      toast({ title: '成功', description: '会话已终止' });
    },
    onError: () => {
      toast({ title: '错误', description: '操作失败', variant: 'destructive' });
    },
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login_success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'login_failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'logout':
        return <Activity className="h-4 w-4 text-gray-500" />;
      case 'password_changed':
      case 'password_reset_requested':
      case 'password_reset_completed':
        return <Key className="h-4 w-4 text-blue-500" />;
      case 'two_factor_enabled':
      case 'two_factor_disabled':
        return <Fingerprint className="h-4 w-4 text-purple-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'session_revoked':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'account_locked':
        return <Lock className="h-4 w-4 text-red-500" />;
      case 'account_unlocked':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'email_changed':
      case 'profile_updated':
        return <Settings className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">严重</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700">警告</Badge>;
      case 'info':
      default:
        return <Badge variant="secondary">信息</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">安全中心</h2>
          <p className="text-muted-foreground">平台安全设置和监控</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['security-stats'] })}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* 安全概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 安全评分卡片 */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">安全评分</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getSecurityScoreColor(stats?.securityScore || 0)}`}>
              {stats?.securityScore || 0}
            </div>
            <Progress value={stats?.securityScore || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {(stats?.securityScore || 0) >= 80 ? '安全状态良好' : '建议提升安全配置'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h 登录</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.loginStats?.successfulLogins24h || 0}</div>
            <p className="text-xs text-muted-foreground">
              失败: {stats?.loginStats?.failedLogins24h || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃会话</CardTitle>
            <Wifi className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.loginStats?.totalActiveSessions || 0}</div>
            <p className="text-xs text-muted-foreground">当前在线</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA 启用率</CardTitle>
            <Fingerprint className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.mfaStats?.mfaRate || 0)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.mfaStats?.mfaEnabled || 0} 用户已启用
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">安全事件</TabsTrigger>
          <TabsTrigger value="sessions">活跃会话</TabsTrigger>
          <TabsTrigger value="blocked-ips">IP 封禁</TabsTrigger>
          <TabsTrigger value="settings">安全策略</TabsTrigger>
        </TabsList>

        {/* 安全事件 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>安全事件日志</CardTitle>
                  <CardDescription>登录、认证和安全相关事件</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索事件..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>事件</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>严重性</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无安全事件
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.type)}
                            <span>{event.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.userName ? (
                            <div>
                              <p className="font-medium">{event.userName}</p>
                              <p className="text-xs text-muted-foreground">{event.userEmail}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{event.ipAddress}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {event.location || '未知'}
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(event.createdAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 活跃会话 */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>活跃会话</CardTitle>
              <CardDescription>当前在线的用户会话</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>设备</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>最后活动</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无活跃会话
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{session.userName || `User ${session.userId.slice(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground">{session.userEmail || session.userId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{session.deviceName || session.browser || '未知设备'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{session.ipAddress}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {session.location || '未知'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(session.lastActivityAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => terminateSessionMutation.mutate(session.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IP 封禁 */}
        <TabsContent value="blocked-ips" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>IP 封禁列表</CardTitle>
                  <CardDescription>被封禁的 IP 地址</CardDescription>
                </div>
                <Button onClick={() => setShowAddIpDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加封禁
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>封禁时间</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无封禁 IP
                      </TableCell>
                    </TableRow>
                  ) : (
                    blockedIps.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">{ip.ipAddress}</code>
                        </TableCell>
                        <TableCell>{ip.reason}</TableCell>
                        <TableCell>{formatDate(ip.createdAt)}</TableCell>
                        <TableCell>
                          {ip.permanent ? (
                            <Badge variant="destructive">永久</Badge>
                          ) : (
                            formatDate(ip.expiresAt || '')
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-red-600">
                            <Ban className="mr-1 h-3 w-3" />
                            已封禁
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => unblockIpMutation.mutate(ip.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全策略 */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 密码策略 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  密码策略
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>最小密码长度</Label>
                  <Input
                    type="number"
                    value={settingsForm.minPasswordLength ?? settings?.minPasswordLength ?? 8}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      minPasswordLength: parseInt(e.target.value) || 8,
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>要求大写字母</Label>
                  <Switch
                    checked={settingsForm.requireUppercase ?? settings?.requireUppercase ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, requireUppercase: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>要求小写字母</Label>
                  <Switch
                    checked={settingsForm.requireLowercase ?? settings?.requireLowercase ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, requireLowercase: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>要求数字</Label>
                  <Switch
                    checked={settingsForm.requireNumbers ?? settings?.requireNumbers ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, requireNumbers: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>要求特殊字符</Label>
                  <Switch
                    checked={settingsForm.requireSpecialChars ?? settings?.requireSpecialChars ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, requireSpecialChars: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码过期天数 (0 = 不过期)</Label>
                  <Input
                    type="number"
                    value={settingsForm.passwordExpiryDays ?? settings?.passwordExpiryDays ?? 0}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      passwordExpiryDays: parseInt(e.target.value) || 0,
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 登录安全 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  登录安全
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>最大登录尝试次数</Label>
                  <Input
                    type="number"
                    value={settingsForm.maxLoginAttempts ?? settings?.maxLoginAttempts ?? 5}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      maxLoginAttempts: parseInt(e.target.value) || 5,
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>锁定时长 (分钟)</Label>
                  <Input
                    type="number"
                    value={settingsForm.lockoutDuration ?? settings?.lockoutDuration ?? 30}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      lockoutDuration: parseInt(e.target.value) || 30,
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>会话超时 (分钟)</Label>
                  <Input
                    type="number"
                    value={settingsForm.sessionTimeout ?? settings?.sessionTimeout ?? 60}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      sessionTimeout: parseInt(e.target.value) || 60,
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>强制多因素认证</Label>
                    <p className="text-sm text-muted-foreground">要求所有用户启用 MFA</p>
                  </div>
                  <Switch
                    checked={settingsForm.requireMfa ?? settings?.requireMfa ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, requireMfa: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* IP 限制 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  IP 限制
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用 IP 白名单</Label>
                    <p className="text-sm text-muted-foreground">只允许白名单 IP 访问</p>
                  </div>
                  <Switch
                    checked={settingsForm.ipWhitelistEnabled ?? settings?.ipWhitelistEnabled ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, ipWhitelistEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>启用 IP 黑名单</Label>
                    <p className="text-sm text-muted-foreground">自动封禁可疑 IP</p>
                  </div>
                  <Switch
                    checked={settingsForm.ipBlacklistEnabled ?? settings?.ipBlacklistEnabled ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, ipBlacklistEnabled: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API 请求限流 (次/分钟)</Label>
                  <Input
                    type="number"
                    value={settingsForm.rateLimit ?? settings?.rateLimit ?? 100}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      rateLimit: parseInt(e.target.value) || 100,
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 其他设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  其他设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>审计日志保留天数</Label>
                  <Input
                    type="number"
                    value={settingsForm.auditLogRetentionDays ?? settings?.auditLogRetentionDays ?? 90}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      auditLogRetentionDays: parseInt(e.target.value) || 90,
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>敏感数据脱敏</Label>
                    <p className="text-sm text-muted-foreground">在日志中隐藏敏感信息</p>
                  </div>
                  <Switch
                    checked={settingsForm.sensitiveDataMasking ?? settings?.sensitiveDataMasking ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, sensitiveDataMasking: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>强制 HTTPS</Label>
                    <p className="text-sm text-muted-foreground">所有请求必须使用 HTTPS</p>
                  </div>
                  <Switch
                    checked={settingsForm.forceHttps ?? settings?.forceHttps ?? false}
                    onCheckedChange={(v) => setSettingsForm({ ...settingsForm, forceHttps: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveSettingsMutation.mutate(settingsForm)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              保存安全设置
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* 添加封禁 IP 对话框 */}
      <Dialog open={showAddIpDialog} onOpenChange={setShowAddIpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加 IP 封禁</DialogTitle>
            <DialogDescription>封禁指定的 IP 地址</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>IP 地址</Label>
              <Input
                placeholder="192.168.1.1 或 192.168.1.0/24"
                value={newBlockedIp.ip}
                onChange={(e) => setNewBlockedIp({ ...newBlockedIp, ip: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>封禁原因</Label>
              <Textarea
                placeholder="输入封禁原因..."
                value={newBlockedIp.reason}
                onChange={(e) => setNewBlockedIp({ ...newBlockedIp, reason: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>永久封禁</Label>
              <Switch
                checked={newBlockedIp.permanent}
                onCheckedChange={(v) => setNewBlockedIp({ ...newBlockedIp, permanent: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIpDialog(false)}>
              取消
            </Button>
            <Button onClick={() => addBlockedIpMutation.mutate(newBlockedIp)}>
              <Ban className="mr-2 h-4 w-4" />
              封禁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
