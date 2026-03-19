'use client';

import { useState, useEffect, useCallback } from 'react';
import { Company, buildCompanyList, loadUserCompany, ALL_AGENTS } from '@/lib/company-registry';

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isMulti, setIsMulti] = useState(false);
  const [defaultId, setDefaultId] = useState('holdings');
  const [userCompany, setUserCompany] = useState<Company | null>(null);

  const refresh = useCallback(() => {
    const uc = loadUserCompany();
    setUserCompany(uc);
    const result = buildCompanyList(uc);
    setCompanies(result.companies);
    setIsMulti(result.isMulti);
    setDefaultId(result.defaultId);
  }, []);

  useEffect(() => {
    refresh();

    // Listen for company connection changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'y-company-connection') refresh();
    };
    window.addEventListener('storage', handleStorage);

    // Custom event for same-tab updates
    const handleCustom = () => refresh();
    window.addEventListener('y-company-updated', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('y-company-updated', handleCustom);
    };
  }, [refresh]);

  return {
    companies,
    isMulti,
    defaultId,
    userCompany,
    refresh,
    getCompany: (id: string) => companies.find(c => c.id === id),
    getCompanyByAgent: (agentId: string) => companies.find(c => c.agents.includes(agentId)),
  };
}
