import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecommendationsErrorState } from '../RecommendationsErrorState';

describe('RecommendationsErrorState', () => {
  it('renders CTA for no recommendations with climate filters applied', () => {
    const onRelax = vi.fn();
    render(
      <RecommendationsErrorState
        error="Не удалось подобрать культуры с текущими фильтрами"
        errorStatus={404}
        filtersApplied={['agro_zone=лесостепь', 'prefer_cover_crops=true']}
        onRelaxFilters={onRelax}
      />
    );

    const button = screen.getByRole('button', { name: /Ослабить фильтры/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onRelax).toHaveBeenCalled();
    expect(screen.getByText(/agro_zone=лесостепь/i)).toBeInTheDocument();
  });

  it('shows sync history action for 404 history errors', () => {
    const onSync = vi.fn();
    render(
      <RecommendationsErrorState
        error="История поля отсутствует"
        errorStatus={404}
        onSyncHistory={onSync}
      />
    );

    const button = screen.getByRole('button', { name: /Синхронизировать историю/i });
    fireEvent.click(button);
    expect(onSync).toHaveBeenCalled();
    expect(
      screen.getByText(/история поля отсутствует/i)
    ).toBeInTheDocument();
  });

  it('renders forbidden state with access hint', () => {
    render(<RecommendationsErrorState error="Поле недоступно" errorStatus={403} />);

    expect(screen.getByText(/Поле недоступно/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Пожалуйста, выберите другое поле/i)
    ).toBeInTheDocument();
  });
});
