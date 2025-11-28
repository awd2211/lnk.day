import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type SSOProvider = 'saml' | 'oidc' | 'ldap';
export type SSOStatus = 'pending' | 'active' | 'inactive';

export interface AttributeMapping {
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string;
}

export interface SSOConfig {
  id: string;
  teamId: string;
  provider: SSOProvider;
  status: SSOStatus;
  displayName: string;

  // SAML specific
  samlEntityId?: string;
  samlSsoUrl?: string;
  samlSloUrl?: string;
  samlCertificate?: string;
  samlNameIdFormat?: string;

  // OIDC specific
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcAuthorizationUrl?: string;
  oidcTokenUrl?: string;
  oidcUserInfoUrl?: string;
  oidcScopes?: string[];

  // LDAP specific
  ldapUrl?: string;
  ldapBindDn?: string;
  ldapSearchBase?: string;
  ldapSearchFilter?: string;
  ldapUsernameAttribute?: string;
  ldapEmailAttribute?: string;

  // Common settings
  autoProvision: boolean;
  enforceSSO: boolean;
  allowedDomains: string[];
  attributeMapping: AttributeMapping;

  createdAt: string;
  updatedAt: string;
}

export interface SAMLMetadata {
  entityId: string;
  acsUrl: string;
  sloUrl: string;
  metadataXml: string;
}

export interface CreateSAMLConfigData {
  displayName: string;
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  nameIdFormat?: string;
  attributeMapping?: AttributeMapping;
  autoProvision?: boolean;
  enforceSSO?: boolean;
  allowedDomains?: string[];
}

export interface ImportSAMLMetadataData {
  displayName?: string;
  metadataXml: string;
  attributeMapping?: AttributeMapping;
  autoProvision?: boolean;
  enforceSSO?: boolean;
  allowedDomains?: string[];
}

export interface CreateOIDCConfigData {
  displayName: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];
  attributeMapping?: AttributeMapping;
  autoProvision?: boolean;
  enforceSSO?: boolean;
}

export interface CreateLDAPConfigData {
  displayName: string;
  url: string;
  bindDn: string;
  bindPassword: string;
  searchBase: string;
  searchFilter?: string;
  usernameAttribute?: string;
  emailAttribute?: string;
  attributeMapping?: AttributeMapping;
  autoProvision?: boolean;
}

export interface UpdateSSOConfigData {
  displayName?: string;
  autoProvision?: boolean;
  enforceSSO?: boolean;
  allowedDomains?: string[];
  attributeMapping?: AttributeMapping;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

// Query: Get all SSO configs
export function useSSOConfigs() {
  return useQuery({
    queryKey: ['sso', 'configs'],
    queryFn: async () => {
      const { data } = await api.get('/sso/configs');
      return data as SSOConfig[];
    },
  });
}

// Query: Get single SSO config
export function useSSOConfig(id: string | null) {
  return useQuery({
    queryKey: ['sso', 'configs', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/sso/configs/${id}`);
      return data as SSOConfig;
    },
    enabled: !!id,
  });
}

// Query: Get SAML SP Metadata
export function useSAMLMetadata() {
  return useQuery({
    queryKey: ['sso', 'saml', 'metadata'],
    queryFn: async () => {
      const { data } = await api.get('/sso/saml/metadata');
      return data as SAMLMetadata;
    },
  });
}

// Mutation: Create SAML config
export function useCreateSAMLConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSAMLConfigData) => {
      const response = await api.post('/sso/saml/config', data);
      return response.data as SSOConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Import SAML config from metadata
export function useImportSAMLMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportSAMLMetadataData) => {
      const response = await api.post('/sso/saml/config/import-metadata', data);
      return response.data as SSOConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Create OIDC config
export function useCreateOIDCConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOIDCConfigData) => {
      const response = await api.post('/sso/oidc/config', data);
      return response.data as SSOConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Create LDAP config
export function useCreateLDAPConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLDAPConfigData) => {
      const response = await api.post('/sso/ldap/config', data);
      return response.data as SSOConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Update SSO config
export function useUpdateSSOConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSSOConfigData }) => {
      const response = await api.put(`/sso/configs/${id}`, data);
      return response.data as SSOConfig;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs', id] });
    },
  });
}

// Mutation: Activate SSO config
export function useActivateSSOConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/sso/configs/${id}/activate`);
      return response.data as SSOConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Deactivate SSO config
export function useDeactivateSSOConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/sso/configs/${id}/deactivate`);
      return response.data as SSOConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Delete SSO config
export function useDeleteSSOConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sso/configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'configs'] });
    },
  });
}

// Mutation: Test SSO connection
export function useTestSSOConnection() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/sso/configs/${id}/test`);
      return response.data as TestConnectionResult;
    },
  });
}

// Status config
export const SSO_STATUS_CONFIG: Record<
  SSOStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: '待激活', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  active: { label: '已激活', color: 'text-green-600', bgColor: 'bg-green-100' },
  inactive: { label: '已停用', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export const SSO_PROVIDER_CONFIG: Record<
  SSOProvider,
  { label: string; description: string }
> = {
  saml: { label: 'SAML 2.0', description: '支持 Okta, Azure AD, OneLogin 等' },
  oidc: { label: 'OpenID Connect', description: '支持 Google, Auth0, Keycloak 等' },
  ldap: { label: 'LDAP / Active Directory', description: '企业目录服务集成' },
};
