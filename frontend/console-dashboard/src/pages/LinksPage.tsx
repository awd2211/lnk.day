import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LinksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Input placeholder="搜索链接..." className="max-w-sm" />
        <Button>导出数据</Button>
      </div>

      <div className="rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">短链接</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">原始URL</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建者</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">点击数</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                暂无链接数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
