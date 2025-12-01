import { useState } from 'react';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Shield,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useApiKeys,
  useApiKeyScopes,
  useCreateApiKey,
  useDeleteApiKey,
  useRevokeApiKey,
  useRegenerateApiKey,
  type ApiKey,
  type ApiKeyWithSecret,
} from '@/hooks/useApiKeys';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

const statusColors: Record<ApiKey['status'], string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const statusLabels: Record<ApiKey['status'], string> = {
  active: '活跃',
  revoked: '已撤销',
  expired: '已过期',
};

export function ApiKeyManager() {
  const { toast } = useToast();
  const { copy, copied } = useCopyToClipboard();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<ApiKeyWithSecret | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [ipWhitelist, setIpWhitelist] = useState('');

  // Confirm dialog state
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [regeneratingKeyId, setRegeneratingKeyId] = useState<string | null>(null);

  // Queries
  const { data: keysData, isLoading: keysLoading } = useApiKeys();
  const { data: scopesData } = useApiKeyScopes();

  // Mutations
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();
  const revokeKey = useRevokeApiKey();
  const regenerateKey = useRegenerateApiKey();

  const handleCreateKey = async () => {
    if (!name.trim()) {
      toast({ title: '请输入密钥名称', variant: 'destructive' });
      return;
    }

    if (selectedScopes.length === 0) {
      toast({ title: '请选择至少一个权限', variant: 'destructive' });
      return;
    }

    try {
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const ips = ipWhitelist
        .split('\n')
        .map((ip) => ip.trim())
        .filter(Boolean);

      const response = await createKey.mutateAsync({
        name: name.trim(),
        scopes: selectedScopes,
        expiresAt,
        ipWhitelist: ips.length > 0 ? ips : undefined,
      });

      setNewKeyData(response.data as ApiKeyWithSecret);
      setShowCreateDialog(false);
      setShowKeyDialog(true);

      // Reset form
      setName('');
      setSelectedScopes([]);
      setExpiresIn('never');
      setIpWhitelist('');
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKey = async () => {
    if (!deletingKeyId) return;

    try {
      await deleteKey.mutateAsync(deletingKeyId);
      setDeletingKeyId(null);
      toast({ title: '密钥已删除' });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeKey = async () => {
    if (!revokingKeyId) return;

    try {
      await revokeKey.mutateAsync(revokingKeyId);
      setRevokingKeyId(null);
      toast({ title: '密钥已撤销' });
    } catch (error: any) {
      toast({
        title: '撤销失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateKey = async () => {
    if (!regeneratingKeyId) return;

    try {
      const response = await regenerateKey.mutateAsync(regeneratingKeyId);
      setRegeneratingKeyId(null);
      setNewKeyData(response.data as ApiKeyWithSecret);
      setShowKeyDialog(true);
      toast({ title: '密钥已重新生成' });
    } catch (error: any) {
      toast({
        title: '重新生成失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleCopyKey = () => {
    if (newKeyData?.key) {
      copy(newKeyData.key);
      toast({ title: '已复制到剪贴板' });
    }
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const keys = keysData?.keys || [];
  const scopes = scopesData?.scopes || [];

  // Group scopes by category
  const scopesByCategory = scopes.reduce<Record<string, typeof scopes>>(
    (acc, scope) => {
      const category = scope.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category]!.push(scope);
      return acc;
    },
    {}
  );

  const categoryLabels: Record<string, string> = {
    read: '读取权限',
    write: '写入权限',
    delete: '删除权限',
    admin: '管理权限',
  };

  if (keysLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">API 密钥</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            使用 API 密钥可以通过编程方式访问您的数据
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建密钥
        </Button>
      </div>

      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <Key className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            暂无 API 密钥
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            创建 API 密钥以开始使用 API
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建密钥
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <Key className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{key.name}</span>
                    <Badge className={statusColors[key.status]}>{statusLabels[key.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <code className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700">
                      {key.keyPrefix}...
                    </code>
                    <span>创建于 {new Date(key.createdAt).toLocaleDateString('zh-CN')}</span>
                    {key.lastUsedAt && (
                      <span>
                        最后使用 {new Date(key.lastUsedAt).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {key.scopes.slice(0, 3).map((scope) => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                    {key.scopes.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{key.scopes.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {key.status === 'active' && (
                    <>
                      <DropdownMenuItem onClick={() => setRegeneratingKeyId(key.id)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        重新生成
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRevokingKeyId(key.id)}>
                        <Shield className="mr-2 h-4 w-4" />
                        撤销
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setDeletingKeyId(key.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建 API 密钥</DialogTitle>
            <DialogDescription>
              创建新的 API 密钥以访问您的数据。请妥善保管密钥，创建后只会显示一次。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">密钥名称</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：生产环境密钥"
                className="mt-1"
              />
            </div>

            <div>
              <Label>权限范围</Label>
              <div className="mt-2 space-y-4">
                {Object.entries(scopesByCategory).map(([category, categoryScopes]) => (
                  <div key={category}>
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {categoryLabels[category] || category}
                    </p>
                    <div className="space-y-2">
                      {categoryScopes.map((scope) => (
                        <div key={scope.id} className="flex items-start gap-2">
                          <Checkbox
                            id={scope.id}
                            checked={selectedScopes.includes(scope.id)}
                            onCheckedChange={() => toggleScope(scope.id)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={scope.id}
                              className="text-sm font-medium text-gray-900 dark:text-white"
                            >
                              {scope.name}
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {scope.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="expires">过期时间</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">永不过期</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="90">90 天</SelectItem>
                  <SelectItem value="180">180 天</SelectItem>
                  <SelectItem value="365">1 年</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ip-whitelist">IP 白名单 (可选)</Label>
              <textarea
                id="ip-whitelist"
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                placeholder="每行一个 IP 地址&#10;例如：192.168.1.1&#10;10.0.0.0/24"
                className="mt-1 h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                留空表示允许所有 IP 访问
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateKey} disabled={createKey.isPending}>
              {createKey.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建密钥'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API 密钥已创建</DialogTitle>
            <DialogDescription>
              请立即复制并安全保存此密钥。关闭此对话框后将无法再次查看完整密钥。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                此密钥只会显示一次，请务必保存
              </p>
            </div>

            <div>
              <Label>您的 API 密钥</Label>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={newKeyData?.key || ''}
                    readOnly
                    className="pr-20 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyKey}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>我已保存密钥</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingKeyId}
        onOpenChange={(open) => !open && setDeletingKeyId(null)}
        title="删除密钥"
        description="确定要删除此密钥吗？此操作无法撤销。"
        confirmText="删除"
        onConfirm={handleDeleteKey}
        isLoading={deleteKey.isPending}
        variant="destructive"
      />

      {/* Revoke Key Confirm Dialog */}
      <ConfirmDialog
        open={!!revokingKeyId}
        onOpenChange={(open) => !open && setRevokingKeyId(null)}
        title="撤销密钥"
        description="确定要撤销此密钥吗？撤销后密钥将无法使用。"
        confirmText="撤销"
        onConfirm={handleRevokeKey}
        isLoading={revokeKey.isPending}
        variant="destructive"
      />

      {/* Regenerate Key Confirm Dialog */}
      <ConfirmDialog
        open={!!regeneratingKeyId}
        onOpenChange={(open) => !open && setRegeneratingKeyId(null)}
        title="重新生成密钥"
        description="确定要重新生成此密钥吗？原密钥将立即失效。"
        confirmText="重新生成"
        onConfirm={handleRegenerateKey}
        isLoading={regenerateKey.isPending}
        variant="destructive"
      />
    </div>
  );
}
