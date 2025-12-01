import { useState } from 'react';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, RotateCcw, Shield, Clock, Globe } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  useApiKeys,
  useApiKeyScopes,
  useCreateApiKey,
  useDeleteApiKey,
  useRevokeApiKey,
  ApiKey,
  ApiKeyWithSecret,
} from '@/hooks/useApiKeys';

const STATUS_LABELS: Record<string, string> = {
  active: '活跃',
  revoked: '已撤销',
  expired: '已过期',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  revoked: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
};

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [deletingKey, setDeletingKey] = useState<ApiKey | null>(null);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);

  const { data: keysData, isLoading: keysLoading } = useApiKeys();
  const { data: scopesData } = useApiKeyScopes();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const revokeApiKey = useRevokeApiKey();

  const keys = keysData?.keys || [];
  const scopes = scopesData?.scopes || [];

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast({ title: '请输入密钥名称', variant: 'destructive' });
      return;
    }

    try {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const ipList = ipWhitelist
        .split('\n')
        .map((ip) => ip.trim())
        .filter(Boolean);

      const response = await createApiKey.mutateAsync({
        name: newKeyName,
        scopes: selectedScopes,
        expiresAt,
        ipWhitelist: ipList.length > 0 ? ipList : undefined,
      });

      setCreatedKey(response.data as ApiKeyWithSecret);
      setIsCreateOpen(false);
      resetForm();
      toast({ title: 'API 密钥已创建' });
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingKey) return;

    try {
      await deleteApiKey.mutateAsync(deletingKey.id);
      toast({ title: 'API 密钥已删除' });
      setDeletingKey(null);
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleRevoke = async () => {
    if (!revokingKey) return;

    try {
      await revokeApiKey.mutateAsync(revokingKey.id);
      toast({ title: 'API 密钥已撤销' });
      setRevokingKey(null);
    } catch {
      toast({ title: '撤销失败', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '已复制到剪贴板' });
  };

  const resetForm = () => {
    setNewKeyName('');
    setSelectedScopes([]);
    setIpWhitelist('');
    setExpiresInDays('');
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">API 密钥</h1>
          <p className="text-muted-foreground">管理您的 API 访问密钥</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建密钥
        </Button>
      </div>

      {/* Key List */}
      <div className="space-y-4">
        {keysLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">还没有 API 密钥</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                创建 API 密钥以通过 API 访问您的资源
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建第一个密钥
              </Button>
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{key.name}</h3>
                      <Badge className={STATUS_COLORS[key.status]}>
                        {STATUS_LABELS[key.status]}
                      </Badge>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground">
                      {key.keyPrefix}...
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {key.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevokingKey(key)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        撤销
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => setDeletingKey(key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {key.scopes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span>{key.scopes.length} 个权限</span>
                    </div>
                  )}
                  {key.lastUsedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        最后使用: {new Date(key.lastUsedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  )}
                  {key.expiresAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        过期时间: {new Date(key.expiresAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  )}
                  {key.ipWhitelist.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <span>{key.ipWhitelist.length} 个 IP 白名单</span>
                    </div>
                  )}
                </div>

                {key.scopes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {key.scopes.slice(0, 5).map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                    {key.scopes.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{key.scopes.length - 5}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建 API 密钥</DialogTitle>
            <DialogDescription>
              创建新的 API 密钥以访问 lnk.day API
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">密钥名称</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="例如: 生产环境密钥"
                className="mt-1"
              />
            </div>

            <div>
              <Label>权限范围</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {scopes.map((scope) => (
                  <div key={scope.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={scope.id}
                      checked={selectedScopes.includes(scope.id)}
                      onCheckedChange={() => toggleScope(scope.id)}
                    />
                    <label
                      htmlFor={scope.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {scope.name}
                    </label>
                  </div>
                ))}
              </div>
              {scopes.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  加载权限范围中...
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="expiresIn">过期时间（天）</Label>
              <Input
                id="expiresIn"
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="留空表示永不过期"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ipWhitelist">IP 白名单（每行一个）</Label>
              <textarea
                id="ipWhitelist"
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                placeholder="例如:&#10;192.168.1.1&#10;10.0.0.0/24"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createApiKey.isPending}>
              {createApiKey.isPending ? '创建中...' : '创建密钥'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API 密钥已创建</DialogTitle>
            <DialogDescription>
              请立即复制并安全保存此密钥，它将不会再次显示。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>密钥名称</Label>
              <p className="font-medium">{createdKey?.name}</p>
            </div>
            <div>
              <Label>API 密钥</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-muted p-2 text-sm break-all">
                  {showSecret ? createdKey?.key : '••••••••••••••••••••••••'}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(createdKey?.key || '')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingKey} onOpenChange={() => setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 API 密钥</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除密钥 "{deletingKey?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokingKey} onOpenChange={() => setRevokingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销 API 密钥</AlertDialogTitle>
            <AlertDialogDescription>
              确定要撤销密钥 "{revokingKey?.name}" 吗？撤销后该密钥将无法再使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>撤销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
