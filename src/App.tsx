import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Practice from './pages/Practice'
import Exam from './pages/Exam'
import Wrong from './pages/Wrong'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/wrong" element={<Wrong />} />
      </Routes>
    </BrowserRouter>
  )
}
