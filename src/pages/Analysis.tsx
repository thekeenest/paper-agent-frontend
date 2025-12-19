import React, { useState, useEffect, useRef } from 'react'
// Main categories for 'Select All' (OpenAlex/ArXiv concepts)
const ALL_CATEGORIES = [
  'artificial intelligence',
  'machine learning',
  'computer vision',
  'natural language processing',
  'neural network',
  'robotics',
  'information retrieval',
  'software engineering',
  'database',
  'distributed computing',
  'cryptography',
  'programming languages',
]
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Zap, 
  Database,
  Calendar,
  HelpCircle,
  Loader2,
  Play,
  Eye,
  Clock,
  FileText,
  Users,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { startAnalysis, getDataSources, getQueryExamples, getActiveTask, createWebSocket } from '@/lib/api'
import type { AnalysisRequest, TaskProgress } from '@/types/api'

// Stage labels for progress display
const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'Waiting...', color: 'bg-gray-400' },
  searching: { label: 'Searching papers', color: 'bg-blue-500' },
  downloading: { label: 'Downloading PDFs', color: 'bg-cyan-500' },
  parsing: { label: 'Parsing documents', color: 'bg-teal-500' },
  extracting: { label: 'Extracting affiliations', color: 'bg-green-500' },
  normalizing: { label: 'Normalizing organizations', color: 'bg-yellow-500' },
  aggregating: { label: 'Building report', color: 'bg-orange-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' },
  failed: { label: 'Failed', color: 'bg-red-500' },
}

export default function Analysis() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null)
  const taskProgressRef = useRef<TaskProgress | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    taskProgressRef.current = taskProgress
  }, [taskProgress])

  const [formData, setFormData] = useState<AnalysisRequest>({
    query: searchParams.get('query') || 'cat:cs.AI',
    max_papers: 10,
    data_source: 'arxiv',
    date_from: undefined,
    date_to: undefined,
  })

  // Check for active task
  const { data: activeTask, isLoading: activeTaskLoading, refetch: refetchActiveTask } = useQuery({
    queryKey: ['activeTask'],
    queryFn: getActiveTask,
    refetchInterval: (query) => {
      // Poll every 5 seconds if there's an active task
      return query.state.data ? 5000 : false
    },
  })

  // Filter out OpenAlex from data sources
  const { data: allDataSources = [] } = useQuery({
    queryKey: ['dataSources'],
    queryFn: getDataSources,
  })
  const dataSources = allDataSources

  const { data: queryExamples = {} } = useQuery({
    queryKey: ['queryExamples'],
    queryFn: getQueryExamples,
  })

  // WebSocket for real-time progress updates when there's an active task
  useEffect(() => {
    if (!activeTask?.task_id || activeTask.status !== 'running') {
      setTaskProgress(null)
      return
    }

    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let isMounted = true

    const connect = () => {
      if (!isMounted) return
      
      ws = createWebSocket(activeTask.task_id)
      
      ws.onopen = () => {
        console.log('[WS] Connected to task', activeTask.task_id)
      }
      
      ws.onmessage = (event) => {
        if (event.data === 'ping' || event.data === 'pong') {
          if (event.data === 'ping' && ws) ws.send('pong')
          return
        }
        
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'progress') {
            // Always update from progress messages - they are real-time
            setTaskProgress(message.data as TaskProgress)
          } else if (message.type === 'status') {
            // Status message is initial state on connect - only use if we don't have progress yet
            // Don't overwrite existing progress as it may be more recent
            const statusData = message.data as any
            const currentProgress = taskProgressRef.current
            if (!currentProgress || statusData.processed_papers > currentProgress.processed) {
              setTaskProgress({
                task_id: statusData.task_id,
                stage: statusData.stage,
                progress: statusData.progress,
                message: `Processing ${statusData.current_paper_title || '...'}`,
                current_paper: statusData.current_paper_title,
                processed: statusData.processed_papers,
                total: statusData.total_papers,
                timestamp: statusData.updated_at || new Date().toISOString(),
              })
            }
          } else if (message.type === 'completed') {
            // Task completed, refetch active task
            setTaskProgress(null)
            refetchActiveTask()
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
          }
        } catch (e) {
          // Ignore parse errors for non-JSON messages
        }
      }

      ws.onerror = (error) => {
        console.log('[WS] Error, will reconnect...', error)
      }

      ws.onclose = () => {
        console.log('[WS] Closed')
        // Reconnect after 2 seconds if still mounted and task is running
        if (isMounted && activeTask.status === 'running') {
          reconnectTimeout = setTimeout(() => {
            console.log('[WS] Reconnecting...')
            connect()
          }, 2000)
        }
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (ws) {
        ws.onclose = null // Prevent reconnection on cleanup
        ws.close()
      }
    }
  }, [activeTask?.task_id, activeTask?.status, refetchActiveTask, queryClient])

  const mutation = useMutation({
    mutationFn: startAnalysis,
    onSuccess: (data) => {
      toast({
        title: 'Analysis Started',
        description: `Task ${data.task_id} has been created`,
      })
      // Refetch active task to show progress
      refetchActiveTask()
      navigate(`/task/${data.task_id}`)
    },
    onError: (error: Error & { message?: string }) => {
      // Check if it's a conflict error (task already running)
      if (error.message?.includes('already running')) {
        toast({
          variant: 'destructive',
          title: 'Task Already Running',
          description: 'Please wait for the current task to complete',
        })
        refetchActiveTask()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const currentExamples = queryExamples[formData.data_source] || []
  const currentProgress = taskProgress || (activeTask ? {
    stage: activeTask.stage,
    progress: activeTask.progress,
    processed: activeTask.processed_papers,
    total: activeTask.total_papers,
    message: `Processing ${activeTask.current_paper_title || '...'}`,
  } : null)
  
  const stageInfo = STAGE_LABELS[currentProgress?.stage || 'idle'] || STAGE_LABELS.idle

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Configure and start a new paper analysis task
        </p>
      </div>

      {/* Active Task Banner */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    Task Running
                  </CardTitle>
                  <Link to={`/task/${activeTask.task_id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Another analysis is currently in progress. You can view its progress below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{activeTask.query}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{currentProgress?.processed || 0}/{currentProgress?.total || activeTask.max_papers} papers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{Math.round(activeTask.elapsed_seconds || 0)}s elapsed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{activeTask.data_source}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${stageInfo.color} animate-pulse`} />
                      <span className="font-medium">{stageInfo.label}</span>
                    </div>
                    <span className="text-muted-foreground">{Math.round(currentProgress?.progress || 0)}%</span>
                  </div>
                  <Progress 
                    value={currentProgress?.progress || 0} 
                    className="h-3"
                  />
                  {currentProgress?.message && (
                    <p className="text-xs text-muted-foreground truncate">
                      {currentProgress.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className={activeTask ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Analysis Configuration
              </CardTitle>
              <CardDescription>
                {activeTask 
                  ? 'Form disabled while another task is running'
                  : 'Configure your paper search parameters'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Data Source */}
                <div className="space-y-2">
                  <Label htmlFor="data_source" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Source
                  </Label>
                  <Select
                    value={formData.data_source}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      data_source: value as AnalysisRequest['data_source'],
                    }))}
                    disabled={!!activeTask}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map(source => (
                        <SelectItem key={source.id} value={source.id}>
                          <div className="flex items-center gap-2">
                            {source.name}
                            {source.requires_key && (
                              <Badge variant="outline" className="text-xs">
                                API Key
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dataSources.find(s => s.id === formData.data_source)?.description && (
                    <p className="text-xs text-muted-foreground">
                      {dataSources.find(s => s.id === formData.data_source)?.description}
                    </p>
                  )}
                </div>

                {/* Search Query */}
                <div className="space-y-2">
                  <Label htmlFor="query" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Query
                  </Label>
                  <Input
                    id="query"
                    value={formData.query}
                    onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="e.g., cat:cs.AI"
                    className="font-mono"
                    disabled={!!activeTask}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="font-mono"
                      disabled={!!activeTask}
                      onClick={() => setFormData(prev => ({ ...prev, query: ALL_CATEGORIES.join(' ') }))}
                    >
                      Select All Categories
                    </Button>
                    {currentExamples.length > 0 && currentExamples.map((example) => (
                      <Badge
                        key={example.query}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => !activeTask && setFormData(prev => ({ ...prev, query: example.query }))}
                      >
                        {example.query}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Max Papers */}
                <div className="space-y-2">
                  <Label htmlFor="max_papers">
                    Maximum Papers
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                    <Input
                      id="max_papers"
                      type="number"
                      min={1}
                      max={500}
                      value={formData.max_papers}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_papers: parseInt(e.target.value) || 10 
                      }))}
                      className="w-full sm:w-24"
                      disabled={!!activeTask}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {[10, 25, 50, 100].map(n => (
                        <Button
                          key={n}
                          type="button"
                          variant={formData.max_papers === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => !activeTask && setFormData(prev => ({ ...prev, max_papers: n }))}
                          disabled={!!activeTask}
                          className="flex-1 sm:flex-none"
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date Range (optional) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range (Optional)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_from" className="text-xs text-muted-foreground">
                        From
                      </Label>
                      <Input
                        id="date_from"
                        type="date"
                        value={formData.date_from || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          date_from: e.target.value || undefined 
                        }))}
                        disabled={!!activeTask}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date_to" className="text-xs text-muted-foreground">
                        To
                      </Label>
                      <Input
                        id="date_to"
                        type="date"
                        value={formData.date_to || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          date_to: e.target.value || undefined 
                        }))}
                        disabled={!!activeTask}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full gap-2"
                  disabled={mutation.isPending || !!activeTask}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : activeTask ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Task Already Running
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Start Analysis
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Help - appears first on mobile */}
        <div className="space-y-4 sm:space-y-6 order-first lg:order-last">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Estimated Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl font-bold">
                  ~{Math.ceil(formData.max_papers * 3 / 60)} min
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on ~3 seconds per paper
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl font-bold text-green-500">
                  ~${(formData.max_papers * 0.0005).toFixed(3)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on gpt-4o-mini pricing
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="hidden sm:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <HelpCircle className="h-4 w-4" />
                Query Syntax
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {formData.data_source === 'arxiv' && (
                <div className="space-y-3">
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">cat:cs.AI</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Papers in category cs.AI
                    </p>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">ti:transformer</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Papers with "transformer" in title
                    </p>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">au:bengio</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Papers by author Bengio
                    </p>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">cat:cs.AI AND au:hinton</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Combine with AND/OR
                    </p>
                  </div>
                </div>
              )}
              {formData.data_source === 'semantic_scholar' && (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Use free-text search for Semantic Scholar
                  </p>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">machine learning</code>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">large language models</code>
                  </div>
                </div>
              )}
              {formData.data_source === 'openalex' && (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Use free-text search for OpenAlex
                  </p>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">artificial intelligence</code>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">neural networks</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}