import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { proxyService } from '@/lib/api';

type LinkStatus = 'active' | 'disabled' | 'expired';

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  status: LinkStatus;
  createdAt: string;
  teamId: string;
  teamName?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface LinksResponse {
  links: Link[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<LinkStatus, string> = {
  active: 'bg-green-100 text-green-700',
  disabled: 'bg-gray-100 text-gray-700',
  expired: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<LinkStatus, string> = {
  active: '正常',
  disabled: '已禁用',
  expired: '已过期',
};

export default function LinksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [teamId, setTeamId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 20;

  // Fetch teams for filter
  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => proxyService.getTeams({ limit: 100 }),
  });

  // Fetch links
  const { data: linksData, isLoading } = useQuery({
    queryKey: ['admin-links', teamId, status, search, page],
    queryFn: () =>
      proxyService.getLinks(teamId || '', {
        page,
        limit,
        status: status === 'all' ? undefined : status,
      }),
    enabled: !!teamId,
  });

  // Delete link mutation
  const deleteLink = useMutation({
    mutationFn: proxyService.deleteLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-links'] });
    },
  });

  const links = (linksData?.data as LinksResponse)?.links || [];
  const total = (linksData?.data as LinksResponse)?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const teams = teamsData?.data || [];

  const handleCopy = (shortCode: string, id: string) => {
    navigator.clipboard.writeText(`https://lnk.day/${shortCode}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除此链接吗？此操作不可恢复。')) {
      deleteLink.mutate(id);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('导出功能开发中');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">链接管理</h1>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          导出数据
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索链接..."
            className="pl-10"
          />
        </div>

        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm"
        >
          <option value="">选择团队</option>
          {teams.map((team: { id: string; name: string }) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm"
        >
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">已禁用</option>
          <option value="expired">已过期</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  短链接
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  原始URL
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  创建者
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  点击数
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!teamId ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    请先选择一个团队查看链接
                  </td>
                </tr>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-48 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="mx-auto h-4 w-12 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="mx-auto h-6 w-16 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="ml-auto h-8 w-20 rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无链接数据
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-blue-600">
                          /{link.shortCode}
                        </span>
                        <button
                          onClick={() => handleCopy(link.shortCode, link.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {link.title && (
                        <p className="mt-1 text-xs text-gray-500">{link.title}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={link.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
                      >
                        <span className="max-w-xs truncate">{link.originalUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {link.createdBy?.name || link.createdBy?.email || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium">{link.clicks.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_COLORS[link.status]
                        }`}
                      >
                        {STATUS_LABELS[link.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(link.createdAt), 'yyyy/MM/dd', {
                        locale: zhCN,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-gray-400 hover:text-blue-600"
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
