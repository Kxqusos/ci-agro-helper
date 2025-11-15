import { CropSearch } from '@/features/crops-search/components/CropSearch';
import Background from '@/components/layout/Background';

export default function CropsSearchPage() {
  return (
    <>
      <Background />
      <div style={{ 
        minHeight: '100vh',
        padding: '20px',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto' 
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            color: 'white',
            marginBottom: '30px',
            fontSize: '2.5rem',
            fontWeight: '700',
            textShadow: '2px 2px 8px rgba(0,0,0,0.7)'
          }}>
            Поиск сельскохозяйственных культур
          </h1>
          <CropSearch />
        </div>
      </div>
    </>
  );
}