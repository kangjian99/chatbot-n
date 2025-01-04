'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import html2canvas from 'html2canvas'
import {
  Brain, Network, Settings, Target, Cpu, Layers,
  Activity, AlertCircle, Archive, ArrowRight, Award,
  BarChart, Bell, Book, Bookmark, Box,
  Calendar, Camera, Check, Clock,
  Cloud, Code, Compass, Database, Download,
  Eye, File, Filter, Flag, Folder,
  Globe, Heart, Home, Image, Info,
  Key, Link, Lock, Mail, Map,
  MessageSquare as Message, Monitor, Moon, Music, Package,
  Phone, Printer, Search, Send, Server,
  Shield, Star, Sun, User,
  Video, Wifi, Zap
} from 'lucide-react'
import { CardData } from '../types/card'
import { Download as DownloadIcon } from 'lucide-react'

const url = process.env.NEXT_PUBLIC_API_URL;

const iconMap = {
  Brain, Network, Settings, Target, Cpu, Layers,
  Activity, AlertCircle, Archive, ArrowRight, Award,
  BarChart, Bell, Book, Bookmark, Box,
  Calendar, Camera, Check, Clock,
  Cloud, Code, Compass, Database, Download,
  Eye, File, Filter, Flag, Folder,
  Globe, Heart, Home, Image, Info,
  Key, Link, Lock, Mail, Map,
  Message, Monitor, Moon, Music, Package,
  Phone, Printer, Search, Send, Server,
  Shield, Star, Sun, User,
  Video, Wifi, Zap
} as const

export function CardGrid() {
  const [cards, setCards] = useState<CardData[]>([])
  const [mainTitle, setMainTitle] = useState('')
  const [background, setBackground] = useState({ startColor: '#1e40af', endColor: '#7c3aed' })
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useFixedColors, setUseFixedColors] = useState(false)
  const [useLargeTitle, setUseLargeTitle] = useState(false)
  const [useTwoColumns, setUseTwoColumns] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)

  const fixedColors = {
    startColor: '#1e40af',
    endColor: '#7c3aed'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch(url + "generate-cards", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      })
      const data = await response.json()
      setMainTitle(data.maintitle)
      setCards(data.cards)
      setBackground(useFixedColors ? fixedColors : data.background)
    } catch (error) {
      console.error('Error generating cards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!cardsRef.current || cards.length === 0) return
    
    try {
      setIsLoading(true)
      
      const canvas = await html2canvas(cardsRef.current, {
        backgroundColor: useFixedColors ? fixedColors.startColor : background.startColor,
        scale: 2,
      })
      
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = '文章内容提炼结果.png'
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getGridColumns = (cardCount: number) => {
    if (useTwoColumns) return 'grid-cols-1 md:grid-cols-2'
    if (cardCount <= 3) return 'grid-cols-1 md:grid-cols-3'
    if (cardCount <= 4) return 'grid-cols-1 md:grid-cols-2'
    return 'grid-cols-1 md:grid-cols-3' // 5个或更多时使用3列
  }

  // 根据卡片数量决定容器宽度
  const getContainerWidth = (cardCount: number) => {
    if (useTwoColumns) return 'w-[600px]'
    if (cardCount <= 3) return 'w-[720px]'
    if (cardCount <= 4) return 'w-[600px]'
    if (cardCount <= 6) return 'w-[720px]'
    return 'w-[720px]' // 7个或更多时使用更宽的容器
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex flex-col space-y-4 bg-white p-6 rounded-lg shadow-lg">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请在此输入您要分析的文章内容（支持链接）..."
            className="w-full h-40 p-4 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex flex-col space-y-4">
            <div className="flex justify-center items-center gap-4">
              <label className="flex items-center gap-2 text-gray-700 text-sm">
                <input
                  type="checkbox"
                  checked={useFixedColors}
                  onChange={(e) => setUseFixedColors(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                使用固定配色
              </label>
              <label className="flex items-center gap-2 text-gray-700 text-sm">
                <input
                  type="checkbox"
                  checked={useLargeTitle}
                  onChange={(e) => setUseLargeTitle(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                大字体标题居中
              </label>
              <label className="flex items-center gap-2 text-gray-700 text-sm">
                <input
                  type="checkbox"
                  checked={useTwoColumns}
                  onChange={(e) => setUseTwoColumns(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                两栏显示
              </label>
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading || !content.trim()}
                className="px-3 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200"
              >
                {isLoading ? '分析中...' : '生成提炼卡片'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {cards.length > 0 && (
        <div className="flex flex-col items-center">
          <div 
            ref={cardsRef}
            className={`${getContainerWidth(cards.length)} p-8 rounded-lg relative overflow-hidden`}
            style={{
              background: `linear-gradient(135deg, ${useFixedColors ? fixedColors.startColor : background.startColor} 0%, ${useFixedColors ? fixedColors.endColor : background.endColor} 100%)`,
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h1 className="text-4xl font-bold text-white/90 mb-8 text-center">
              {mainTitle}
            </h1>            
            <div className={`grid ${getGridColumns(cards.length)} gap-6 relative z-10`}>
              {cards.map((card, index) => {
                const Icon = iconMap[card.icon as keyof typeof iconMap]
                return (
                  <Card
                    key={index}
                    className="group relative overflow-hidden backdrop-blur-md bg-white/10 border-white/20 p-6 transition-all duration-300 hover:bg-white/20 w-full min-h-[200px]"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <Icon className="w-6 h-6 text-white/70" />
                    </div>
                    
                    <div className={`${useLargeTitle ? 'mt-6' : 'mt-4'}`}>
                      <h3 className={`${useLargeTitle ? 'text-2xl text-center' : 'text-xl'} font-semibold text-white/90 mb-2`}>
                        {card.title}
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200"
            >
              <DownloadIcon className="w-4 h-4" />
              {isLoading ? '导出中...' : '导出图片'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}