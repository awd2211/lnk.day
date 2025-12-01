import { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Lock,
  Globe,
  AlertTriangle,
  Clock,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Copy,
  Monitor,
  MapPin,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

// Types
interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'api_key_created' | '2fa_enabled' | 'suspicious_activity';
  description: string;
  ip: string;
  location: string;
  createdAt: string;
  status: 'success' | 'failed' | 'blocked';
}

interface TrustedDevice {
  id: string;
  name: string;
  lastUsed: string;
  addedAt: string;
}

// Mock data
const mockSessions: Session[] = [
  {
    id: '1',
    device: 'MacBook Pro',
    browser: 'Chrome 120',
    ip: '123.45.67.89',
    location: '上海, 中国',
    lastActive: '2024-02-15T10:30:00Z',
    isCurrent: true,
  },
  {
    id: '2',
    device: 'iPhone 15',
    browser: 'Safari',
    ip: '123.45.67.90',
    location: '上海, 中国',
    lastActive: '2024-02-14T18:20:00Z',
    isCurrent: false,
  },
  {
    id: '3',
    device: 'Windows PC',
    browser: 'Edge 120',
    ip: '98.76.54.32',
    location: '北京, 中国',
    lastActive: '2024-02-10T09:15:00Z',
    isCurrent: false,
  },
];

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: '1',
    type: 'login',
    description: '成功登录',
    ip: '123.45.67.89',
    location: '上海, 中国',
    createdAt: '2024-02-15T10:30:00Z',
    status: 'success',
  },
  {
    id: '2',
    type: 'api_key_created',
    description: '创建新的 API Key',
    ip: '123.45.67.89',
    location: '上海, 中国',
    createdAt: '2024-02-14T15:00:00Z',
    status: 'success',
  },
  {
    id: '3',
    type: 'login',
    description: '登录失败 - 密码错误',
    ip: '111.22.33.44',
    location: '未知位置',
    createdAt: '2024-02-13T03:45:00Z',
    status: 'failed',
  },
  {
    id: '4',
    type: 'suspicious_activity',
    description: '异常登录尝试已被阻止',
    ip: '222.33.44.55',
    location: '俄罗斯',
    createdAt: '2024-02-12T08:20:00Z',
    status: 'blocked',
  },
  {
    id: '5',
    type: '2fa_enabled',
    description: '启用两步验证',
    ip: '123.45.67.89',
    location: '上海, 中国',
    createdAt: '2024-02-01T14:30:00Z',
    status: 'success',
  },
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  login: '登录',
  logout: '登出',
  password_change: '密码修改',
  api_key_created: 'API Key',
  '2fa_enabled': '两步验证',
  suspicious_activity: '可疑活动',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  blocked: 'bg-orange-100 text-orange-700',
};

export default function SecuritySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

  // Security settings state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [suspiciousActivityAlerts, setSuspiciousActivityAlerts] = useState(true);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('7');

  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 2FA setup dialog
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [qrCode] = useState('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/lnk.day:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=lnk.day');
  const [backupCodes] = useState(['ABC12-DEF34', 'GHI56-JKL78', 'MNO90-PQR12', 'STU34-VWX56']);

  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSessions(mockSessions);
    setSecurityEvents(mockSecurityEvents);
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: '密码不匹配', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: '密码至少需要8个字符', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({ title: '密码已更新' });
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast({ title: '修改失败', variant: 'destructive' });
    }
    setIsChangingPassword(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast({ title: '会话已终止' });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSessions(sessions.filter((s) => s.isCurrent));
      toast({ title: '已终止所有其他会话' });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleEnable2FA = async () => {
    if (twoFactorCode.length !== 6) {
      toast({ title: '请输入6位验证码', variant: 'destructive' });
      return;
    }
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTwoFactorEnabled(true);
      setShow2FADialog(false);
      toast({ title: '两步验证已启用' });
    } catch {
      toast({ title: '验证失败', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return `${days} 天前`;
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { label: '弱', color: 'bg-red-500' };
    if (strength <= 3) return { label: '中等', color: 'bg-yellow-500' };
    return { label: '强', color: 'bg-green-500' };
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">安全设置</h1>
          <p className="text-muted-foreground">管理您的账户安全和隐私设置</p>
        </div>

        {/* Security Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">安全等级</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">良好</div>
              <p className="text-xs text-muted-foreground">已启用两步验证</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃会话</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <p className="text-xs text-muted-foreground">设备已登录</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最近事件</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {securityEvents.filter((e) => e.status === 'blocked').length}
              </div>
              <p className="text-xs text-muted-foreground">被阻止的可疑活动</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="authentication">
          <TabsList>
            <TabsTrigger value="authentication">
              <Key className="h-4 w-4 mr-2" />
              身份验证
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Monitor className="h-4 w-4 mr-2" />
              登录会话
            </TabsTrigger>
            <TabsTrigger value="events">
              <Clock className="h-4 w-4 mr-2" />
              安全事件
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Shield className="h-4 w-4 mr-2" />
              高级设置
            </TabsTrigger>
          </TabsList>

          {/* Authentication Tab */}
          <TabsContent value="authentication" className="space-y-6">
            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle>密码</CardTitle>
                <CardDescription>修改您的登录密码</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">登录密码</p>
                    <p className="text-sm text-muted-foreground">
                      上次修改: 30 天前
                    </p>
                  </div>
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">修改密码</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>修改密码</DialogTitle>
                        <DialogDescription>
                          请输入当前密码和新密码
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">当前密码</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPasswords ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPasswords(!showPasswords)}
                            >
                              {showPasswords ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">新密码</Label>
                          <Input
                            id="newPassword"
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          {newPassword && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getPasswordStrength(newPassword).color}`}
                                  style={{
                                    width: `${
                                      (getPasswordStrength(newPassword).label === '弱'
                                        ? 33
                                        : getPasswordStrength(newPassword).label === '中等'
                                        ? 66
                                        : 100)
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {getPasswordStrength(newPassword).label}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">确认新密码</Label>
                          <Input
                            id="confirmPassword"
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-sm text-red-500">密码不匹配</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? '修改中...' : '确认修改'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>两步验证</CardTitle>
                <CardDescription>
                  通过手机验证器应用增强账户安全性
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <p className="font-medium">验证器应用</p>
                      {twoFactorEnabled && (
                        <Badge variant="default" className="bg-green-600">
                          已启用
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      使用 Google Authenticator 或其他验证器应用
                    </p>
                  </div>
                  {twoFactorEnabled ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTwoFactorEnabled(false);
                        toast({ title: '两步验证已禁用' });
                      }}
                    >
                      禁用
                    </Button>
                  ) : (
                    <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
                      <DialogTrigger asChild>
                        <Button>启用</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>启用两步验证</DialogTitle>
                          <DialogDescription>
                            使用验证器应用扫描下方二维码
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex justify-center">
                            <img
                              src={qrCode}
                              alt="2FA QR Code"
                              className="w-48 h-48 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>输入验证码</Label>
                            <Input
                              placeholder="000000"
                              maxLength={6}
                              value={twoFactorCode}
                              onChange={(e) =>
                                setTwoFactorCode(e.target.value.replace(/\D/g, ''))
                              }
                              className="text-center text-2xl tracking-widest"
                            />
                          </div>
                          <Separator />
                          <div>
                            <Label className="text-muted-foreground">备用恢复码</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              请妥善保存这些恢复码，用于在无法使用验证器时恢复账户
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {backupCodes.map((code) => (
                                <code
                                  key={code}
                                  className="bg-muted p-2 rounded text-center text-sm"
                                >
                                  {code}
                                </code>
                              ))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleEnable2FA}>确认启用</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>活跃会话</CardTitle>
                    <CardDescription>管理您的登录设备</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRevokeAllSessions}
                    disabled={sessions.filter((s) => !s.isCurrent).length === 0}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    终止所有其他会话
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Monitor className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{session.device}</p>
                            {session.isCurrent && (
                              <Badge variant="secondary">当前设备</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {session.browser} · {session.ip}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                            <span className="mx-1">·</span>
                            {formatRelativeTime(session.lastActive)}
                          </div>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>安全事件日志</CardTitle>
                <CardDescription>查看账户的安全相关活动</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事件类型</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>IP 地址</TableHead>
                      <TableHead>位置</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {EVENT_TYPE_LABELS[event.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.ip}
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[event.status]}>
                            {event.status === 'success' && <Check className="h-3 w-3 mr-1" />}
                            {event.status === 'failed' && <X className="h-3 w-3 mr-1" />}
                            {event.status === 'blocked' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {event.status === 'success'
                              ? '成功'
                              : event.status === 'failed'
                              ? '失败'
                              : '已阻止'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>安全通知</CardTitle>
                <CardDescription>配置安全相关的通知设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">登录通知</p>
                    <p className="text-sm text-muted-foreground">
                      当有新设备登录时发送邮件通知
                    </p>
                  </div>
                  <Switch
                    checked={loginNotifications}
                    onCheckedChange={setLoginNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">可疑活动警报</p>
                    <p className="text-sm text-muted-foreground">
                      检测到异常登录尝试时发送警报
                    </p>
                  </div>
                  <Switch
                    checked={suspiciousActivityAlerts}
                    onCheckedChange={setSuspiciousActivityAlerts}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>会话设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">会话超时</p>
                    <p className="text-sm text-muted-foreground">
                      自动登出的空闲时间
                    </p>
                  </div>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="border rounded-md px-3 py-2"
                  >
                    <option value="1">1 天</option>
                    <option value="7">7 天</option>
                    <option value="30">30 天</option>
                    <option value="never">永不过期</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>IP 白名单</CardTitle>
                <CardDescription>
                  限制只能从特定 IP 地址访问账户
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">启用 IP 白名单</p>
                    <p className="text-sm text-muted-foreground">
                      仅允许白名单中的 IP 地址登录
                    </p>
                  </div>
                  <Switch
                    checked={ipWhitelistEnabled}
                    onCheckedChange={setIpWhitelistEnabled}
                  />
                </div>
                {ipWhitelistEnabled && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>注意</AlertTitle>
                      <AlertDescription>
                        启用 IP 白名单后，您只能从指定的 IP 地址登录。
                        请确保添加您当前的 IP 地址。
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>允许的 IP 地址</Label>
                      <div className="flex gap-2">
                        <Input placeholder="例如: 123.45.67.89" />
                        <Button>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
