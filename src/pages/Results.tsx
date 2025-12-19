import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Trash2,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTasks, deleteTask } from '@/lib/api'
import { formatDuration } from '@/lib/utils'
import { useState } from 'react'
import type { TaskStatus } from '@/types/api'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
}

export default function Results() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => getTasks(statusFilter === 'all' ? undefined : statusFilter),
    refetchInterval: 5000,
  })

  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId)
      refetch()
    }
  }

  const statusColors = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'warning',
  } as const

  const statusIcons = {
    pending: Clock,
    running: Clock,
    completed: CheckCircle2,
    failed: XCircle,
    cancelled: XCircle,
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Results</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View and manage your analysis tasks
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 sm:w-40">
              <Filter className="h-4 w-4 mr-2 hidden sm:block" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/analyze">
            <Button className="whitespace-nowrap">New Analysis</Button>
          </Link>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== 'all' 
                ? `No ${statusFilter} tasks available` 
                : 'Start your first analysis to see results here'}
            </p>
            <Link to="/analyze">
              <Button>Start Analysis</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className="grid gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {tasks.map(task => {
            const StatusIcon = statusIcons[task.status]
            
            return (
              <motion.div key={task.task_id} variants={item}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500/10' :
                          task.status === 'failed' ? 'bg-red-500/10' :
                          task.status === 'running' ? 'bg-blue-500/10' :
                          'bg-muted'
                        }`}>
                          <StatusIcon className={`h-4 sm:h-5 w-4 sm:w-5 ${
                            task.status === 'completed' ? 'text-green-500' :
                            task.status === 'failed' ? 'text-red-500' :
                            task.status === 'running' ? 'text-blue-500 animate-pulse' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold font-mono text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{task.query}</h3>
                            <Badge variant={statusColors[task.status]} className="text-xs flex-shrink-0">
                              {task.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {task.processed_papers}/{task.max_papers}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span>{task.data_source}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(task.elapsed_seconds)}
                            </span>
                          </div>
                          
                          {task.status === 'running' && (
                            <div className="mt-3 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                                  {task.current_paper_title || task.stage}
                                </span>
                                <span className="flex-shrink-0 ml-2">{task.progress.toFixed(0)}%</span>
                              </div>
                              <Progress value={task.progress} className="h-1" />
                            </div>
                          )}
                          
                          {task.errors.length > 0 && (
                            <p className="text-xs text-red-500 mt-2 line-clamp-1">
                              {task.errors[task.errors.length - 1]?.error}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(task.task_id)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link to={`/task/${task.task_id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            View
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
