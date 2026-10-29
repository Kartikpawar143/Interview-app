import { useCallback, useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import { LinuxCommandsPage } from './pages/LinuxCommandsPage'
import { LinuxDashboard } from './pages/LinuxDashboard'
import { LinuxQuestionPage } from './pages/LinuxQuestionPage'
import { LinuxQuestionBankPage } from './pages/LinuxQuestionBankPage'
import { LinuxTopicPage } from './pages/LinuxTopicPage'
import { LinuxCopilot } from './components/linux/LinuxCopilot'
import { LinuxVisualLearningPage } from './pages/LinuxVisualLearningPage'

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
  if (!page && pathname === '/') page = <HomePage />
  if (!page) page = <main className="route-not-found"><h1>That page isn’t here.</h1><a href="/linux">Return to Linux learning</a></main>
  return <>{page}{pathname.startsWith('/linux') && <LinuxCopilot />}</>
}

export default App
