import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { DisciplineBadge } from '../molecules/DisciplineBadge'
import { formatDate } from '../../lib/utils'

interface DigestHighlight {
  category: string
  title: string
  description: string
  impact_level: 'high' | 'medium' | 'low'
  date: string
}

interface DigestStats {
  total_decisions: number
  meetings_count: number
  consensus_percentage: number
  high_impact_count: number
  highlights: DigestHighlight[]
}

interface ExecutiveDigestProps {
  digest: DigestStats
}

export function ExecutiveDigest({ digest }: ExecutiveDigestProps) {
  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-50 border-red-200'
      case 'medium': return 'bg-amber-50 border-amber-200'
      case 'low': return 'bg-gray-50 border-gray-200'
      default: return 'bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{digest.total_decisions}</p>
              <p className="text-sm text-gray-600 mt-1">Total Decisions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{digest.meetings_count}</p>
              <p className="text-sm text-gray-600 mt-1">Meetings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{digest.consensus_percentage}%</p>
              <p className="text-sm text-gray-600 mt-1">Consensus</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{digest.high_impact_count}</p>
              <p className="text-sm text-gray-600 mt-1">High Impact</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Highlights */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Highlights</h3>
        <div className="space-y-3">
          {digest.highlights.map((highlight, idx) => (
            <div key={idx} className={`border rounded-lg p-4 ${getImpactColor(highlight.impact_level)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DisciplineBadge discipline={highlight.category} />
                    <span className="text-xs text-gray-500">{formatDate(highlight.date)}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{highlight.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{highlight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
