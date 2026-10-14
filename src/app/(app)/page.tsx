import { FinanceApp } from './finance-app'
import { FinanceProvider } from './finance-provider'

export default function HomePage() {
  return (
    <FinanceProvider>
      <FinanceApp />
    </FinanceProvider>
  )
}
