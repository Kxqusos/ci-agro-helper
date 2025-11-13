"use client";
import { useState, useRef, useEffect } from "react";
import { useMap } from "@/features/map/context/MapContext";
import { useRouter } from "next/navigation";
import { Menu, X, User, History, Calculator, Search } from "lucide-react";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { mapRef } = useMap();
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleNavigation = (path: string) => {
    closeMenu();
    router.push(path);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        burgerRef.current &&
        !burgerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!mapRef.current) {
      alert("Карта еще загружается. Подождите немного и попробуйте снова.");
      return;
    }

    setIsSearching(true);

    try {
      const result = await mapRef.current.searchCity(searchQuery.trim());
      if (result) {
        mapRef.current.flyToCity(result.lat, result.lng, 12);
        setSearchQuery("");
      } else {
        alert("Город не найден. Попробуйте другой запрос.");
      }
    } catch (error) {
      console.error("[SearchBar] Search error:", error);
      alert("Ошибка при поиске города");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch(e);
  };

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

        <form
          onSubmit={handleSearch}
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center w-2/3 md:w-[65%] lg:w-[70%] xl:w-[65%] max-w-2xl"
        >
          <div className="relative flex items-center w-full">
            <input
              type="text"
              placeholder="Поиск по карте..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
              className="w-full py-1.5 md:py-2 pr-10 md:pr-12 pl-3 md:pl-4 border border-[#2D4A62] light:border-gray-300 rounded-full outline-none bg-[#0F1F2F] light:bg-gray-50 text-[#E8F4FF] light:text-gray-900 text-sm md:text-base placeholder-[#8BA4B8] light:placeholder-gray-500 disabled:opacity-50 focus:border-[#3388ff] light:focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-3 md:right-4 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center cursor-pointer text-[#8BA4B8] light:text-gray-500 hover:text-[#E8F4FF] light:hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-default"
              title="Найти город"
            >
              <Search className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </form>
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
                  onClick={() => handleNavigation("/profile")}
                  className="flex items-center w-full p-3 text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-900 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5 mr-3" />
                  <span>Профиль</span>
                </button>
              </li>
              <li>
  <button
    onClick={() => handleNavigation("/history")}
    className="flex items-center w-full p-3 text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-900 rounded-lg transition-colors"
  >
    <History className="w-5 h-5 mr-3" />
    <span>Севооборот</span>
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
