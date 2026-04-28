import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Loader2, Pill, AlertTriangle, Info, ChevronRight, BookOpen, ArrowLeft, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';

interface DrugInfo {
  name: string;
  genericName?: string;
  brandNames: string[];
  drugClass?: string;
  purpose?: string;
  warnings: string[];
  sideEffects: string[];
  doseForms: string[];
  route: string[];
  activeIngredients: { name: string; strength: string }[];
  manufacturer?: string;
  rxcui?: string;
  description?: string;
  interactions?: string;
  pregnancyCategory?: string;
  imageUrl?: string;
}

interface MedicationDictionaryProps {
  onBack: () => void;
  onAddMedication?: (drug: DrugInfo) => void;
}

export function MedicationDictionary({ onBack, onAddMedication }: MedicationDictionaryProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DrugInfo[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null);
  const [detailDrug, setDetailDrug] = useState<DrugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('medication-dictionary', {
        body: { query: query.trim(), action: 'search' },
      });
      if (error) throw error;
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (drug: DrugInfo) => {
    setSelectedDrug(drug);
    setLoadingDetail(true);
    try {
      const { data, error } = await supabase.functions.invoke('medication-dictionary', {
        body: { query: drug.genericName || drug.name, action: 'detail' },
      });
      if (error) throw error;
      setDetailDrug(data.drug || drug);
    } catch {
      setDetailDrug(drug);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h2 className="text-elder-xl text-foreground">Medication Dictionary</h2>
          <p className="text-muted-foreground">Search any medication for details</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search medications (e.g., Metformin, Lisinopril)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-14 pl-12 text-lg rounded-xl"
          />
        </div>
        <Button
          variant="accent"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="h-14 px-6 rounded-xl"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="bg-card rounded-2xl p-8 text-center border-2 border-border">
          <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
          <p className="text-muted-foreground">Try a different name or spelling</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((drug, idx) => (
            <button
              key={idx}
              onClick={() => handleViewDetail(drug)}
              className="w-full bg-card rounded-2xl p-5 border-2 border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {drug.imageUrl ? (
                    <img src={drug.imageUrl} alt={drug.name} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Pill className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{drug.name}</h3>
                    {drug.genericName && drug.genericName !== drug.name && (
                      <p className="text-muted-foreground">{drug.genericName}</p>
                    )}
                    {drug.drugClass && (
                      <p className="text-sm text-primary">{drug.drugClass}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedDrug} onOpenChange={() => { setSelectedDrug(null); setDetailDrug(null); }}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : detailDrug && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  {detailDrug.imageUrl ? (
                    <img src={detailDrug.imageUrl} alt={detailDrug.name} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Pill className="w-10 h-10 text-primary" />
                    </div>
                  )}
                  <div>
                    <SheetTitle className="text-2xl text-left">{detailDrug.name}</SheetTitle>
                    {detailDrug.genericName && (
                      <p className="text-muted-foreground text-lg">{detailDrug.genericName}</p>
                    )}
                    {detailDrug.drugClass && (
                      <p className="text-primary font-medium">{detailDrug.drugClass}</p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Add to My Medications Button */}
              {onAddMedication && (
                <div className="py-4">
                  <Button
                    variant="accent"
                    size="xl"
                    className="w-full"
                    onClick={() => {
                      onAddMedication(detailDrug);
                      setSelectedDrug(null);
                      setDetailDrug(null);
                      toast.success('Opening medication form — fill in your dosage details');
                    }}
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add to My Medications
                  </Button>
                </div>
              )}

              <div className="py-6 space-y-5">
                {(detailDrug.purpose || detailDrug.description) && (
                  <section className="bg-primary/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Info className="w-6 h-6 text-primary" />
                      <h3 className="text-lg font-bold">What It's For</h3>
                    </div>
                    <p className="text-foreground leading-relaxed">
                      {(detailDrug.purpose || detailDrug.description || '').substring(0, 500)}
                    </p>
                  </section>
                )}

                {/* Active Ingredients */}
                {detailDrug.activeIngredients.length > 0 && (
                  <section className="bg-secondary/50 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpen className="w-6 h-6 text-secondary-foreground" />
                      <h3 className="text-lg font-bold">Active Ingredients</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailDrug.activeIngredients.map((ing, i) => (
                        <span key={i} className="bg-card px-4 py-2 rounded-full border border-border font-medium">
                          {ing.name} {ing.strength && `(${ing.strength})`}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Dose Forms & Route */}
                {(detailDrug.doseForms.length > 0 || detailDrug.route.length > 0) && (
                  <section className="bg-card rounded-2xl p-5 border border-border">
                    <h3 className="text-lg font-bold mb-3">Available Forms</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailDrug.doseForms.map((form, i) => (
                        <span key={i} className="bg-accent/10 text-accent-foreground px-3 py-1 rounded-full text-sm font-medium">
                          {form}
                        </span>
                      ))}
                      {detailDrug.route.map((r, i) => (
                        <span key={`r-${i}`} className="bg-info/10 text-info px-3 py-1 rounded-full text-sm font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Warnings */}
                {detailDrug.warnings.length > 0 && (
                  <section className="bg-destructive/10 rounded-2xl p-5 border-2 border-destructive/30">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                      <h3 className="text-lg font-bold text-destructive">Warnings</h3>
                    </div>
                    {detailDrug.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-foreground leading-relaxed mb-2">
                        {w.substring(0, 300)}
                      </p>
                    ))}
                  </section>
                )}

                {/* Side Effects */}
                {detailDrug.sideEffects.length > 0 && (
                  <section className="bg-warning/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-warning" />
                      <h3 className="text-lg font-bold">Common Side Effects</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailDrug.sideEffects.map((e, i) => (
                        <span key={i} className="bg-card px-3 py-1 rounded-full border border-border text-sm">
                          {e}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Drug Interactions */}
                {detailDrug.interactions && (
                  <section className="bg-destructive/5 rounded-2xl p-5 border border-destructive/20">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                      <h3 className="text-lg font-bold">Drug Interactions</h3>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {detailDrug.interactions.substring(0, 500)}
                    </p>
                  </section>
                )}

                {/* Manufacturer */}
                {detailDrug.manufacturer && (
                  <section className="bg-muted rounded-2xl p-4">
                    <p className="text-muted-foreground text-sm">
                      <span className="font-semibold">Manufacturer:</span> {detailDrug.manufacturer}
                    </p>
                  </section>
                )}

                {/* Citations & disclaimer (Apple Guideline 1.4.1) */}
                <MedicalDisclaimer
                  variant="compact"
                  extraSources={[
                    {
                      label: `MedlinePlus: search "${detailDrug.genericName || detailDrug.name}"`,
                      url: `https://medlineplus.gov/search/?query=${encodeURIComponent(detailDrug.genericName || detailDrug.name)}`,
                    },
                    {
                      label: `DailyMed (FDA label): "${detailDrug.genericName || detailDrug.name}"`,
                      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(detailDrug.genericName || detailDrug.name)}`,
                    },
                    {
                      label: `Drugs.com: "${detailDrug.genericName || detailDrug.name}"`,
                      url: `https://www.drugs.com/search.php?searchterm=${encodeURIComponent(detailDrug.genericName || detailDrug.name)}`,
                    },
                  ]}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
