import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { authService } from '@/lib/api';

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
  enabledAt?: string;
}

interface EnableResponse {
  qrCode: string; // Base64 encoded QR code image
  secret: string; // Manual entry secret
  backupCodes: string[];
}

export function TwoFactorSetup() {
  const { toast } = useToast();
  const { copy, copied } = useCopyToClipboard();
  const queryClient = useQueryClient();

  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');
  const [enableData, setEnableData] = useState<EnableResponse | null>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');

  // Query 2FA status
  const { data: status, isLoading } = useQuery({
    queryKey: ['2fa', 'status'],
    queryFn: async () => {
      const { data } = await authService.get2FAStatus();
      return data as TwoFactorStatus;
    },
  });

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: () => authService.enable2FA(),
    onSuccess: (response) => {
      setEnableData(response.data as EnableResponse);
      setStep('qr');
      setShowEnableDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: '启用失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    },
  });

  // Verify 2FA mutation
  const verifyMutation = useMutation({
    mutationFn: (code: string) => authService.verify2FA(code),
    onSuccess: () => {
      setStep('backup');
      queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
    },
    onError: (error: any) => {
      toast({
        title: '验证失败',
        description: error.response?.data?.message || '验证码不正确',
        variant: 'destructive',
      });
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: (code: string) => authService.disable2FA(code),
    onSuccess: () => {
      setShowDisableDialog(false);
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
      toast({ title: '双因素认证已禁用' });
    },
    onError: (error: any) => {
      toast({
        title: '禁用失败',
        description: error.response?.data?.message || '验证码不正确',
        variant: 'destructive',
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateMutation = useMutation({
    mutationFn: (code: string) => authService.regenerateBackupCodes(code),
    onSuccess: (response) => {
      setShowRegenerateDialog(false);
      setRegenerateCode('');
      setNewBackupCodes((response.data as { backupCodes: string[] }).backupCodes);
      setShowBackupCodesDialog(true);
      queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
    },
    onError: (error: any) => {
      toast({
        title: '重新生成失败',
        description: error.response?.data?.message || '验证码不正确',
        variant: 'destructive',
      });
    },
  });

  const handleEnable = () => {
    enableMutation.mutate();
  };

  const handleVerify = () => {
    if (!verifyCode.trim() || verifyCode.length !== 6) {
      toast({ title: '请输入 6 位验证码', variant: 'destructive' });
      return;
    }
    verifyMutation.mutate(verifyCode);
  };

  const handleDisable = () => {
    if (!disableCode.trim()) {
      toast({ title: '请输入验证码', variant: 'destructive' });
      return;
    }
    disableMutation.mutate(disableCode);
  };

  const handleRegenerate = () => {
    if (!regenerateCode.trim()) {
      toast({ title: '请输入验证码', variant: 'destructive' });
      return;
    }
    regenerateMutation.mutate(regenerateCode);
  };

  const handleCloseEnableDialog = () => {
    if (step === 'backup') {
      // Only allow closing after seeing backup codes
      setShowEnableDialog(false);
      setEnableData(null);
      setVerifyCode('');
      setStep('qr');
      toast({ title: '双因素认证已启用' });
    } else {
      // Confirm before closing during setup
      if (confirm('确定要取消设置吗？您需要重新开始。')) {
        setShowEnableDialog(false);
        setEnableData(null);
        setVerifyCode('');
        setStep('qr');
      }
    }
  };

  const handleCopyBackupCodes = () => {
    const codes = (enableData?.backupCodes || newBackupCodes).join('\n');
    copy(codes);
    toast({ title: '备份码已复制到剪贴板' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              status?.enabled
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {status?.enabled ? (
              <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <Shield className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">双因素认证</h3>
              <Badge
                variant={status?.enabled ? 'default' : 'secondary'}
                className={
                  status?.enabled
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : ''
                }
              >
                {status?.enabled ? '已启用' : '未启用'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              使用身份验证器应用为您的账户添加额外的安全保护
            </p>
            {status?.enabled && status.enabledAt && (
              <p className="mt-1 text-xs text-gray-400">
                启用于 {new Date(status.enabledAt).toLocaleDateString('zh-CN')}
              </p>
            )}
          </div>
        </div>

        {status?.enabled ? (
          <Button
            variant="outline"
            onClick={() => setShowDisableDialog(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
          >
            <ShieldOff className="mr-2 h-4 w-4" />
            禁用
          </Button>
        ) : (
          <Button onClick={handleEnable} disabled={enableMutation.isPending}>
            {enableMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                启用中...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                启用
              </>
            )}
          </Button>
        )}
      </div>

      {/* Backup codes status */}
      {status?.enabled && (
        <div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">备份码</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  剩余 {status.backupCodesRemaining} 个备份码
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateDialog(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重新生成
            </Button>
          </div>
          {status.backupCodesRemaining <= 2 && (
            <div className="mt-3 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">备份码即将用尽，建议重新生成</span>
            </div>
          )}
        </div>
      )}

      {/* Enable 2FA Dialog */}
      <Dialog open={showEnableDialog} onOpenChange={handleCloseEnableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'qr' && '设置双因素认证'}
              {step === 'verify' && '验证设置'}
              {step === 'backup' && '保存备份码'}
            </DialogTitle>
            <DialogDescription>
              {step === 'qr' && '使用身份验证器应用扫描二维码'}
              {step === 'verify' && '输入应用中显示的 6 位验证码'}
              {step === 'backup' && '请妥善保存这些备份码，它们可以在您无法访问验证器时使用'}
            </DialogDescription>
          </DialogHeader>

          {step === 'qr' && enableData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-lg bg-white p-4">
                  <img
                    src={enableData.qrCode}
                    alt="2FA QR Code"
                    className="h-48 w-48"
                  />
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  无法扫描？手动输入此密钥：
                </p>
                <code className="break-all text-sm font-mono">{enableData.secret}</code>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                <Smartphone className="h-5 w-5 shrink-0" />
                <p>推荐使用 Google Authenticator、Microsoft Authenticator 或 Authy</p>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="verify-code">验证码</Label>
                <Input
                  id="verify-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="mt-1 text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>
          )}

          {step === 'backup' && enableData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  这些备份码只会显示一次，请立即保存
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                {enableData.backupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="rounded bg-white px-2 py-1 text-center font-mono text-sm dark:bg-gray-700"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={handleCopyBackupCodes}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    复制所有备份码
                  </>
                )}
              </Button>
            </div>
          )}

          <DialogFooter>
            {step === 'qr' && (
              <Button onClick={() => setStep('verify')}>下一步</Button>
            )}
            {step === 'verify' && (
              <>
                <Button variant="outline" onClick={() => setStep('qr')}>
                  返回
                </Button>
                <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    '验证'
                  )}
                </Button>
              </>
            )}
            {step === 'backup' && (
              <Button onClick={handleCloseEnableDialog}>我已保存备份码</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>禁用双因素认证</AlertDialogTitle>
            <AlertDialogDescription>
              禁用双因素认证将降低您账户的安全性。请输入验证码以确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="disable-code">验证码</Label>
            <Input
              id="disable-code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="mt-1"
              maxLength={6}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableCode('')}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disableMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {disableMutation.isPending ? '禁用中...' : '禁用'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新生成备份码</AlertDialogTitle>
            <AlertDialogDescription>
              重新生成后，旧的备份码将失效。请输入验证码以确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="regenerate-code">验证码</Label>
            <Input
              id="regenerate-code"
              value={regenerateCode}
              onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="mt-1"
              maxLength={6}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegenerateCode('')}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate} disabled={regenerateMutation.isPending}>
              {regenerateMutation.isPending ? '生成中...' : '重新生成'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Backup Codes Dialog */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新的备份码</DialogTitle>
            <DialogDescription>
              请妥善保存这些新的备份码，旧的备份码已失效
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                这些备份码只会显示一次，请立即保存
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              {newBackupCodes.map((code, i) => (
                <code
                  key={i}
                  className="rounded bg-white px-2 py-1 text-center font-mono text-sm dark:bg-gray-700"
                >
                  {code}
                </code>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyBackupCodes}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  复制所有备份码
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowBackupCodesDialog(false);
                setNewBackupCodes([]);
              }}
            >
              我已保存备份码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
