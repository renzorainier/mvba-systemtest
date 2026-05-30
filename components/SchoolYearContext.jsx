"use client";

import { createContext, useContext } from 'react';

const SchoolYearContext = createContext({
  currentSchoolYear: '',
  draftSchoolYear: null,
  selectedSchoolYear: '',
  isDraft: false,
  isHistorical: false,
});

export function SchoolYearProvider({ children, value }) {
  return <SchoolYearContext.Provider value={value}>{children}</SchoolYearContext.Provider>;
}

export function useSchoolYearContext() {
  return useContext(SchoolYearContext);
}
