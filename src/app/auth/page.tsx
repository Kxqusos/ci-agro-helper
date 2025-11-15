'use client'
import { useAuth } from '@/features/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Background from '@/components/layout/Background'

export default function Home() {
  const [isRightPanelActive, setIsRightPanelActive] = useState(false)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '' 
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { user, isLoading, login, register } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/')
    }
  }, [user, isLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await login(loginData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await register(registerData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0F1F2F]">
        <Background />
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4ECDC4] z-50 relative"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center flex-col h-screen relative overflow-hidden bg-[#0F1F2F]">
        <Background />
        
        {error && (
          <div className="absolute top-4 bg-[#DC2626] border border-[#B91C1C] text-white px-4 py-3 rounded z-50">
            {error}
          </div>
        )}

        <div className={`container bg-[#172B3E]/90 backdrop-blur-sm rounded-2xl shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)] relative overflow-hidden w-full max-w-4xl min-h-[600px] z-10 border border-[#2D4A62] ${isRightPanelActive ? 'right-panel-active' : ''}`}>
          
          <div className="form-container sign-up-container">
            <form onSubmit={handleRegister} className="bg-transparent flex items-center justify-center flex-col p-12 h-full text-center">
              <h1 className="font-bold text-2xl mb-4 text-[#E8F4FF]">Регистрация</h1>
              
              <span className="text-sm text-[#8BA4B8] mb-4"></span>
              <input 
                type="text" 
                placeholder="Имя" 
                className="bg-[#0F1F2F] border border-[#2D4A62] text-[#E8F4FF] py-3 px-4 mb-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent placeholder-[#8BA4B8]"
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                required
              />
              <input 
                type="email" 
                placeholder="Электронная почта" 
                className="bg-[#0F1F2F] border border-[#2D4A62] text-[#E8F4FF] py-3 px-4 mb-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent placeholder-[#8BA4B8]"
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="Пароль" 
                className="bg-[#0F1F2F] border border-[#2D4A62] text-[#E8F4FF] py-3 px-4 mb-6 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent placeholder-[#8BA4B8]"
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                required
                minLength={6}
              />
              <button 
                type="submit"
                disabled={loading}
                className="rounded-2xl border border-[#4ECDC4] bg-[#4ECDC4] text-[#0F1F2F] text-sm font-bold py-3 px-12 uppercase tracking-wider transition-all duration-300 hover:bg-[#45B8B0] hover:border-[#45B8B0] active:scale-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Создается аккаунт...' : 'Войти'}
              </button>
            </form>
          </div>
          <div className="form-container sign-in-container">
            <form onSubmit={handleLogin} className="bg-transparent flex items-center justify-center flex-col p-12 h-full text-center">
              <h1 className="font-bold text-2xl mb-4 text-[#E8F4FF]">Войти</h1>
              <span className="text-sm text-[#8BA4B8] mb-4"></span>
              <input 
                type="email" 
                placeholder="Электронная почта" 
                className="bg-[#0F1F2F] border border-[#2D4A62] text-[#E8F4FF] py-3 px-4 mb-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent placeholder-[#8BA4B8]"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="Пароль" 
                className="bg-[#0F1F2F] border border-[#2D4A62] text-[#E8F4FF] py-3 px-4 mb-6 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent placeholder-[#8BA4B8]"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
              />
              <button 
                type="submit"
                disabled={loading}
                className="rounded-2xl border border-[#4ECDC4] bg-[#4ECDC4] text-[#0F1F2F] text-sm font-bold py-3 px-12 uppercase tracking-wider transition-all duration-300 hover:bg-[#45B8B0] hover:border-[#45B8B0] active:scale-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Выполняется вход..' : 'Войти'}
              </button>
            </form>
          </div>
          <div className="overlay-container">
            <div 
              className="overlay"
              style={{
                backgroundImage: "url('/cool_pole.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="absolute inset-0 bg-[#0F1F2F]/80 backdrop-blur-sm z-10"></div>
              
              <div className="overlay-panel overlay-left relative z-20">
                <h1 className="text-3xl font-bold mb-4 text-white">Добро пожаловать!</h1>
                <p className="text-base leading-6 mb-8 text-white">
                  Чтобы оставаться с нами, войди, используя свои данные
                </p>
                <button 
                  onClick={() => setIsRightPanelActive(false)}
                  className="rounded-2xl border-2 border-white bg-transparent text-white text-sm font-bold py-3 px-12 uppercase tracking-wider transition-all duration-300 hover:bg-white hover:text-[#0F1F2F] active:scale-95 focus:outline-none"
                >
                  Войти
                </button>
              </div>
              <div className="overlay-panel overlay-right relative z-20">
                <h1 className="text-3xl font-bold mb-4 text-white">С возвращением!</h1>
                <p className="text-base leading-6 mb-8 text-white">
                  Введи свои данные и начните свой путь
                </p>
                <button 
                  onClick={() => setIsRightPanelActive(true)}
                  className="rounded-2xl border-2 border-white bg-transparent text-white text-sm font-bold py-3 px-12 uppercase tracking-wider transition-all duration-300 hover:bg-white hover:text-[#0F1F2F] active:scale-95 focus:outline-none"
                >
                 Зарегистрироваться
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .container {
            position: relative;
            width: 100%;
            max-width: 1000px;
            min-height: 600px;
          }

          .form-container {
            position: absolute;
            top: 0;
            height: 100%;
            width: 50%;
            transition: all 0.6s ease-in-out;
          }

          .sign-in-container {
            left: 0;
            z-index: 2;
          }

          .sign-up-container {
            left: 0;
            opacity: 0;
            z-index: 1;
            pointer-events: none;
          }

          .container.right-panel-active .sign-in-container {
            transform: translateX(100%);
            opacity: 0;
            pointer-events: none;
            z-index: 1;
          }

          .container.right-panel-active .sign-up-container {
            transform: translateX(100%);
            opacity: 1;
            z-index: 2;
            pointer-events: all;
            animation: show 0.6s;
          }

          .overlay-container {
            position: absolute;
            top: 0;
            left: 50%;
            width: 50%;
            height: 100%;
            overflow: hidden;
            transition: transform 0.6s ease-in-out;
            z-index: 100;
          }

          .overlay {
            position: relative;
            left: -100%;
            height: 100%;
            width: 200%;
            transform: translateX(0);
            transition: transform 0.6s ease-in-out;
          }

          .container.right-panel-active .overlay-container {
            transform: translateX(-100%);
          }

          .container.right-panel-active .overlay {
            transform: translateX(50%);
          }

          .overlay-panel {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 0 40px;
            text-align: center;
            top: 0;
            height: 100%;
            width: 50%;
            transform: translateX(0);
            transition: transform 0.6s ease-in-out;
          }

          .overlay-left {
            transform: translateX(-20%);
          }

          .overlay-right {
            right: 0;
            transform: translateX(0);
          }

          .container.right-panel-active .overlay-left {
            transform: translateX(0);
          }

          .container.right-panel-active .overlay-right {
            transform: translateX(20%);
          }

          @keyframes show {
            0%, 49.99% {
              opacity: 0;
              z-index: 1;
            }
            50%, 100% {
              opacity: 1;
              z-index: 2;
            }
          }
        `}</style>
      </div>
    )
  }
  return (
    <div className="flex justify-center items-center h-screen bg-[#0F1F2F]">
      <Background />
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4ECDC4] z-50 relative"></div>
    </div>
  )
}