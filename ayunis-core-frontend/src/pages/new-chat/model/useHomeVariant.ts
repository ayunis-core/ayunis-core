import {
  useHomeVariantSetting,
  useSampleDataSetting,
} from '@/shared/lib/prototype-settings';

export function useHomeVariant() {
  const [variant, setVariant] = useHomeVariantSetting();
  const [useSampleData, setUseSampleData] = useSampleDataSetting();
  return { variant, setVariant, useSampleData, setUseSampleData };
}
