import { useEffect, useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  RefreshCw,
  FileText,
  Users,
  Building2,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTaskStatus, getTaskResults, getTaskAnalytics, getDownloadUrl, evaluateTask, createWebSocket } from '@/lib/api'
import { formatDuration, formatNumber, formatPercentage, truncate } from '@/lib/utils'
import { useTaskStore } from '@/store'
import type { TaskProgress, WSMessage } from '@/types/api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const queryClient = useQueryClient()
  const { taskProgress, setTaskProgress, setWsConnected } = useTaskStore()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch task status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['taskStatus', taskId],
    queryFn: () => getTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      // Only poll every 5 seconds as backup - WebSocket handles real-time
      return query.state.data?.status === 'running' ? 5000 : false
    },
  })

  // Fetch results when completed
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['taskResults', taskId],
    queryFn: () => getTaskResults(taskId!),
    enabled: !!taskId && status?.status === 'completed',
  })

  // Fetch analytics when completed
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['taskAnalytics', taskId],
    queryFn: () => getTaskAnalytics(taskId!),
    enabled: !!taskId && status?.status === 'completed',
  })

  // Evaluation mutation
  const evaluationMutation = useMutation({
    mutationFn: () => evaluateTask(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskResults', taskId] })
    },
  })

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!taskId || status?.status !== 'running') {
      setWsConnected(false)
      return
    }

    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let isMounted = true

    const connect = () => {
      if (!isMounted) return
      
      ws = createWebSocket(taskId)
      
      ws.onopen = () => {
        console.log('[WS TaskDetail] Connected to task', taskId)
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        // Ignore ping/pong text messages
        if (event.data === 'ping' || event.data === 'pong') {
          if (event.data === 'ping' && ws) ws.send('pong')
          return
        }
        
        try {
          const message: WSMessage = JSON.parse(event.data)
          
          if (message.type === 'progress') {
            // Always update from progress messages - they are real-time
            setTaskProgress(message.data as TaskProgress)
          } else if (message.type === 'status') {
            // Initial status message - only use if we don't have progress or if it's more recent
            const statusData = message.data as any
            const currentProgress = useTaskStore.getState().taskProgress
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
            queryClient.invalidateQueries({ queryKey: ['taskStatus', taskId] })
            queryClient.invalidateQueries({ queryKey: ['taskResults', taskId] })
            queryClient.invalidateQueries({ queryKey: ['taskAnalytics', taskId] })
            queryClient.invalidateQueries({ queryKey: ['activeTask'] })
          }
        } catch (e) {
          // Ignore parse errors for non-JSON messages
        }
      }

      ws.onerror = () => {
        console.log('[WS TaskDetail] Error, will reconnect...')
      }

      ws.onclose = () => {
        console.log('[WS TaskDetail] Closed')
        setWsConnected(false)
        // Reconnect after 2 seconds if still mounted and task is running
        if (isMounted && status?.status === 'running') {
          reconnectTimeout = setTimeout(() => {
            console.log('[WS TaskDetail] Reconnecting...')
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
  }, [taskId, status?.status, setTaskProgress, setWsConnected, queryClient])

  if (!taskId) return null

  const isLoading = statusLoading || (status?.status === 'completed' && resultsLoading)
  const isCompleted = status?.status === 'completed'
  const isFailed = status?.status === 'failed'
  const isRunning = status?.status === 'running'

  // Chart data
  const topOrgsData = analytics?.top_organizations.slice(0, 10).map(org => ({
    name: truncate(org.name, 20),
    value: org.author_count,
    fullName: org.name,
  })) || []

  const countryData = analytics?.country_distribution.slice(0, 8).map(country => ({
    name: country.country,
    value: country.author_count,
  })) || []

  const orgTypeData = analytics?.org_type_distribution.map(type => ({
    name: type.org_type.charAt(0).toUpperCase() + type.org_type.slice(1).replace('_', ' '),
    value: type.count,
  })) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <Link 
            to="/results"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Task Details</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <code className="text-xs sm:text-sm bg-muted px-2 py-1 rounded truncate max-w-[200px] sm:max-w-none">{taskId}</code>
            <Badge variant={
              isCompleted ? 'success' :
              isFailed ? 'destructive' :
              isRunning ? 'default' : 'secondary'
            }>
              {status?.status || 'Loading...'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && results?.output_files && Object.keys(results.output_files).length > 0 && (
            <a href={getDownloadUrl(taskId, Object.keys(results.output_files)[0])} download>
              <Button variant="outline" className="gap-2" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span> CSV
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Progress Section (when running) */}
      {isRunning && status && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Processing...
              </CardTitle>
              <CardDescription>
                {status.current_paper_title || `Stage: ${status.stage}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>
                  {status.processed_papers} / {status.total_papers || status.max_papers} papers
                </span>
                <span>{status.progress.toFixed(0)}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Elapsed: {formatDuration(status.elapsed_seconds)}</span>
                {status.estimated_remaining && (
                  <span>Remaining: ~{formatDuration(status.estimated_remaining)}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error Section (when failed) */}
      {isFailed && status?.errors.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Task Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-48">
              {status.errors[status.errors.length - 1]?.error}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Main Content (when completed) */}
      {isCompleted && analytics && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
            <TabsTrigger value="organizations" className="text-xs sm:text-sm py-2">Organizations</TabsTrigger>
            <TabsTrigger value="geography" className="text-xs sm:text-sm py-2">Geography</TabsTrigger>
            <TabsTrigger value="papers" className="text-xs sm:text-sm py-2">Papers</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Papers</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatNumber(analytics.total_papers)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Authors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatNumber(analytics.total_authors)}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.unique_authors} unique
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-medium">Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatNumber(analytics.unique_organizations)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-medium">Countries</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatNumber(analytics.unique_countries)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Top Organizations */}
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <BarChart3 className="h-4 sm:h-5 w-4 sm:w-5" />
                    Top Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topOrgsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Organization Types */}
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <PieChartIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                    Organization Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={orgTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {orgTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Processing Info */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Processing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Query</p>
                    <p className="font-mono text-xs sm:text-sm truncate">{status?.query}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Data Source</p>
                    <p className="capitalize text-sm">{analytics.data_source}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Processing Time</p>
                    <p className="text-sm">{formatDuration(analytics.processing_time_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Avg Authors/Paper</p>
                    <p className="text-sm">{analytics.avg_authors_per_paper.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Avg Confidence</p>
                    <p className="text-sm">{formatPercentage(analytics.avg_confidence * 100)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Top 20 Organizations</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Organizations by number of authors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="hidden sm:block">
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={analytics.top_organizations.slice(0, 20)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="author_count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 sm:mt-6 overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Organization</th>
                        <th className="text-left py-2 px-2">Country</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-right py-2 px-2">Authors</th>
                        <th className="text-right py-2 px-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.top_organizations.map((org, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 px-2 max-w-[150px] truncate">{org.name}</td>
                          <td className="py-2 px-2">{org.country || '-'}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-xs">{org.org_type}</Badge>
                          </td>
                          <td className="text-right py-2 px-2">{org.author_count}</td>
                          <td className="text-right py-2 px-2">{formatPercentage(org.percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geography Tab */}
          <TabsContent value="geography">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base">Country Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={countryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {countryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base">All Countries</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] sm:max-h-[500px] overflow-auto -mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[350px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Country</th>
                        <th className="text-right py-2 px-2">Authors</th>
                        <th className="text-right py-2 px-2">Orgs</th>
                        <th className="text-right py-2 px-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.country_distribution.map((country, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 px-2">{country.country}</td>
                          <td className="text-right py-2 px-2">{country.author_count}</td>
                          <td className="text-right py-2 px-2">{country.org_count}</td>
                          <td className="text-right py-2 px-2">{formatPercentage(country.percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Papers Tab */}
          <TabsContent value="papers">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Processed Papers</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{results?.papers.length || 0} papers</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] sm:max-h-[600px] overflow-auto">
                <div className="space-y-3 sm:space-y-4">
                  {results?.papers.map((paper, i) => (
                    <div key={i} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-sm sm:text-base line-clamp-2">{paper.title}</h3>
                        <Badge variant="outline" className="text-xs flex-shrink-0 self-start">{paper.paper_id}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {paper.categories.slice(0, 3).map((cat, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {paper.categories.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{paper.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <p className="mb-2">{paper.authors.length} authors</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {paper.authors.slice(0, 4).map((author, j) => (
                            <span key={j} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                              {author.name}
                              {author.normalized_affiliation && (
                                <span className="text-muted-foreground hidden sm:inline">
                                  ({truncate(author.normalized_affiliation, 15)})
                                </span>
                              )}
                            </span>
                          ))}
                          {paper.authors.length > 4 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{paper.authors.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
