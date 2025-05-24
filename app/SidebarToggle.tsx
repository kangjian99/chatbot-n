'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function SidebarToggle({ children }: { children: React.ReactNode }) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)

  return (
    <div
      className={`app-container ${
        leftSidebarCollapsed ? 'left-sidebar-collapsed' : 'left-sidebar-expanded'
      } ${rightSidebarCollapsed ? 'right-sidebar-collapsed' : 'right-sidebar-expanded'}`}
    >
      <button
        className="toggle-button toggle-left-sidebar"
        onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
      >
        {leftSidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
      <button
        className="toggle-button toggle-right-sidebar"
        onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
      >
        {rightSidebarCollapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>
      <div className="main-container">{children}</div>
    </div>
  )
}
