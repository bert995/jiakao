import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Placeholder({ title }: { title: string }) {
  return <div className="p-8 text-2xl font-bold">{title}</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder title="首页" />} />
        <Route path="/practice" element={<Placeholder title="练习" />} />
        <Route path="/exam" element={<Placeholder title="模拟考试" />} />
        <Route path="/wrong" element={<Placeholder title="错题本" />} />
      </Routes>
    </BrowserRouter>
  )
}
