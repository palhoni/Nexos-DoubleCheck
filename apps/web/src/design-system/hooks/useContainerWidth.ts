import { useEffect, useRef, useState } from 'react';

/** Largura do elemento contêiner (via ResizeObserver), não da viewport — essencial para
 *  qualquer componente que possa renderizar embutido dentro de uma aba/coluna estreita
 *  (ex.: uma lista dentro do Detalhe de Produto), onde a viewport mente sobre o espaço
 *  realmente disponível. Extraído do padrão já usado em EntityListPage. */
export function useContainerWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    setWidth(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}
