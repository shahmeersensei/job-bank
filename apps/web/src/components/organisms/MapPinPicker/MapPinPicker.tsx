'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/atoms/Skeleton';
import type { MapPinPickerProps } from './mapPinPicker.types';

/** Leaflet touches `window`, so the map only renders in the browser. */
export const MapPinPicker = dynamic<MapPinPickerProps>(() => import('./MapPinPickerClient'), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
});
