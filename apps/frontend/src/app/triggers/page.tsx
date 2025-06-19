import { TriggerForm } from '@/components/triggers/TriggerForm'
import { TradingLayout } from '@/components/layout/TradingLayout'

export default function TriggersPage() {
  return (
    <TradingLayout>
      {/* Main Form Section */}
      <section>
        <div className="w-full">
          <TriggerForm />
        </div>
      </section>
    </TradingLayout>
  )
} 