import { useState, useRef, useEffect } from 'react';

interface SatelliteImageryProps {
  imageUrl?: string;
  coordinates: { lat: number; lng: number };
  source?: string;
}

export default function SatelliteImagery({ imageUrl, coordinates, source }: SatelliteImageryProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [imageUrl]);

  const handleImageError = () => {
    setImgError(true);
  };

  if (!imageUrl || imgError) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center h-48 flex flex-col items-center justify-center border border-red-500">
        <div className="text-red-400 text-2xl mb-2">❌</div>
        <div className="text-red-400 text-sm font-medium">Спутниковый снимок недоступен</div>
        <div className="text-gray-400 text-xs mt-2">
          Координаты: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-600 bg-black">
      <div className="relative">
        <img 
          ref={imgRef}
          src={imageUrl} 
          alt="Satellite imagery" 
          className={`w-full h-48 object-cover transition-opacity duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={() => setImgLoaded(true)}
        />
        
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-sm flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Загрузка спутникового снимка...
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="text-white text-xs">
            <div className="text-gray-300">
              {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}