import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  useSSOConfigs,
  useSAMLMetadata,
  useCreateSAMLConfig,
  useImportSAMLMetadata,
  useCreateOIDCConfig,
  useCreateLDAPConfig,
  useActivateSSOConfig,
  useDeactivateSSOConfig,
  useDeleteSSOConfig,
  useTestSSOConnection,
  SSO_STATUS_CONFIG,
  SSO_PROVIDER_CONFIG,
  type SSOConfig,
  type SSOProvider,
} from '@/hooks/useSSO';
import {
  Plus,
  Shield,
  Key,
  Server,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Download,
  Trash2,
  Power,
  PowerOff,
  TestTube,
  Upload,
  AlertTriangle,
} from 'lucide-react';

export default function SSOPage() {
  const { toast } = useToast();
  const { data: configs, isLoading } = useSSOConfigs();
  const { data: spMetadata } = useSAMLMetadata();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SSOProvider | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<SSOConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const createSAML = useCreateSAMLConfig();
  const importSAML = useImportSAMLMetadata();
  const createOIDC = useCreateOIDCConfig();
  const createLDAP = useCreateLDAPConfig();
  const activateConfig = useActivateSSOConfig();
  const deactivateConfig = useDeactivateSSOConfig();
  const deleteConfigMutation = useDeleteSSOConfig();
  const testConnection = useTestSSOConnection();

  // Form states
  const [samlForm, setSamlForm] = useState({
    displayName: '',
    entityId: '',
    ssoUrl: '',
    sloUrl: '',
    certificate: '',
    autoProvision: true,
    enforceSSO: false,
    allowedDomains: '',
  });

  const [samlMetadataForm, setSamlMetadataForm] = useState({
    displayName: '',
    metadataXml: '',
    autoProvision: true,
    enforceSSO: false,
    allowedDomains: '',
  });

  const [oidcForm, setOidcForm] = useState({
    displayName: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    autoProvision: true,
    enforceSSO: false,
  });

  const [ldapForm, setLdapForm] = useState({
    displayName: '',
    url: '',
    bindDn: '',
    bindPassword: '',
    searchBase: '',
    searchFilter: '(uid={{username}})',
    autoProvision: true,
  });

  const [useMetadataImport, setUseMetadataImport] = useState(false);

  const handleCreateSAML = async () => {
    try {
      if (useMetadataImport) {
        await importSAML.mutateAsync({
          displayName: samlMetadataForm.displayName || undefined,
          metadataXml: samlMetadataForm.metadataXml,
          autoProvision: samlMetadataForm.autoProvision,
          enforceSSO: samlMetadataForm.enforceSSO,
          allowedDomains: samlMetadataForm.allowedDomains
            ? samlMetadataForm.allowedDomains.split(',').map((d) => d.trim())
            : [],
        });
      } else {
        await createSAML.mutateAsync({
          displayName: samlForm.displayName,
          entityId: samlForm.entityId,
          ssoUrl: samlForm.ssoUrl,
          sloUrl: samlForm.sloUrl || undefined,
          certificate: samlForm.certificate,
          autoProvision: samlForm.autoProvision,
          enforceSSO: samlForm.enforceSSO,
          allowedDomains: samlForm.allowedDomains
            ? samlForm.allowedDomains.split(',').map((d) => d.trim())
            : [],
        });
      }
      toast({ title: 'SAML 配置已创建' });
      setIsAddDialogOpen(false);
      setSelectedProvider(null);
      resetForms();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleCreateOIDC = async () => {
    try {
      await createOIDC.mutateAsync({
        displayName: oidcForm.displayName,
        issuer: oidcForm.issuer,
        clientId: oidcForm.clientId,
        clientSecret: oidcForm.clientSecret,
        autoProvision: oidcForm.autoProvision,
        enforceSSO: oidcForm.enforceSSO,
      });
      toast({ title: 'OIDC 配置已创建' });
      setIsAddDialogOpen(false);
      setSelectedProvider(null);
      resetForms();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleCreateLDAP = async () => {
    try {
      await createLDAP.mutateAsync({
        displayName: ldapForm.displayName,
        url: ldapForm.url,
        bindDn: ldapForm.bindDn,
        bindPassword: ldapForm.bindPassword,
        searchBase: ldapForm.searchBase,
        searchFilter: ldapForm.searchFilter,
        autoProvision: ldapForm.autoProvision,
      });
      toast({ title: 'LDAP 配置已创建' });
      setIsAddDialogOpen(false);
      setSelectedProvider(null);
      resetForms();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const resetForms = () => {
    setSamlForm({
      displayName: '',
      entityId: '',
      ssoUrl: '',
      sloUrl: '',
      certificate: '',
      autoProvision: true,
      enforceSSO: false,
      allowedDomains: '',
    });
    setSamlMetadataForm({
      displayName: '',
      metadataXml: '',
      autoProvision: true,
      enforceSSO: false,
      allowedDomains: '',
    });
    setOidcForm({
      displayName: '',
      issuer: '',
      clientId: '',
      clientSecret: '',
      autoProvision: true,
      enforceSSO: false,
    });
    setLdapForm({
      displayName: '',
      url: '',
      bindDn: '',
      bindPassword: '',
      searchBase: '',
      searchFilter: '(uid={{username}})',
      autoProvision: true,
    });
    setUseMetadataImport(false);
  };

  const handleToggleActive = async (config: SSOConfig) => {
    try {
      if (config.status === 'active') {
        await deactivateConfig.mutateAsync(config.id);
        toast({ title: 'SSO 已停用' });
      } else {
        await activateConfig.mutateAsync(config.id);
        toast({ title: 'SSO 已激活' });
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfig) return;
    try {
      await deleteConfigMutation.mutateAsync(deleteConfig.id);
      toast({ title: 'SSO 配置已删除' });
      setDeleteConfig(null);
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testConnection.mutateAsync(id);
      if (result.success) {
        toast({
          title: '连接测试成功',
          description: result.message,
        });
      } else {
        toast({
          title: '连接测试失败',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: '测试失败', variant: 'destructive' });
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '已复制到剪贴板' });
  };

  const downloadMetadata = () => {
    if (!spMetadata) return;
    const blob = new Blob([spMetadata.metadataXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sp-metadata.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProviderIcon = (provider: SSOProvider) => {
    switch (provider) {
      case 'saml':
        return <Shield className="h-5 w-5" />;
      case 'oidc':
        return <Key className="h-5 w-5" />;
      case 'ldap':
        return <Server className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">企业 SSO</h1>
            <p className="text-gray-500">配置单点登录，支持 SAML、OIDC 和 LDAP</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                添加 SSO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedProvider
                    ? `配置 ${SSO_PROVIDER_CONFIG[selectedProvider].label}`
                    : '选择 SSO 类型'}
                </DialogTitle>
              </DialogHeader>

              {!selectedProvider ? (
                <div className="grid gap-4">
                  {(Object.keys(SSO_PROVIDER_CONFIG) as SSOProvider[]).map((provider) => (
                    <Card
                      key={provider}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <CardHeader className="flex flex-row items-center gap-4 py-4">
                        <div className="rounded-lg bg-primary/10 p-2">
                          {getProviderIcon(provider)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {SSO_PROVIDER_CONFIG[provider].label}
                          </CardTitle>
                          <CardDescription>
                            {SSO_PROVIDER_CONFIG[provider].description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : selectedProvider === 'saml' ? (
                <div className="space-y-4">
                  <Tabs
                    value={useMetadataImport ? 'import' : 'manual'}
                    onValueChange={(v) => setUseMetadataImport(v === 'import')}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">手动配置</TabsTrigger>
                      <TabsTrigger value="import">导入 Metadata</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4">
                      <div className="space-y-2">
                        <Label>显示名称 *</Label>
                        <Input
                          value={samlForm.displayName}
                          onChange={(e) =>
                            setSamlForm({ ...samlForm, displayName: e.target.value })
                          }
                          placeholder="例如: Okta SSO"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IdP Entity ID *</Label>
                        <Input
                          value={samlForm.entityId}
                          onChange={(e) =>
                            setSamlForm({ ...samlForm, entityId: e.target.value })
                          }
                          placeholder="https://idp.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SSO URL *</Label>
                        <Input
                          value={samlForm.ssoUrl}
                          onChange={(e) =>
                            setSamlForm({ ...samlForm, ssoUrl: e.target.value })
                          }
                          placeholder="https://idp.example.com/sso/saml"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SLO URL (可选)</Label>
                        <Input
                          value={samlForm.sloUrl}
                          onChange={(e) =>
                            setSamlForm({ ...samlForm, sloUrl: e.target.value })
                          }
                          placeholder="https://idp.example.com/slo/saml"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>X.509 证书 *</Label>
                        <Textarea
                          value={samlForm.certificate}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setSamlForm({ ...samlForm, certificate: e.target.value })
                          }
                          rows={4}
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>允许的邮箱域名 (逗号分隔)</Label>
                        <Input
                          value={samlForm.allowedDomains}
                          onChange={(e) =>
                            setSamlForm({ ...samlForm, allowedDomains: e.target.value })
                          }
                          placeholder="example.com, corp.example.com"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>自动创建用户</Label>
                          <p className="text-xs text-gray-500">首次登录时自动创建账户</p>
                        </div>
                        <Switch
                          checked={samlForm.autoProvision}
                          onCheckedChange={(v) =>
                            setSamlForm({ ...samlForm, autoProvision: v })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>强制 SSO</Label>
                          <p className="text-xs text-gray-500">禁用密码登录</p>
                        </div>
                        <Switch
                          checked={samlForm.enforceSSO}
                          onCheckedChange={(v) =>
                            setSamlForm({ ...samlForm, enforceSSO: v })
                          }
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4">
                      <div className="space-y-2">
                        <Label>显示名称 (可选)</Label>
                        <Input
                          value={samlMetadataForm.displayName}
                          onChange={(e) =>
                            setSamlMetadataForm({
                              ...samlMetadataForm,
                              displayName: e.target.value,
                            })
                          }
                          placeholder="例如: Okta SSO"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IdP Metadata XML *</Label>
                        <Textarea
                          value={samlMetadataForm.metadataXml}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setSamlMetadataForm({
                              ...samlMetadataForm,
                              metadataXml: e.target.value,
                            })
                          }
                          rows={8}
                          placeholder="粘贴 IdP 的 metadata XML..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>允许的邮箱域名 (逗号分隔)</Label>
                        <Input
                          value={samlMetadataForm.allowedDomains}
                          onChange={(e) =>
                            setSamlMetadataForm({
                              ...samlMetadataForm,
                              allowedDomains: e.target.value,
                            })
                          }
                          placeholder="example.com, corp.example.com"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>自动创建用户</Label>
                          <p className="text-xs text-gray-500">首次登录时自动创建账户</p>
                        </div>
                        <Switch
                          checked={samlMetadataForm.autoProvision}
                          onCheckedChange={(v) =>
                            setSamlMetadataForm({ ...samlMetadataForm, autoProvision: v })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>强制 SSO</Label>
                          <p className="text-xs text-gray-500">禁用密码登录</p>
                        </div>
                        <Switch
                          checked={samlMetadataForm.enforceSSO}
                          onCheckedChange={(v) =>
                            setSamlMetadataForm({ ...samlMetadataForm, enforceSSO: v })
                          }
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProvider(null)}
                    >
                      返回
                    </Button>
                    <Button
                      onClick={handleCreateSAML}
                      disabled={createSAML.isPending || importSAML.isPending}
                      className="flex-1"
                    >
                      {(createSAML.isPending || importSAML.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      创建 SAML 配置
                    </Button>
                  </div>
                </div>
              ) : selectedProvider === 'oidc' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>显示名称 *</Label>
                    <Input
                      value={oidcForm.displayName}
                      onChange={(e) =>
                        setOidcForm({ ...oidcForm, displayName: e.target.value })
                      }
                      placeholder="例如: Google Workspace"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuer URL *</Label>
                    <Input
                      value={oidcForm.issuer}
                      onChange={(e) =>
                        setOidcForm({ ...oidcForm, issuer: e.target.value })
                      }
                      placeholder="https://accounts.google.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID *</Label>
                    <Input
                      value={oidcForm.clientId}
                      onChange={(e) =>
                        setOidcForm({ ...oidcForm, clientId: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret *</Label>
                    <Input
                      type="password"
                      value={oidcForm.clientSecret}
                      onChange={(e) =>
                        setOidcForm({ ...oidcForm, clientSecret: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>自动创建用户</Label>
                      <p className="text-xs text-gray-500">首次登录时自动创建账户</p>
                    </div>
                    <Switch
                      checked={oidcForm.autoProvision}
                      onCheckedChange={(v) =>
                        setOidcForm({ ...oidcForm, autoProvision: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>强制 SSO</Label>
                      <p className="text-xs text-gray-500">禁用密码登录</p>
                    </div>
                    <Switch
                      checked={oidcForm.enforceSSO}
                      onCheckedChange={(v) =>
                        setOidcForm({ ...oidcForm, enforceSSO: v })
                      }
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProvider(null)}
                    >
                      返回
                    </Button>
                    <Button
                      onClick={handleCreateOIDC}
                      disabled={createOIDC.isPending}
                      className="flex-1"
                    >
                      {createOIDC.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      创建 OIDC 配置
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>显示名称 *</Label>
                    <Input
                      value={ldapForm.displayName}
                      onChange={(e) =>
                        setLdapForm({ ...ldapForm, displayName: e.target.value })
                      }
                      placeholder="例如: Active Directory"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LDAP URL *</Label>
                    <Input
                      value={ldapForm.url}
                      onChange={(e) =>
                        setLdapForm({ ...ldapForm, url: e.target.value })
                      }
                      placeholder="ldaps://ldap.example.com:636"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bind DN *</Label>
                    <Input
                      value={ldapForm.bindDn}
                      onChange={(e) =>
                        setLdapForm({ ...ldapForm, bindDn: e.target.value })
                      }
                      placeholder="cn=admin,dc=example,dc=com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bind Password *</Label>
                    <Input
                      type="password"
                      value={ldapForm.bindPassword}
                      onChange={(e) =>
                        setLdapForm({ ...ldapForm, bindPassword: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Search Base *</Label>
                    <Input
                      value={ldapForm.searchBase}
                      onChange={(e) =>
                        setLdapForm({ ...ldapForm, searchBase: e.target.value })
                      }
                      placeholder="ou=users,dc=example,dc=com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Search Filter</Label>
                    <Input
                      value={ldapForm.searchFilter}
                      onChange={(e) =>
                        setLdapForm({ ...ldapForm, searchFilter: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      使用 {'{{username}}'} 作为用户名占位符
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>自动创建用户</Label>
                      <p className="text-xs text-gray-500">首次登录时自动创建账户</p>
                    </div>
                    <Switch
                      checked={ldapForm.autoProvision}
                      onCheckedChange={(v) =>
                        setLdapForm({ ...ldapForm, autoProvision: v })
                      }
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProvider(null)}
                    >
                      返回
                    </Button>
                    <Button
                      onClick={handleCreateLDAP}
                      disabled={createLDAP.isPending}
                      className="flex-1"
                    >
                      {createLDAP.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      创建 LDAP 配置
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* SP Metadata Card */}
        {spMetadata && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Provider 信息</CardTitle>
              <CardDescription>
                在您的身份提供商中配置以下信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-gray-500">Entity ID (Audience)</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-sm">
                      {spMetadata.entityId}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(spMetadata.entityId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">ACS URL (Reply URL)</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-sm">
                      {spMetadata.acsUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(spMetadata.acsUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={downloadMetadata}>
                <Download className="mr-2 h-4 w-4" />
                下载 SP Metadata XML
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SSO Configs List */}
        {!configs?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">尚未配置 SSO</h3>
              <p className="mt-2 text-gray-500">
                添加 SAML、OIDC 或 LDAP 配置以启用单点登录
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => {
              const statusConfig = SSO_STATUS_CONFIG[config.status];
              const providerConfig = SSO_PROVIDER_CONFIG[config.provider];

              return (
                <Card key={config.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                          {getProviderIcon(config.provider)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{config.displayName}</h3>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                            >
                              {config.status === 'active' ? (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <XCircle className="mr-1 h-3 w-3" />
                              )}
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {providerConfig.label}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                            {config.autoProvision && (
                              <span className="rounded bg-gray-100 px-2 py-0.5">
                                自动创建用户
                              </span>
                            )}
                            {config.enforceSSO && (
                              <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-600">
                                强制 SSO
                              </span>
                            )}
                            {config.allowedDomains?.length > 0 && (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-600">
                                限制域: {config.allowedDomains.join(', ')}
                              </span>
                            )}
                          </div>
                          {config.provider === 'saml' && config.samlEntityId && (
                            <p className="mt-2 text-xs text-gray-400">
                              Entity ID: {config.samlEntityId}
                            </p>
                          )}
                          {config.provider === 'oidc' && config.oidcIssuer && (
                            <p className="mt-2 text-xs text-gray-400">
                              Issuer: {config.oidcIssuer}
                            </p>
                          )}
                          {config.provider === 'ldap' && config.ldapUrl && (
                            <p className="mt-2 text-xs text-gray-400">
                              Server: {config.ldapUrl}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(config.id)}
                          disabled={testingId === config.id}
                        >
                          {testingId === config.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(config)}
                        >
                          {config.status === 'active' ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfig(config)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfig} onOpenChange={() => setDeleteConfig(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                确认删除
              </AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除 SSO 配置 "{deleteConfig?.displayName}" 吗？
                {deleteConfig?.status === 'active' && (
                  <span className="mt-2 block text-red-500">
                    警告: 此配置当前处于激活状态，删除后用户将无法通过 SSO 登录。
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteConfigMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
