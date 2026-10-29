import { useCallback, useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import { LinuxCommandsPage } from './pages/LinuxCommandsPage'
import { LinuxDashboard } from './pages/LinuxDashboard'
import { LinuxQuestionPage } from './pages/LinuxQuestionPage'
import { LinuxQuestionBankPage } from './pages/LinuxQuestionBankPage'
import { LinuxTopicPage } from './pages/LinuxTopicPage'
import { LinuxCopilot } from './components/linux/LinuxCopilot'
import { LinuxVisualLearningPage } from './pages/LinuxVisualLearningPage'
import { Az900Page } from './pages/Az900Page'
import { AzureAdministrationPage } from './pages/AzureAdministrationPage'
import { Az900VisualLearningPage } from './pages/Az900VisualLearningPage'
import { AwsPage } from './pages/AwsPage'
import { AwsVisualLearningPage } from './pages/AwsVisualLearningPage'
import { AwsTroubleshootingPage } from './pages/AwsTroubleshootingPage'

function App() {
  const [route, setRoute] = useState(() => `${window.location.pathname}${window.location.search}`)
  const navigate = useCallback((path: string) => {
    if (path === `${window.location.pathname}${window.location.search}`) return
    window.history.pushState({}, '', path)
    setRoute(`${window.location.pathname}${window.location.search}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const handlePopState = () => setRoute(`${window.location.pathname}${window.location.search}`)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [pathname, search = ''] = route.split('?')
  let page
  if (pathname === '/aws') page = <AwsPage navigate={navigate} view="overview" />
  if (!page && pathname === '/aws/visual-learning') page = <AwsVisualLearningPage navigate={navigate} />
  if (!page && pathname === '/aws/troubleshooting') page = <AwsTroubleshootingPage navigate={navigate} />
  const awsLabMatch = pathname.match(/^\/aws\/troubleshooting\/([^/]+)$/)
  if (!page && awsLabMatch) {
    let slug = awsLabMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug and show the lab not-found view. */ }
    page = <AwsTroubleshootingPage key={slug} navigate={navigate} slug={slug} />
  }
  if (!page && pathname === '/aws/questions') {
    const params = new URLSearchParams(search)
    page = <AwsPage navigate={navigate} view="questions" topicFilter={params.get('topic') ?? undefined} />
  }
  const awsQuestionMatch = pathname.match(/^\/aws\/questions\/([^/]+)$/)
  if (!page && awsQuestionMatch) {
    let slug = awsQuestionMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the page will show the not-found state. */ }
    page = <AwsPage key={slug} navigate={navigate} view="question" slug={slug} />
  }
  const awsTopicMatch = pathname.match(/^\/aws\/topics\/([^/]+)$/)
  if (!page && awsTopicMatch) {
    let slug = awsTopicMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the page will show the not-found state. */ }
    page = <AwsPage key={slug} navigate={navigate} view="topic" slug={slug} />
  }
  if (pathname === '/linux') page = <LinuxDashboard navigate={navigate} />
  else if (pathname === '/linux/visual-learning') page = <LinuxVisualLearningPage navigate={navigate} />
  else if (pathname === '/linux/questions') {
    const params = new URLSearchParams(search)
    page = <LinuxQuestionBankPage navigate={navigate} topicFilter={params.get('topic') ?? undefined} />
  }
  const topicMatch = pathname.match(/^\/linux\/topics\/([^/]+)$/)
  if (!page && topicMatch) {
    let slug = topicMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the page will show the not-found state. */ }
    page = <LinuxTopicPage key={slug} slug={slug} navigate={navigate} />
  }
  if (!page && pathname === '/linux/commands') page = <LinuxCommandsPage navigate={navigate} />
  const match = pathname.match(/^\/linux\/questions\/([^/]+)$/)
  if (!page && match) {
    let slug = match[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the API will return not found. */ }
    page = <LinuxQuestionPage key={slug} slug={slug} navigate={navigate} />
  }
  if (!page && pathname === '/azure/az-900') page = <Az900Page navigate={navigate} />
  if (!page && pathname === '/azure/az-900/visual-learning') page = <Az900VisualLearningPage navigate={navigate} />
  const az900Match = pathname.match(/^\/azure\/az-900\/([^/]+)\/([^/]+)$/)
  if (!page && az900Match) page = <Az900Page key={`${az900Match[1]}:${az900Match[2]}`} navigate={navigate} sectionId={az900Match[1]} lessonId={az900Match[2]} />
  if (!page && pathname === '/azure') page = <AzureAdministrationPage navigate={navigate} view="overview" />
  if (!page && pathname === '/azure/questions') page = <AzureAdministrationPage navigate={navigate} view="questions" />
  const azureAdminQuestionMatch = pathname.match(/^\/azure\/questions\/([^/]+)$/)
  if (!page && azureAdminQuestionMatch) {
    let slug = azureAdminQuestionMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the page will show its not-found state. */ }
    page = <AzureAdministrationPage key={slug} navigate={navigate} view="question" slug={slug} />
  }
  const azureTopicMatch = pathname.match(/^\/azure\/topics\/([^/]+)$/)
  if (!page && azureTopicMatch) {
    let slug = azureTopicMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the page will show its not-found state. */ }
    page = <AzureAdministrationPage key={slug} navigate={navigate} view="topic" slug={slug} />
  }
  if (!page && pathname === '/azure/scenarios') page = <AzureAdministrationPage navigate={navigate} view="scenarios" />
  const azureScenarioMatch = pathname.match(/^\/azure\/scenarios\/([^/]+)$/)
  if (!page && azureScenarioMatch) {
    let slug = azureScenarioMatch[1]
    try { slug = decodeURIComponent(slug) } catch { /* Keep the raw slug; the page will show its not-found state. */ }
    page = <AzureAdministrationPage key={slug} navigate={navigate} view="scenario" slug={slug} />
  }
  if (!page && pathname === '/') page = <HomePage />
  if (!page) page = <main className="route-not-found"><h1>That page isn’t here.</h1><a href="/linux">Return to Linux learning</a></main>
  return <>{page}{pathname.startsWith('/linux') && <LinuxCopilot />}</>
}

export default App
