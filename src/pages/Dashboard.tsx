import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Activity, 
  FileText, 
  Building2, 
  Globe, 
  ArrowRight,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getTasks, checkHealth } from '@/lib/api'
import { formatDuration, formatNumber } from '@/lib/utils'
import type { TaskStatusResponse } from '@/types/api'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend 
}: { 
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  trend?: number
}) {
  return (
    <motion.div variants={item}>
      <Card className="relative overflow-hidden h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-2xl font-bold truncate">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{description}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className={`h-3 w-3 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TaskItem({ task }: { task: TaskStatusResponse }) {
  const statusColors = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'warning',
  } as const

  return (
    <motion.div 
      variants={item}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-card hover:bg-accent/50 transition-colors gap-3"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
          task.status === 'running' ? 'bg-blue-500 animate-pulse' :
          task.status === 'completed' ? 'bg-green-500' :
          task.status === 'failed' ? 'bg-red-500' :
          'bg-gray-500'
        }`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{task.query}</p>
          <p className="text-xs text-muted-foreground">
            {task.data_source} • {task.processed_papers}/{task.max_papers} papers
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
        <div className="flex items-center gap-3">
          {task.status === 'running' && (
            <div className="w-20 sm:w-24">
              <Progress value={task.progress} className="h-1" />
            </div>
          )}
          <Badge variant={statusColors[task.status]} className="text-xs">
            {task.status}
          </Badge>
        </div>
        <Link to={`/task/${task.task_id}`}>
          <Button variant="ghost" size="sm">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
  })

  // Calculate stats from tasks
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const totalPapers = completedTasks.reduce((sum, t) => sum + t.processed_papers, 0)
  const runningTasks = tasks.filter(t => t.status === 'running')
  const avgTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + t.elapsed_seconds, 0) / completedTasks.length
    : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Monitor your paper analysis tasks
          </p>
        </div>
        <Link to="/analyze">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            <Zap className="h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <StatCard
          title="Total Papers"
          value={formatNumber(totalPapers)}
          icon={FileText}
          description="Processed across all tasks"
        />
        <StatCard
          title="Active Tasks"
          value={runningTasks.length}
          icon={Activity}
          description={`${tasks.length} total tasks`}
        />
        <StatCard
          title="Avg Processing Time"
          value={formatDuration(avgTime)}
          icon={Clock}
          description="Per analysis task"
        />
        <StatCard
          title="API Status"
          value={health?.status === 'healthy' ? 'Online' : 'Degraded'}
          icon={Globe}
          description={`v${health?.version || '1.0.0'}`}
        />
      </motion.div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest paper analysis tasks</CardDescription>
            </div>
            <Link to="/results">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your first paper analysis to see results here
              </p>
              <Link to="/analyze">
                <Button>Start Analysis</Button>
              </Link>
            </div>
          ) : (
            <motion.div 
              className="space-y-2"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {tasks.slice(0, 5).map(task => (
                <TaskItem key={task.task_id} task={task} />
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-5 w-5" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {[
                { name: 'ArXiv', status: true, description: 'Open-access preprints' },
                { name: 'Semantic Scholar', status: !!health?.services?.semantic_scholar, description: 'Academic search' },
                { name: 'OpenAlex', status: true, description: 'Open catalog' },
              ].map(source => (
                <div key={source.name} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">{source.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                  </div>
                  <Badge variant={source.status ? 'success' : 'secondary'} className="flex-shrink-0 text-xs">
                    {source.status ? 'Available' : 'Requires Key'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-5 w-5" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm text-muted-foreground">
                Popular search queries to get started:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'cat:cs.AI',
                  'cat:cs.LG',
                  'cat:cs.CV',
                  'cat:cs.CL',
                  'ti:transformer',
                ].map(query => (
                  <Link key={query} to={`/analyze?query=${encodeURIComponent(query)}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent text-xs">
                      {query}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
