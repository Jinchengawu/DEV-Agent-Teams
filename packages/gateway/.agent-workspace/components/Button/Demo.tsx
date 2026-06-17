import { Button } from './components/Button';

export default function Demo() {
  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">Button 组件演示</h1>

      {/* ───────── 基本用法 ───────── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">基本变体</h2>
        <div className="flex items-center gap-4">
          <Button variant="primary">Primary 按钮</Button>
          <Button variant="secondary">Secondary 按钮</Button>
        </div>
      </section>

      {/* ───────── 尺寸 ───────── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">不同尺寸</h2>
        <div className="flex items-center gap-4">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </div>
      </section>

      {/* ───────── 禁用 & 加载 ───────── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">禁用 & 加载状态</h2>
        <div className="flex items-center gap-4">
          <Button variant="primary" disabled>
            禁用
          </Button>
          <Button variant="primary" loading>
            加载中...
          </Button>
          <Button variant="secondary" loading>
            加载中...
          </Button>
        </div>
      </section>

      {/* ───────── 带图标 ───────── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">带图标</h2>
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          >
            确认提交
          </Button>
          <Button
            variant="secondary"
            rightIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            }
          >
            查看详情
          </Button>
        </div>
      </section>

      {/* ───────── 全宽 ───────── */}
      <section className="mb-10 max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">全宽按钮</h2>
        <div className="flex flex-col gap-3">
          <Button variant="primary" fullWidth>
            全宽 Primary
          </Button>
          <Button variant="secondary" fullWidth>
            全宽 Secondary
          </Button>
        </div>
      </section>

      {/* ───────── 自定义 className ───────── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">自定义样式覆盖</h2>
        <div className="flex items-center gap-4">
          <Button variant="primary" className="rounded-full px-8">
            圆角按钮
          </Button>
          <Button variant="secondary" className="border-2 border-dashed border-purple-400 text-purple-600">
            虚线边框
          </Button>
        </div>
      </section>
    </div>
  );
}
