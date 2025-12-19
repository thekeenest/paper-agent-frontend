import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Search, 
  Zap, 
  Database,
  Calendar,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { startAnalysis, getDataSources, getQueryExamples } from '@/lib/api'
import type { AnalysisRequest } from '@/types/api'

export default function Analysis() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [formData, setFormData] = useState<AnalysisRequest>({
    query: searchParams.get('query') || 'cat:cs.AI',
    max_papers: 10,
    data_source: 'arxiv',
    date_from: undefined,
    date_to: undefined,
  })

  const { data: dataSources = [] } = useQuery({
    queryKey: ['dataSources'],
    queryFn: getDataSources,
  })

  const { data: queryExamples = {} } = useQuery({
    queryKey: ['queryExamples'],
    queryFn: getQueryExamples,
  })

  const mutation = useMutation({
    mutationFn: startAnalysis,
    onSuccess: (data) => {
      toast({
        title: 'Analysis Started',
        description: `Task ${data.task_id} has been created`,
      })
      navigate(`/task/${data.task_id}`)
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const currentExamples = queryExamples[formData.data_source] || []

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground">
          Configure and start a new paper analysis task
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Analysis Configuration
              </CardTitle>
              <CardDescription>
                Configure your paper search parameters
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
                  />
                  {currentExamples.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentExamples.map((example) => (
                        <Badge
                          key={example.query}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => setFormData(prev => ({ ...prev, query: example.query }))}
                        >
                          {example.query}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Max Papers */}
                <div className="space-y-2">
                  <Label htmlFor="max_papers">
                    Maximum Papers
                  </Label>
                  <div className="flex gap-4 items-center">
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
                      className="w-24"
                    />
                    <div className="flex gap-2">
                      {[10, 25, 50, 100].map(n => (
                        <Button
                          key={n}
                          type="button"
                          variant={formData.max_papers === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, max_papers: n }))}
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
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full gap-2"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
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

        {/* Sidebar Help */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4" />
                Query Syntax
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {formData.data_source === 'arxiv' && (
                <div className="space-y-3">
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">cat:cs.AI</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Papers in category cs.AI
                    </p>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">ti:transformer</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Papers with "transformer" in title
                    </p>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">au:bengio</code>
                    <p className="text-muted-foreground text-xs mt-1">
                      Papers by author Bengio
                    </p>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">cat:cs.AI AND au:hinton</code>
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
                    <code className="bg-muted px-1 py-0.5 rounded">machine learning</code>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">large language models</code>
                  </div>
                </div>
              )}
              {formData.data_source === 'openalex' && (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Use free-text search for OpenAlex
                  </p>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">artificial intelligence</code>
                  </div>
                  <div>
                    <code className="bg-muted px-1 py-0.5 rounded">neural networks</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimated Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ~{Math.ceil(formData.max_papers * 3 / 60)} min
              </p>
              <p className="text-xs text-muted-foreground">
                Based on ~3 seconds per paper
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimated Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">
                ~${(formData.max_papers * 0.0005).toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on gpt-4o-mini pricing
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
