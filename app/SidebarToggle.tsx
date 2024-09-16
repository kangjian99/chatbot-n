'use client'

import { useState } from 'react'

export default function SidebarToggle({ children }: { children: React.ReactNode }) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)

  return (
    <div className={`app-container ${leftSidebarCollapsed ? 'left-sidebar-collapsed' : 'left-sidebar-expanded'} ${rightSidebarCollapsed ? 'right-sidebar-collapsed' : 'right-sidebar-expanded'}`}>
      <button className="toggle-left-sidebar" onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}>
        {leftSidebarCollapsed ? '>' : '<'}
      </button>
      <button className="toggle-right-sidebar" onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}>
        {rightSidebarCollapsed ? '<' : '>'}
      </button>
      <div className="main-container">
        {children}
      </div>
    </div>
  )
}
