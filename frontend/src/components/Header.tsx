import { ArrowUpRight } from 'lucide-react'
import { Brand } from './Brand'

export function Header() {
  return <header className="site-header"><div className="header-inner"><Brand /><nav aria-label="Main navigation"><a href="#departments">Departments</a><a href="#approach">Our approach</a></nav><a className="header-link" href="#departments">Start learning <ArrowUpRight size={15} /></a><button className="menu-button" aria-label="Open navigation menu" onClick={() => document.querySelector('.site-header')?.classList.toggle('menu-open')}><span /><span /></button></div></header>
}
