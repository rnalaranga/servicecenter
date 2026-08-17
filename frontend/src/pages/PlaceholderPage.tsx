import { Construction } from 'lucide-react'

interface PlaceholderProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: PlaceholderProps) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{description || 'This module is under development'}</p>
        </div>
      </div>
      <div className="card">
        <div className="empty-state" style={{ padding: '80px 20px' }}>
          <div className="empty-state-icon" style={{ width: 64, height: 64 }}>
            <Construction size={28} style={{ color: 'var(--color-gold-primary)' }} />
          </div>
          <div className="empty-state-title">Coming Soon</div>
          <div className="empty-state-desc">
            The <strong>{title}</strong> module is being built. Check back soon for the full feature set.
          </div>
        </div>
      </div>
    </div>
  )
}
