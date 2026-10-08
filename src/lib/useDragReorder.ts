import { useState, useRef, useCallback } from 'react';

interface DragState {
  dragIndex: number | null;
  dragOverIndex: number | null;
}

export function useDragReorder<T>(items: T[], onReorder: (newItems: T[]) => void) {
  const [state, setState] = useState<DragState>({ dragIndex: null, dragOverIndex: null });
  const dragIdRef = useRef<string | null>(null);

  const handleDragStart = useCallback((index: number, id: string) => {
    setState({ dragIndex: index, dragOverIndex: null });
    dragIdRef.current = id;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setState((prev) => {
      if (prev.dragOverIndex === index) return prev;
      return { ...prev, dragOverIndex: index };
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setState((prev) => {
        if (prev.dragIndex === null || prev.dragIndex === dropIndex) {
          return { dragIndex: null, dragOverIndex: null };
        }
        const newItems = [...items];
        const [moved] = newItems.splice(prev.dragIndex, 1);
        newItems.splice(dropIndex, 0, moved);
        onReorder(newItems);
        return { dragIndex: null, dragOverIndex: null };
      });
    },
    [items, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setState({ dragIndex: null, dragOverIndex: null });
    dragIdRef.current = null;
  }, []);

  return {
    dragIndex: state.dragIndex,
    dragOverIndex: state.dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
