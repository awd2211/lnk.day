import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  Folder,
  FolderOpen,
  Search,
  Link2,
  Users,
  TrendingUp,
  Eye,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface FolderItem {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  teamName?: string;
  linkCount: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

interface FolderStats {
  totalFolders: number;
  totalLinksInFolders: number;
  teamsWithFolders: number;
  avgLinksPerFolder: number;
}

export default function FoldersPage() {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: stats } = useQuery<FolderStats>({
    queryKey: ['folders', 'stats'],
    queryFn: () => api.get('/proxy/folders/stats').then((r) => r.data),
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams', 'list'],
    queryFn: () => api.get('/proxy/teams?limit=100').then((r) => r.data),
  });

  const { data: foldersData, isLoading } = useQuery({
    queryKey: ['folders', page, search, teamFilter],
    queryFn: () =>
      api
        .get('/proxy/folders', {
          params: {
            page,
            limit: 15,
            search: search || undefined,
            teamId: teamFilter !== 'all' ? teamFilter : undefined,
          },
        })
        .then((r) => r.data),
  });

  const handleViewDetails = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setIsDetailDialogOpen(true);
  };

  const folders = foldersData?.data || [];
  const total = foldersData?.total || 0;
  const totalPages = Math.ceil(total / 15);
  const teams = teamsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总文件夹数</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFolders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已归档链接</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalLinksInFolders?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">使用文件夹的团队</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.teamsWithFolders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均每文件夹链接数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgLinksPerFolder?.toFixed(1) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Folders Table */}
      <Card>
        <CardHeader>
          <CardTitle>文件夹列表</CardTitle>
          <CardDescription>查看平台所有团队的文件夹</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件夹..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={teamFilter}
              onValueChange={(v) => {
                setTeamFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="选择团队" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部团队</SelectItem>
                {teams.map((team: { id: string; name: string }) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件夹名称</TableHead>
                  <TableHead>所属团队</TableHead>
                  <TableHead>链接数量</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : folders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无文件夹
                    </TableCell>
                  </TableRow>
                ) : (
                  folders.map((folder: FolderItem) => (
                    <TableRow key={folder.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FolderOpen
                            className="h-4 w-4"
                            style={{ color: folder.color || '#f59e0b' }}
                          />
                          {folder.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{folder.teamName || folder.teamId.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Link2 className="h-3 w-3 mr-1" />
                          {folder.linkCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {folder.description || '-'}
                      </TableCell>
                      <TableCell>{new Date(folder.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(folder.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(folder)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {total} 条记录
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen
                className="h-5 w-5"
                style={{ color: selectedFolder?.color || '#f59e0b' }}
              />
              {selectedFolder?.name}
            </DialogTitle>
            <DialogDescription>文件夹详细信息</DialogDescription>
          </DialogHeader>
          {selectedFolder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">文件夹 ID</p>
                  <p className="font-mono text-sm">{selectedFolder.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">所属团队</p>
                  <p className="text-sm">
                    {selectedFolder.teamName || selectedFolder.teamId}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">链接数量</p>
                  <p className="text-sm font-semibold">{selectedFolder.linkCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="text-sm">
                    {new Date(selectedFolder.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedFolder.description && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">描述</p>
                  <p className="text-sm">{selectedFolder.description}</p>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">快速操作</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to links page with folder filter
                      window.location.href = `/links?folderId=${selectedFolder.id}`;
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    查看链接
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to team page
                      window.location.href = `/teams?id=${selectedFolder.teamId}`;
                    }}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    查看团队
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
