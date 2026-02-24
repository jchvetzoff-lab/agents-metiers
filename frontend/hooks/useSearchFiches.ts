"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api, FicheMetier } from "@/lib/api";

export function useSearchFiches(statut: string, limit = 100) {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const data = await api.getFiches({
          statut,
          search: searchTerm || undefined,
          limit,
        });
        setFiches(data.results);
        setTotal(data.total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [statut, limit]
  );

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFiches(value);
    }, 300);
  }

  return {
    fiches,
    setFiches,
    loading,
    search,
    handleSearch,
    total,
    refetch: () => fetchFiches(search),
  };
}

export function useSearchAllFiches(excludeStatut?: string, limit = 100) {
  const [fiches, setFiches] = useState<FicheMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiches = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const data = await api.getFiches({
          search: searchTerm || undefined,
          limit: 500,
        });
        const filtered = excludeStatut
          ? data.results.filter((f) => f.statut !== excludeStatut)
          : data.results;
        setFiches(filtered.slice(0, limit));
        setTotal(excludeStatut ? filtered.length : data.total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [excludeStatut, limit]
  );

  useEffect(() => {
    fetchFiches("");
  }, [fetchFiches]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFiches(value);
    }, 300);
  }

  return { fiches, loading, search, handleSearch, total };
}
