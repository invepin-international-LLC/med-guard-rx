import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMedicationImageProps {
  medicationId?: string;
  name?: string;
  genericName?: string;
  ndcCode?: string;
  rxcui?: string;
  existingImageUrl?: string;
  form?: string;
  color?: string;
  strength?: string;
}

export function useMedicationImage({ medicationId, name, genericName, ndcCode, rxcui, existingImageUrl, form, color, strength }: UseMedicationImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(existingImageUrl || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingImageUrl) {
      setImageUrl(existingImageUrl);
      return;
    }

    if (!name && !ndcCode && !rxcui) return;

    const fetchImage = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('rximage-lookup', {
          body: { 
            ndc: ndcCode, 
            rxcui,
            name: genericName || name,
            form,
            color,
            strength,
          },
        });

        if (error) throw error;
        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);

          // Cache the image URL in the database
          if (medicationId) {
            await supabase
              .from('medications')
              .update({ image_url: data.imageUrl })
              .eq('id', medicationId);
          }
        }
      } catch (error) {
        console.error('Image lookup error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [name, genericName, ndcCode, rxcui, existingImageUrl, medicationId]);

  return { imageUrl, loading };
}
