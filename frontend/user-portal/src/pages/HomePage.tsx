import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">lnk.day</div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">登录</Button>
            </Link>
            <Link to="/login">
              <Button>开始使用</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          简化您的链接管理
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          创建短链接、追踪点击、分析数据，一站式链接管理平台
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link to="/login">
            <Button size="lg">免费试用</Button>
          </Link>
          <Button variant="outline" size="lg">
            了解更多
          </Button>
        </div>
      </main>
    </div>
  );
}
