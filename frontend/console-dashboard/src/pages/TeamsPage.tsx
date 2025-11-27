import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Input placeholder="搜索团队..." className="max-w-sm" />
        <Button>创建团队</Button>
      </div>

      <div className="rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">团队名称</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Slug</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">套餐</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">成员数</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                暂无团队数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
