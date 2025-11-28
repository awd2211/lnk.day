import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Trash2,
  Eye,
  Users,
  Link2,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { proxyService } from '@/lib/api';

export default function TeamsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['teams', { page }],
    queryFn: () => proxyService.getTeams({ page, limit: 20 }).then((res) => res.data),
  });

  const { data: teamDetail } = useQuery({
    queryKey: ['teams', selectedTeam],
    queryFn: () => proxyService.getTeam(selectedTeam!).then((res) => res.data),
    enabled: !!selectedTeam,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getPlanBadge = (plan: string) => {
    const plans: Record<string, { label: string; color: string }> = {
      free: { label: '免费版', color: 'bg-gray-100 text-gray-700' },
      starter: { label: '入门版', color: 'bg-blue-100 text-blue-700' },
      pro: { label: '专业版', color: 'bg-purple-100 text-purple-700' },
      enterprise: { label: '企业版', color: 'bg-orange-100 text-orange-700' },
    };
    const config = plans[plan] || plans.free;
    return (
      <span className={`rounded-full px-2 py-1 text-xs ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredTeams = data?.items?.filter((team: any) =>
    search ? team.name?.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="搜索团队..."
            className="w-80 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">
          共 {data?.total || 0} 个团队
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teams List */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">团队</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">套餐</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">成员</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">链接</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        加载中...
                      </td>
                    </tr>
                  ) : filteredTeams?.length ? (
                    filteredTeams.map((team: any) => (
                      <tr
                        key={team.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          selectedTeam === team.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedTeam(team.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{team.name}</p>
                              <p className="text-xs text-gray-500">@{team.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getPlanBadge(team.plan || 'free')}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-gray-400" />
                            {team.memberCount || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Link2 className="h-4 w-4 text-gray-400" />
                            {team.linkCount || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(team.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTeam(team.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {search ? '没有找到匹配的团队' : '暂无团队数据'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total > 20 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <p className="text-sm text-gray-500">
                  第 {page} 页，共 {Math.ceil(data.total / 20)} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(data.total / 20)}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Detail Panel */}
        <div className="lg:col-span-1">
          {selectedTeam && teamDetail ? (
            <div className="space-y-4 rounded-lg bg-white p-6 shadow">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{teamDetail.name}</h3>
                  <p className="text-sm text-gray-500">@{teamDetail.slug}</p>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">套餐</span>
                  {getPlanBadge(teamDetail.plan || 'free')}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">成员数</span>
                  <span className="font-medium">{teamDetail.memberCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">链接数</span>
                  <span className="font-medium">{teamDetail.linkCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">二维码数</span>
                  <span className="font-medium">{teamDetail.qrCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">总点击</span>
                  <span className="font-medium">{teamDetail.totalClicks?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">创建时间</span>
                  <span className="font-medium">{formatDate(teamDetail.createdAt)}</span>
                </div>
              </div>

              {/* Members Preview */}
              {teamDetail.members?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium">团队成员</h4>
                  <div className="space-y-2">
                    {teamDetail.members.slice(0, 5).map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs">
                            {member.user?.name?.charAt(0) || 'U'}
                          </div>
                          <span>{member.user?.name || member.user?.email}</span>
                        </div>
                        <span className="text-xs text-gray-500">{member.role}</span>
                      </div>
                    ))}
                    {teamDetail.members.length > 5 && (
                      <p className="text-xs text-gray-500">
                        还有 {teamDetail.members.length - 5} 位成员...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-white shadow">
              <div className="text-center text-gray-500">
                <Building2 className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm">选择一个团队查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
