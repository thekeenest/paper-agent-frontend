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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results</h1>
          <p className="text-muted-foreground">
            View and manage your analysis tasks
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
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
            <Button>New Analysis</Button>
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
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          task.status === 'completed' ? 'bg-green-500/10' :
                          task.status === 'failed' ? 'bg-red-500/10' :
                          task.status === 'running' ? 'bg-blue-500/10' :
                          'bg-muted'
                        }`}>
                          <StatusIcon className={`h-5 w-5 ${
                            task.status === 'completed' ? 'text-green-500' :
                            task.status === 'failed' ? 'text-red-500' :
                            task.status === 'running' ? 'text-blue-500 animate-pulse' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold font-mono">{task.query}</h3>
                            <Badge variant={statusColors[task.status]}>
                              {task.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {task.processed_papers}/{task.max_papers} papers
                            </span>
                            <span>•</span>
                            <span>{task.data_source}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(task.elapsed_seconds)}
                            </span>
                          </div>
                          
                          {task.status === 'running' && (
                            <div className="mt-3 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {task.current_paper_title || task.stage}
                                </span>
                                <span>{task.progress.toFixed(0)}%</span>
                              </div>
                              <Progress value={task.progress} className="h-1" />
                            </div>
                          )}
                          
                          {task.errors.length > 0 && (
                            <p className="text-xs text-red-500 mt-2">
                              {task.errors[task.errors.length - 1]?.error}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
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
