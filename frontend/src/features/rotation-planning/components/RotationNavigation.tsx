import { User, Menu, X, History, Calculator } from 'lucide-react';
import { useRotationNavigation } from '../hooks/useRotationNavigation';

export const RotationNavigation = () => {
  const {
    isMenuOpen,
    menuRef,
    burgerRef,
    toggleMenu,
    handleNavigation
  } = useRotationNavigation();

    return (
    <>
      <div className="fixed top-[3%] left-5 md:left-[10%] w-[90%] md:w-4/5 h-12 md:h-14 bg-[#162A3D] light:bg-white rounded-xl shadow-lg flex items-center px-3 md:px-4 z-1 border border-[#2D4A62] light:border-gray-200">
        <div className="relative">
          <button
            ref={burgerRef}
            className="bg-transparent border-none cursor-pointer p-2 rounded transition-colors hover:bg-[#2D4A62] light:hover:bg-gray-100 w-10 h-10 flex items-center justify-center"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-[#E8F4FF] light:text-gray-800" />
            ) : (
              <Menu className="w-5 h-5 text-[#E8F4FF] light:text-gray-800" />
            )}
          </button>
        </div>
        <span className="ml-2 md:ml-3 text-sm md:text-lg font-semibold text-[#E8F4FF] light:text-gray-800 whitespace-nowrap hidden xl:block">
          АгроПланнер
        </span>
        <button
          onClick={() => handleNavigation("/profile")}
          className="ml-auto flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-none bg-[#2D4A62] light:bg-gray-200 cursor-pointer transition-colors hover:bg-[#3A5A7A] light:hover:bg-gray-300 flex-shrink-0"
        >
          <User className="w-4 h-4 md:w-5 md:h-5 text-[#E8F4FF] light:text-gray-800" />
        </button>
      </div>
      {isMenuOpen && (
        <div className="fixed top-[12%] left-5 md:left-[10%] w-64 h-auto z-50 bg-[#162A3D] light:bg-white rounded-xl shadow-lg border border-[#2D4A62] light:border-gray-200" ref={menuRef}>
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigation("/")}
                  className="flex items-center w-full p-3 text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-900 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5 mr-3" />
                  <span>Главная</span>
                </button>
              </li>
              <li>
  <button
    onClick={() => handleNavigation("/profile")}
    className="flex items-center w-full p-3 text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-900 rounded-lg transition-colors"
  >
    <History className="w-5 h-5 mr-3" />
    <span>Профиль</span>
  </button>
</li>
              <li>
  <button
    onClick={() => handleNavigation("/eco")}
    className="flex items-center w-full p-3 text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-900 rounded-lg transition-colors"
  >
    <Calculator className="w-5 h-5 mr-3" />
    <span>Эко-калькулятор</span>
  </button>
</li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
function handleSearch(e: React.FormEvent) {
  throw new Error('Function not implemented.');
}
function setSearchQuery(value: string) {
  throw new Error('Function not implemented.');
}     