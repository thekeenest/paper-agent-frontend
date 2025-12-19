import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Analysis from '@/pages/Analysis'
import Results from '@/pages/Results'
import TaskDetail from '@/pages/TaskDetail'

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyze" element={<Analysis />} />
          <Route path="/results" element={<Results />} />
          <Route path="/task/:taskId" element={<TaskDetail />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  )
}

export default App
