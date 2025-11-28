import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { privacyService } from '@/lib/api';

interface PrivacyConsent {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

interface PrivacyOverview {
  dataCollected: string[];
  dataRetentionDays: number;
  lastExportRequest?: string;
  pendingDeleteRequest?: {
    requestedAt: string;
    scheduledAt: string;
  };
}

export function PrivacySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Queries
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['privacy', 'overview'],
    queryFn: async () => {
      const { data } = await privacyService.getOverview();
      return data as PrivacyOverview;
    },
  });

  const { data: consents, isLoading: consentsLoading } = useQuery({
    queryKey: ['privacy', 'consents'],
    queryFn: async () => {
      const { data } = await privacyService.getConsents();
      return data as { consents: PrivacyConsent[] };
    },
  });

  // Mutations
  const updateConsentsMutation = useMutation({
    mutationFn: (data: Record<string, boolean>) => privacyService.updateConsents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'consents'] });
      toast({ title: '偏好设置已更新' });
    },
    onError: (error: any) => {
      toast({
        title: '更新失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => privacyService.requestExport(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'overview'] });
      toast({
        title: '导出请求已提交',
        description: '我们将在 24 小时内通过邮件发送您的数据',
      });
    },
    onError: (error: any) => {
      toast({
        title: '请求失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => privacyService.requestDeleteAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'overview'] });
      setShowDeleteDialog(false);
      toast({
        title: '删除请求已提交',
        description: '您的账户将在 30 天后永久删除',
      });
    },
    onError: (error: any) => {
      toast({
        title: '请求失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    },
  });

  const cancelDeleteMutation = useMutation({
    mutationFn: () => privacyService.cancelDeleteRequest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'overview'] });
      toast({ title: '删除请求已取消' });
    },
    onError: (error: any) => {
      toast({
        title: '取消失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    },
  });

  const handleConsentToggle = (consentId: string, enabled: boolean) => {
    updateConsentsMutation.mutate({ [consentId]: enabled });
  };

  const isLoading = overviewLoading || consentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Privacy Overview */}
      <div>
        <h3 className="mb-4 text-lg font-semibold dark:text-white">数据隐私</h3>
        <div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium dark:text-white">您的数据安全</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                我们遵循 GDPR 和 CCPA 规定保护您的隐私。您的数据将保留{' '}
                {overview?.dataRetentionDays || 365} 天。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Management */}
      <div>
        <h3 className="mb-4 text-lg font-semibold dark:text-white">同意管理</h3>
        <div className="space-y-4">
          {consents?.consents.map((consent) => (
            <div
              key={consent.id}
              className="flex items-start justify-between rounded-lg border p-4 dark:border-gray-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={consent.id} className="font-medium dark:text-white">
                    {consent.name}
                  </Label>
                  {consent.required && (
                    <Badge variant="secondary" className="text-xs">
                      必需
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {consent.description}
                </p>
              </div>
              <Switch
                id={consent.id}
                checked={consent.enabled}
                onCheckedChange={(enabled) => handleConsentToggle(consent.id, enabled)}
                disabled={consent.required || updateConsentsMutation.isPending}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Data Export */}
      <div>
        <h3 className="mb-4 text-lg font-semibold dark:text-white">数据导出</h3>
        <div className="rounded-lg border p-4 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium dark:text-white">导出您的数据</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                下载您在 lnk.day 上的所有数据副本
              </p>
              {overview?.lastExportRequest && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  上次导出请求:{' '}
                  {new Date(overview.lastExportRequest).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              导出数据
            </Button>
          </div>
        </div>
      </div>

      {/* Account Deletion */}
      <div>
        <h3 className="mb-4 text-lg font-semibold dark:text-white">账户删除</h3>
        {overview?.pendingDeleteRequest ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-300">
                  账户删除已计划
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  您的账户将于{' '}
                  {new Date(overview.pendingDeleteRequest.scheduledAt).toLocaleDateString(
                    'zh-CN'
                  )}{' '}
                  永久删除。在此之前，您可以取消此请求。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => cancelDeleteMutation.mutate()}
                  disabled={cancelDeleteMutation.isPending}
                >
                  {cancelDeleteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  取消删除请求
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-4 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium dark:text-white">永久删除账户</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  删除后，您的所有数据将被永久移除，此操作不可撤销
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除账户
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除账户吗？</AlertDialogTitle>
            <AlertDialogDescription>
              您的账户将在 30 天冷静期后永久删除。在此期间，您可以随时取消删除请求。删除后，以下数据将被永久移除：
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>所有短链接和统计数据</li>
                <li>二维码和配置</li>
                <li>团队和权限设置</li>
                <li>账户信息和偏好</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? '处理中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
